import { AIProvider, Message } from '@/lib/ai'

export interface ExperienceEntry {
  company: string
  job_title: string | null
  raw_text: string
}

export interface SkillEntry {
  skill: string
  job_title: string | null
  category: string | null
}

export interface SummaryEntry {
  job_title: string | null
  text: string
}

export interface ParsedResume {
  experience: ExperienceEntry[]
  skills: SkillEntry[]
  education_credentials: {
    type: 'degree' | 'training' | 'certification'
    title: string
    institution: string | null
    year: string | null
  }[]
  summaries: SummaryEntry[]
}

const SYSTEM_PROMPT = `You are an expert resume parser. Your task is to extract structured information from resume text.

Extract structured data from the resume into the following categories:

1. **experience** — entries from the experience/work section. Each entry is an object with:
   - "company": string (the company name)
   - "job_title": string | null (the role or position held at the company during this experience)
   - "raw_text": string (the full sentence(s) describing the responsibility or accomplishment)
   One entry per bullet/responsibility, NOT per job. The job_title should be the same for all bullets under the same position.

2. **skills** — individual skills, technologies, or soft skills. Each entry is an object with:
   - "skill": string
   - "job_title": string | null (the role or position where this skill was primarily used, or null if it's a general skill)
   - "category": string | null (a grouping for the skill, e.g., "Languages", "Tools", "Soft Skills")

3. **education_credentials** — degrees, trainings, and certifications. Each entry:
   - "type": "degree" | "training" | "certification"
   - "title": string (the degree name, certification name, or training name)
   - "institution": string | null (the school or organization)
   - "year": string | null (graduation year or certification year)

4. **summaries** — the professional summary, intro, or about me section. Each entry:
   - "job_title": string | null (the job title associated with this summary if applicable)
   - "text": string (the content of the summary)

Respond with ONLY a valid JSON object matching this schema — no markdown, no explanation, no code fences.

Schema:
{
  "experience": [{ "company": string, "job_title": string|null, "raw_text": string }],
  "skills": [{ "skill": string, "job_title": string|null, "category": string|null }],
  "education_credentials": [{ "type": "degree"|"training"|"certification", "title": string, "institution": string|null, "year": string|null }],
  "summaries": [{ "job_title": string|null, "text": string }]
}`

export async function parseResume(
  rawText: string,
  ai: AIProvider
): Promise<ParsedResume> {
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: rawText },
  ]

  const response = await ai.chat(messages)
  const parsed = parseResumeResponse(response)
  
  if (!parsed) {
    throw new Error('Failed to parse resume response')
  }
  
  return parsed
}

export function parseResumeResponse(raw: string): ParsedResume | null {
  try {
    const cleaned = raw.trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      return null
    }
    
    const parsed = JSON.parse(jsonMatch[0])
    
    return {
      experience: Array.isArray(parsed.experience)
        ? parsed.experience.map((e: any) => ({
            company: e.company || '',
            job_title: e.job_title || null,
            raw_text: e.raw_text || '',
          }))
        : [],
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.map((s: any) => ({
            skill: typeof s === 'string' ? s : (s.skill || ''),
            job_title: typeof s === 'string' ? null : (s.job_title || null),
            category: typeof s === 'string' ? null : (s.category || null),
          }))
        : [],
      education_credentials: Array.isArray(parsed.education_credentials) 
        ? parsed.education_credentials.map((c: any) => ({
            type: c.type || 'degree',
            title: c.title || '',
            institution: c.institution || c.school || c.organization || null,
            year: c.year || c.date || c.graduation_year || null,
          }))
        : [],
      summaries: Array.isArray(parsed.summaries)
        ? parsed.summaries.map((s: any) => ({
            job_title: s.job_title || s.role || s.position || null,
            text: s.text || s.summary || s.content || '',
          }))
        : [],
    }
  } catch (error) {
    console.error('Failed to parse resume response:', error)
    return null
  }
}
