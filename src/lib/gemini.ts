import { z } from 'zod'
import { db as defaultDb, type JobFitDb } from '../db/db'

// The only module that talks to the Gemini API. Everything else calls generateStructured(),
// so tests can mock a single dependency (@google/genai) and every call gets the same
// validation, retry, rate-limit handling and caching.

export interface GeminiConfig {
  apiKey: string
  model: string
}

export interface StructuredRequest<T> {
  /** Zod schema of the expected answer. It is also sent to Gemini as the response JSON schema. */
  schema: z.ZodType<T>
  systemInstruction: string
  prompt: string
  /** Reuse a stored answer for an identical request. Default true. */
  cache?: boolean
  /** Progress messages for the user, e.g. while waiting out a rate limit. */
  onStatus?: (message: string) => void
}

export type GeminiErrorKind =
  | 'missing-key'
  | 'invalid-key'
  | 'model-not-found'
  | 'rate-limit'
  | 'invalid-response'
  | 'network'
  | 'unknown'

/** Error with a user-facing message in Slovak. */
export class GeminiError extends Error {
  readonly kind: GeminiErrorKind

  constructor(kind: GeminiErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GeminiError'
    this.kind = kind
  }
}

/** Waits before each retry after HTTP 429 (exponential backoff, about 30 s in total). */
export const RATE_LIMIT_DELAYS_MS = [2_000, 4_000, 8_000, 16_000]

export async function generateStructured<T>(
  config: GeminiConfig,
  request: StructuredRequest<T>,
  database: JobFitDb = defaultDb,
): Promise<T> {
  if (!config.apiKey.trim()) {
    throw new GeminiError('missing-key', 'Chýba API kľúč. Zadaj ho v Nastaveniach.')
  }

  const useCache = request.cache ?? true
  const cacheKey = await sha256(
    JSON.stringify([config.model, request.systemInstruction, request.prompt]),
  )
  if (useCache) {
    const cached = await database.aiCache.get(cacheKey)
    // Re-validate: the schema may have changed since the answer was stored.
    const parsed = cached && request.schema.safeParse(cached.value)
    if (parsed?.success) return parsed.data
  }

  // The SDK is large (~0.5 MB minified), so it is loaded on the first AI call, not with the page.
  const { GoogleGenAI, ApiError } = await import('@google/genai')
  const ai = new GoogleGenAI({
    apiKey: config.apiKey,
    // Retries are handled below so the user can see what is happening.
    httpOptions: { retryOptions: { attempts: 1 } },
  })
  const responseJsonSchema = toGeminiJsonSchema(request.schema)

  // An invalid answer (bad JSON or failed validation) gets exactly one more try.
  let lastIssue = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await callWithBackoff(
      () =>
        ai.models
          .generateContent({
            model: config.model,
            contents: request.prompt,
            config: {
              systemInstruction: request.systemInstruction,
              responseMimeType: 'application/json',
              responseJsonSchema,
            },
          })
          .then((response) => response.text),
      (error) => toGeminiError(error, config.model, ApiError),
      request.onStatus,
    )

    const result = parseAnswer(text, request.schema)
    if (result.success) {
      if (useCache) {
        await database.aiCache.put({
          hash: cacheKey,
          value: result.data,
          createdAt: new Date().toISOString(),
        })
      }
      return result.data
    }
    lastIssue = result.issue
    if (attempt === 1) request.onStatus?.('AI vrátila neplatnú odpoveď, skúšam znova…')
  }

  throw new GeminiError(
    'invalid-response',
    'AI vrátila odpoveď v nesprávnom formáte ani na druhý pokus. Skús to znova o chvíľu.',
    { cause: lastIssue },
  )
}

async function callWithBackoff(
  call: () => Promise<string | undefined>,
  mapError: (error: unknown) => GeminiError,
  onStatus?: (message: string) => void,
): Promise<string | undefined> {
  for (let retry = 0; ; retry++) {
    try {
      return await call()
    } catch (error) {
      const mapped = mapError(error)
      if (mapped.kind !== 'rate-limit' || retry >= RATE_LIMIT_DELAYS_MS.length) throw mapped
      const delay = RATE_LIMIT_DELAYS_MS[retry]
      onStatus?.(
        `Prekročený limit bezplatnej verzie. Skúšam znova o ${delay / 1000} s ` +
          `(pokus ${retry + 1} z ${RATE_LIMIT_DELAYS_MS.length}).`,
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

function parseAnswer<T>(
  text: string | undefined,
  schema: z.ZodType<T>,
): { success: true; data: T } | { success: false; issue: string } {
  if (!text) return { success: false, issue: 'empty response' }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { success: false, issue: 'response is not JSON' }
  }
  const result = schema.safeParse(json)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, issue: z.prettifyError(result.error) }
}

function toGeminiError(
  error: unknown,
  model: string,
  ApiError: typeof import('@google/genai').ApiError,
): GeminiError {
  if (error instanceof GeminiError) return error
  if (error instanceof ApiError) {
    const { status, message } = error
    if (status === 429) {
      return new GeminiError(
        'rate-limit',
        'Prekročený limit bezplatnej verzie Gemini API. Počkaj minútu a skús to znova.',
        { cause: error },
      )
    }
    if (status === 404) {
      return new GeminiError(
        'model-not-found',
        `Model „${model}“ neexistuje alebo k nemu tvoj kľúč nemá prístup. Skontroluj názov modelu v Nastaveniach.`,
        { cause: error },
      )
    }
    if (status === 401 || status === 403 || (status === 400 && /api key/i.test(message))) {
      return new GeminiError('invalid-key', 'API kľúč je neplatný. Skontroluj ho v Nastaveniach.', {
        cause: error,
      })
    }
    return new GeminiError('unknown', `Gemini API vrátilo chybu ${status}: ${message}`, {
      cause: error,
    })
  }
  if (error instanceof TypeError) {
    // fetch() rejects with TypeError when the network is down or the request is blocked.
    return new GeminiError('network', 'Nepodarilo sa spojiť s Gemini API. Skontroluj pripojenie.', {
      cause: error,
    })
  }
  return new GeminiError('unknown', 'Neočakávaná chyba pri volaní Gemini API.', { cause: error })
}

/** Zod schema → JSON Schema in the subset Gemini accepts. */
export function toGeminiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Gemini does not accept the "$schema" keyword, the rest of Zod's output is supported.
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema)
  return jsonSchema
}

export async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
