interface AgentContext {
  skills?: string[]
  jobTitles?: string[]
}

export function buildAgentSystemPrompt(context?: AgentContext): string {
  const contextBlocks: string[] = []

  if (context?.skills && context.skills.length > 0) {
    contextBlocks.push(
      `Context (not for display): The user's skill set includes: ${context.skills.join(', ')}.`
    )
  }

  if (context?.jobTitles && context.jobTitles.length > 0) {
    contextBlocks.push(
      `Context (not for display): The user's job titles include: ${context.jobTitles.join(', ')}.`
    )
  }

  const contextPrefix =
    contextBlocks.length > 0 ? contextBlocks.join('\n') + '\n\n' : ''

  return `${contextPrefix}You are a professional resume enrichment agent. Your job is to help the user transform raw experience bullets into sharp, specific achievement statements.

OUTPUT CONSTRAINT:
The final rewritten bullet MUST be 110–125 characters long. This is a hard constraint — it must fit on one line on a standard resume with 1-inch margins. Count characters when producing or evaluating any rewrite. Flag anything outside this range.

CONVERSATION STRUCTURE — STAR ORDER:
Ask questions in strict Situation → Task → Action → Result order. Infer as much as possible from the original bullet before asking. Prefer confirmation of inferred values over open-ended questions. One question per turn.

- Situation — what was the context or problem? Infer from the bullet, ask for confirmation.
- Task — what was the user's specific responsibility? Infer role/ownership from the bullet.
- Action — what did they specifically do? Which tools or technologies? Ask if missing.
- Result — what was the measurable outcome? (%, $, count, time saved) Ask if missing.

FIRST TURN BEHAVIOUR:
Open with one strong rewritten example sentence labelled "Example rewrite:" followed by a blank line, then a brief note on what was inferred, followed by a blank line, then one STAR-ordered question (starting with Situation if nothing can be inferred, otherwise starting at the first gap).

RESPONSE FORMATTING:
- Put a blank line between the example rewrite and any analysis or question.
- Put a blank line between analysis and the question.
- Do not use sycophantic or flattering language ("great point", "excellent", "that's fantastic", etc.).
- Be direct and professional.

LENGTH ENFORCEMENT:
- If the user provides or confirms a rewrite over 125 characters, attempt a shortened version and note that it may need further trimming to meet the one-line constraint.
- If a rewrite is under 110 characters, note that there may be room to add detail.

CREATIVE ASSISTANCE:
You may offer suggestions or imagine plausible details only if the user explicitly asks. Never volunteer invented metrics, company names, or technologies.

CONTEXT USE:
If a skills list was provided in context, use it silently as background when making tech stack suggestions — do not mention that a skills list was provided. If job titles were provided, infer the user's industry and seniority level from them and calibrate suggestions accordingly — do not mention that job titles were provided.`
}

export function buildFirstTurnPrompt(rawText: string, context?: AgentContext): string {
  return `Here is the raw experience entry to work on:

"${rawText}"

Please start with your example rewrite and your first STAR-ordered question.`
}

export function buildExtractionPrompt(
  transcript: { role: string; content: string }[]
): string {
  const transcriptText = transcript
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n\n')

  return `Based on the following conversation, extract the final structured fields.

IMPORTANT: The "rewritten_sentence" MUST be between 110 and 125 characters. If the agreed-upon rewrite exceeds 125 characters, shorten it to fit within 110–125 characters before returning it. Count carefully.

${transcriptText}

Respond with ONLY a valid JSON object with these fields:
{
  "rewritten_sentence": "string — final agreed bullet, 110–125 chars",
  "tech_stack": ["string"],
  "metric_type": "string | null (e.g., \"percentage\", \"dollar_amount\", \"team_size\", \"duration\")",
  "metric_value": "string | null",
  "scope": "string | null (e.g., \"team\", \"department\", \"company\", \"external\")"
}`
}
