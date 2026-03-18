import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import { Message } from '@/lib/ai'
import {
  buildAgentSystemPrompt,
  buildFirstTurnPrompt,
  buildExtractionPrompt,
} from '@/lib/gemini-parse/enrich-prompt'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const ai = getAIProvider()

    const body = await request.json()
    const { stagingId, conversationHistory, userMessage, action, rawText } = body

    // Handle skip action
    if (action === 'skip') {
      await supabase.from('rmc_claims').insert({
        staging_id: stagingId,
        enrichment_status: 'skipped',
        raw_text: rawText || '',
      })

      return NextResponse.json({ status: 'skipped' })
    }

    // Handle confirm action
    if (action === 'confirm') {
      const extractionPrompt = buildExtractionPrompt(conversationHistory || [])
      const messages: Message[] = [
        { role: 'system', content: buildAgentSystemPrompt() },
        { role: 'user', content: extractionPrompt },
      ]

      const extractionResponse = await ai.extract(messages)

      let extracted = null
      try {
        const jsonMatch = extractionResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.error('Failed to parse extraction response:', e)
      }

      if (!extracted) {
        return NextResponse.json(
          { error: 'Failed to extract structured data' },
          { status: 422 }
        )
      }

      // Get staging row for company_id and job_title if rawText wasn't passed or we need company_id
      let finalRawText = rawText
      let companyId = null
      let jobTitle = null

      if (!finalRawText) {
        const { data: stagingRow } = await supabase
          .from('rmc_experience_staging')
          .select('company_id, raw_text, job_title')
          .eq('id', stagingId)
          .single()
        
        finalRawText = stagingRow?.raw_text || ''
        companyId = stagingRow?.company_id || null
        jobTitle = stagingRow?.job_title || null
      } else {
        // Even if we have rawText, we still need company_id and jobTitle for the claim record
        const { data: stagingRow } = await supabase
          .from('rmc_experience_staging')
          .select('company_id, job_title')
          .eq('id', stagingId)
          .single()
        
        companyId = stagingRow?.company_id || null
        jobTitle = stagingRow?.job_title || null
      }

      const { data: claim } = await supabase
        .from('rmc_claims')
        .insert({
          staging_id: stagingId,
          company_id: companyId,
          raw_text: finalRawText,
          job_title: jobTitle,
          rewritten_sentence: extracted.rewritten_sentence || null,
          tech_stack: extracted.tech_stack || [],
          metric_type: extracted.metric_type || null,
          metric_value: extracted.metric_value || null,
          scope: extracted.scope || null,
          enrichment_status: 'enriched',
          conversation_transcript: conversationHistory || [],
          promoted_at: new Date().toISOString(),
        })
        .select()
        .single()

      return NextResponse.json({ status: 'complete', claimId: claim?.id })
    }

    // First turn - no history
    if (!conversationHistory || conversationHistory.length === 0) {
      let finalRawText = rawText

      if (!finalRawText) {
        const { data: stagingRow } = await supabase
          .from('rmc_experience_staging')
          .select('raw_text')
          .eq('id', stagingId)
          .single()

        if (!stagingRow) {
          return NextResponse.json(
            { error: 'Staging row not found' },
            { status: 404 }
          )
        }
        finalRawText = stagingRow.raw_text
      }

      const systemPrompt = buildAgentSystemPrompt()
      const firstPrompt = buildFirstTurnPrompt(finalRawText)

      const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: firstPrompt },
      ]

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          let fullResponse = ''
          try {
            for await (const chunk of ai.streamChat(messages)) {
              fullResponse += chunk
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: 'text', content: chunk }) + '\n'
                )
              )
            }

            const newHistory: Message[] = [
              ...messages,
              { role: 'assistant', content: fullResponse },
            ]

            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: 'history', content: newHistory }) + '\n'
              )
            )
            controller.close()
          } catch (e) {
            console.error('Streaming error (first turn):', e)
            controller.error(e)
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // Subsequent turns - has history + userMessage
    const updatedHistory: Message[] = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ]

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        try {
          for await (const chunk of ai.streamChat(updatedHistory)) {
            fullResponse += chunk
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: 'text', content: chunk }) + '\n'
              )
            )
          }

          const finalHistory: Message[] = [
            ...updatedHistory,
            { role: 'assistant', content: fullResponse },
          ]

          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: 'history', content: finalHistory }) + '\n'
            )
          )
          controller.close()
        } catch (e) {
          console.error('Streaming error (subsequent turn):', e)
          controller.error(e)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Enrich error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
