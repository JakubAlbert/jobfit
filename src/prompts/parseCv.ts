// Prompt for turning anonymized CV text into structured data (response schema: CvDataSchema).

export const parseCvSystemInstruction = `You extract structured data from a CV.
Rules:
- Use only information explicitly stated in the CV. Never invent, infer or embellish skills, experience, dates or titles.
- If something is missing, leave the field empty or the list empty.
- skills: concrete skills, technologies and tools, each once, with their common canonical name (e.g. "JavaScript", "PostgreSQL", "React").
- experience.period and education.period: as written in the CV.
- experience.description: a short summary of the responsibilities and results stated in the CV.
- Keep the CV's original language for all free text.
- Placeholders like [MENO] or [EMAIL] replace removed personal data; ignore them.`

export function parseCvPrompt(anonymizedCv: string): string {
  return `CV:\n"""\n${anonymizedCv}\n"""`
}
