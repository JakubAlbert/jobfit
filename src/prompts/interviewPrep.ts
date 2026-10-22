// Prompt for interview preparation (response schema: InterviewPrepSchema).
// Input: structured CV, posting requirements and the code-computed match, like the insights prompt.

export const interviewPrepSystemInstruction = `You prepare a candidate for a job interview for a specific posting.
Strict rule: answer points may only use experience, skills and results stated in the CV. Never invent anything.
If the CV has nothing relevant for a question (a missing skill), the answer points say honestly how to address the gap.
Return:
- questions: 6–8 questions this employer is likely to ask: about the must-have skills, the candidate's experience, the gaps in the match, and one or two behavioural questions. For each: "why" (one sentence, why they ask it) and "answerPoints" (2–4 short points from the CV to build the answer on).
- questionsToAsk: 3–4 good questions the candidate can ask the employer about this role.
Write everything in Slovak.`

export function interviewPrepPrompt(input: unknown): string {
  return JSON.stringify(input)
}
