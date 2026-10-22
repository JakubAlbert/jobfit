// Prompt for extracting structured requirements from a job posting (response schema: JobRequirementsSchema).

export const parsePostingSystemInstruction = `You extract requirements from a job posting.
Rules:
- Use only what the posting explicitly states. Never invent or infer requirements.
- mustHaveSkills: skills, technologies and tools the posting requires. niceToHaveSkills: those marked as an advantage, plus, nice to have, or similar.
- Each skill once, with its common canonical name (e.g. "JavaScript", "PostgreSQL"). Not soft skills like "communication".
- seniority: from the job title or the text (junior, mid for medior/mid-level, senior, lead); "unknown" if neither states it.
- workMode: "unknown" unless the posting states on-site, hybrid or remote work.
- location and salary: as written, or null if not stated.
- languages: only languages the posting requires, with the level as written (empty string if not stated).`

export function parsePostingPrompt(title: string, postingText: string): string {
  const titleLine = title.trim() ? `Job title: ${title.trim()}\n` : ''
  return `${titleLine}Job posting:\n"""\n${postingText}\n"""`
}
