import Papa from 'papaparse'
import { ParsedResume } from '@/lib/gemini-parse/parser'

export async function extractCsvText(buffer: Buffer): Promise<string> {
  const text = buffer.toString('utf-8')
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
  
  const lines: string[] = []
  
  for (const row of parsed.data as Record<string, string>[]) {
    const rowLines: string[] = []
    for (const [key, value] of Object.entries(row)) {
      if (value && value.trim()) {
        rowLines.push(`${key}: ${value}`)
      }
    }
    if (rowLines.length > 0) {
      lines.push(rowLines.join('\n'))
    }
  }
  
  return lines.join('\n\n')
}

export function parseStructuredCsv(buffer: Buffer): ParsedResume {
  // Use 'utf8' explicitly and strip potential BOM or invisible characters
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '').trim()
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() })
  const data = parsed.data as Record<string, string>[]

  const result: ParsedResume = {
    experience: [],
    skills: [],
    education_credentials: [],
    summaries: []
  }

  for (const row of data) {
    const findValue = (regex: RegExp) => {
      // Improved key matching that handles spaces and case-insensitivity more robustly
      const key = Object.keys(row).find(k => {
        const cleanKey = k.toLowerCase().replace(/[\s\-_]/g, '')
        const cleanPattern = regex.source.toLowerCase().replace(/[\s\-_|]/g, '')
        // We still use the original regex for more complex patterns but also check for a "clean" match
        return regex.test(k.toLowerCase()) || cleanKey.includes(cleanPattern)
      })
      return key ? row[key]?.trim() : null
    }

    const bullet = findValue(/bullet|responsibility|description|task|accomplishment/i)
    const category = findValue(/category|group/i)
    const company = findValue(/company|organization|employer/i)
    const jobTitle = findValue(/job title|role|position/i)
    const summary = findValue(/summary|intro|about|profile|professional/i)
    const skill = findValue(/skill|tech|tool|competency/i)

    if (bullet) {
      let finalCompany = company || 'Unknown'
      let finalJobTitle = jobTitle || null

      if (category && category.includes(' - ')) {
        const parts = category.split(' - ')
        finalJobTitle = parts[0].trim()
        finalCompany = parts[1].trim()
      } else if (category && !finalJobTitle) {
        finalJobTitle = category.trim()
      }

      result.experience.push({
        company: finalCompany,
        job_title: finalJobTitle,
        raw_text: bullet
      })
    } 
    else if (summary) {
      let finalJobTitle = jobTitle || null
      if (category && category.includes(' - ')) {
        finalJobTitle = category.split(' - ')[0].trim()
      } else if (category && !finalJobTitle) {
        finalJobTitle = category.trim()
      }

      result.summaries.push({
        job_title: finalJobTitle,
        text: summary
      })
    }
    else if (skill) {
      result.skills.push({
        skill: skill,
        job_title: null,
        category: category || null
      })
    }
  }

  return result
}
