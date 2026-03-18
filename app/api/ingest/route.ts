import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { extractText, parseStructuredCsv } from '@/lib/parsers'
import { parseResume, ParsedResume } from '@/lib/gemini-parse/parser'
import { getAIProvider } from '@/lib/ai'
import { contentHash } from '@/lib/dedup/hash'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length')
    
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 413 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const filename = file.name
    const fileType = filename.split('.').pop()?.toLowerCase() as 'pdf' | 'docx' | 'csv' | undefined
    
    if (!fileType || !['pdf', 'docx', 'csv'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF, DOCX, and CSV are supported.' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const ai = getAIProvider()

    // Insert source resume row
    const { data: resumeRecord, error: insertError } = await supabase
      .from('rmc_source_resumes')
      .insert({
        filename,
        file_type: fileType,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError || !resumeRecord) {
      return NextResponse.json(
        { error: 'Failed to create resume record' },
        { status: 500 }
      )
    }

    // Extract raw text
    const buffer = Buffer.from(await file.arrayBuffer())
    const rawText = await extractText(buffer, fileType)

    // Update with raw text
    await supabase
      .from('rmc_source_resumes')
      .update({ raw_text: rawText })
      .eq('id', resumeRecord.id)

    // Parse
    let parsed: ParsedResume
    if (fileType === 'csv') {
      parsed = parseStructuredCsv(buffer)
    } else {
      try {
        parsed = await parseResume(rawText, ai)
      } catch (parseError) {
        console.error('Parse error:', parseError)
        await supabase
          .from('rmc_source_resumes')
          .update({ status: 'failed' })
          .eq('id', resumeRecord.id)
        
        return NextResponse.json(
          { error: 'Failed to parse resume with AI' },
          { status: 422 }
        )
      }
    }

    // Stage experience entries
    let experienceCount = 0
    let duplicatesSkipped = 0
    
    for (const exp of parsed.experience) {
      const hash = contentHash(exp.raw_text)
      
      // Upsert company
      let companyId: string | null = null
      
      const { data: existingCompany } = await supabase
        .from('rmc_companies')
        .select('id')
        .ilike('name', exp.company.trim())
        .single()
      
      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        const { data: newCompany } = await supabase
          .from('rmc_companies')
          .insert({ name: exp.company.trim() })
          .select('id')
          .single()
        
        if (newCompany) {
          companyId = newCompany.id
        }
      }

      // Check for duplicate
      const { data: existingExp } = await supabase
        .from('rmc_experience_staging')
        .select('id')
        .eq('content_hash', hash)
        .single()

      if (existingExp) {
        duplicatesSkipped++
        // Mark as duplicate
        await supabase
          .from('rmc_experience_staging')
          .update({ is_duplicate: true, canonical_id: existingExp.id })
          .eq('content_hash', hash)
        continue
      }

      // Insert experience staging
      await supabase
        .from('rmc_experience_staging')
        .insert({
          source_resume_id: resumeRecord.id,
          company_id: companyId,
          company_name_raw: exp.company,
          job_title: exp.job_title || null,
          raw_text: exp.raw_text,
          content_hash: hash,
        })

      experienceCount++
    }

    // Stage skills
    let skillsCount = 0
    
    for (const skillEntry of parsed.skills) {
      const skillTrimmed = skillEntry.skill.trim()
      if (!skillTrimmed) continue

      // Upsert skill to global list
      const { data: skillRecord } = await supabase
        .from('rmc_skills')
        .upsert(
          { 
            skill: skillTrimmed,
            category: skillEntry.category || null
          },
          { onConflict: 'skill' }
        )
        .select('id')
        .single()

      if (skillRecord) {
        // Link to this specific resume and job title
        await supabase
          .from('rmc_resume_skills')
          .insert({
            resume_id: resumeRecord.id,
            skill_id: skillRecord.id,
            job_title: skillEntry.job_title,
          })
      }

      // Append source resume ID
      await supabase.rpc('rmc_append_skill_source', {
        p_skill: skillTrimmed,
        p_resume_id: resumeRecord.id,
      })

      skillsCount++
    }

    // Stage education/credentials
    let degreesCount = 0
    let trainingsCount = 0
    let certsCount = 0

    for (const cred of parsed.education_credentials) {
      const credHash = contentHash(
        cred.title + (cred.institution || '') + (cred.year || '')
      )

      const { data: existingCred } = await supabase
        .from('rmc_education_credentials')
        .select('id')
        .eq('content_hash', credHash)
        .single()

      if (existingCred) {
        continue // Skip duplicates
      }

      const { error: credError } = await supabase
        .from('rmc_education_credentials')
        .insert({
          source_resume_id: resumeRecord.id,
          type: cred.type,
          title: cred.title,
          institution: cred.institution,
          year: cred.year,
          content_hash: credHash,
        })

      if (credError) {
        console.error('Credential insert error:', credError)
        continue
      }

      if (cred.type === 'degree') degreesCount++
      else if (cred.type === 'training') trainingsCount++
      else if (cred.type === 'certification') certsCount++
    }

    // Stage summaries
    let summariesCount = 0
    for (const summary of parsed.summaries) {
      if (!summary.text) continue

      let companyId: string | null = null
      
      if (summary.job_title) {
        const expMatch = parsed.experience.find(e => e.job_title === summary.job_title)
        if (expMatch) {
          const { data: c } = await supabase
            .from('rmc_companies')
            .select('id')
            .ilike('name', expMatch.company.trim())
            .single()
          if (c) companyId = c.id
        }
      }

      const { error: summaryError } = await supabase.from('rmc_summaries').insert({
        source_resume_id: resumeRecord.id,
        company_id: companyId,
        job_title: summary.job_title,
        summary_text: summary.text
      })

      if (summaryError) {
        console.error('Summary insert error:', summaryError)
      } else {
        summariesCount++
      }
    }

    // Update status to parsed
    await supabase
      .from('rmc_source_resumes')
      .update({ status: 'parsed' })
      .eq('id', resumeRecord.id)

    const stats = {
      experience: experienceCount,
      skills: skillsCount,
      summaries: summariesCount,
      degrees: degreesCount,
      trainings: trainingsCount,
      certifications: certsCount,
      duplicatesSkipped,
    }

    console.log('Ingest stats:', stats)

    return NextResponse.json({
      success: true,
      resumeId: resumeRecord.id,
      stats,
    })
  } catch (error) {
    console.error('Ingest error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
