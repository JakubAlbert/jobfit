import { z } from 'zod'

// Smallest possible request: checks that the key and model work without spending much quota.

export const connectionTestSchema = z.object({ ok: z.boolean() })

export const connectionTestPrompt = {
  systemInstruction: 'You are a health check. Answer only with the requested JSON.',
  prompt: 'Return {"ok": true}.',
}
