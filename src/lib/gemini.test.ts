import 'fake-indexeddb/auto'
import { ApiError } from '@google/genai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { JobFitDb } from '../db/db'
import {
  generateStructured,
  GeminiError,
  RATE_LIMIT_DELAYS_MS,
  sha256,
  toGeminiJsonSchema,
  type StructuredRequest,
} from './gemini'

// Replace only the client class; keep the real ApiError so error mapping is tested for real.
const generateContent = vi.fn()
vi.mock('@google/genai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@google/genai')>()),
  GoogleGenAI: class {
    models = { generateContent }
  },
}))

const AnswerSchema = z.object({ skills: z.array(z.string()) })
const config = { apiKey: 'test-key', model: 'gemini-test' }

function request(overrides: Partial<StructuredRequest<z.infer<typeof AnswerSchema>>> = {}) {
  return { schema: AnswerSchema, systemInstruction: 'system', prompt: 'prompt', ...overrides }
}

const reply = (value: unknown) => ({ text: typeof value === 'string' ? value : JSON.stringify(value) })

let db: JobFitDb

beforeEach(() => {
  generateContent.mockReset()
  db = new JobFitDb(`test-${crypto.randomUUID()}`)
})

afterEach(async () => {
  vi.useRealTimers()
  await db.delete()
})

describe('generateStructured', () => {
  it('returns the validated answer and requests JSON output with a schema', async () => {
    generateContent.mockResolvedValueOnce(reply({ skills: ['React'] }))

    await expect(generateStructured(config, request(), db)).resolves.toEqual({ skills: ['React'] })

    const call = generateContent.mock.calls[0][0]
    expect(call.model).toBe('gemini-test')
    expect(call.config.responseMimeType).toBe('application/json')
    expect(call.config.responseJsonSchema).toEqual(toGeminiJsonSchema(AnswerSchema))
  })

  it('fails fast without an API key', async () => {
    const error = await generateStructured({ ...config, apiKey: ' ' }, request(), db).catch((e) => e)

    expect(error).toBeInstanceOf(GeminiError)
    expect(error.kind).toBe('missing-key')
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('retries once after an invalid answer', async () => {
    const onStatus = vi.fn()
    generateContent
      .mockResolvedValueOnce(reply({ skills: 'not an array' }))
      .mockResolvedValueOnce(reply({ skills: ['TypeScript'] }))

    await expect(generateStructured(config, request({ onStatus }), db)).resolves.toEqual({
      skills: ['TypeScript'],
    })
    expect(generateContent).toHaveBeenCalledTimes(2)
    expect(onStatus).toHaveBeenCalledWith(expect.stringContaining('neplatnú odpoveď'))
  })

  it('gives up after two invalid answers', async () => {
    generateContent.mockResolvedValue(reply('this is not json'))

    const error = await generateStructured(config, request(), db).catch((e) => e)

    expect(error.kind).toBe('invalid-response')
    expect(generateContent).toHaveBeenCalledTimes(2)
  })
})

describe('error handling', () => {
  it.each([
    [new ApiError({ status: 404, message: 'models/gemini-test is not found' }), 'model-not-found'],
    [new ApiError({ status: 400, message: 'API key not valid. Please pass a valid API key.' }), 'invalid-key'],
    [new ApiError({ status: 403, message: 'Permission denied' }), 'invalid-key'],
    [new ApiError({ status: 500, message: 'Internal error' }), 'unknown'],
    [new TypeError('Failed to fetch'), 'network'],
  ])('maps %s to "%s"', async (thrown, kind) => {
    generateContent.mockRejectedValueOnce(thrown)

    const error = await generateStructured(config, request(), db).catch((e) => e)

    expect(error).toBeInstanceOf(GeminiError)
    expect(error.kind).toBe(kind)
    expect(generateContent).toHaveBeenCalledTimes(1)
  })

  it('names the model when it does not exist', async () => {
    generateContent.mockRejectedValueOnce(new ApiError({ status: 404, message: 'not found' }))

    const error = await generateStructured(config, request(), db).catch((e) => e)

    expect(error.message).toContain('gemini-test')
  })
})

describe('rate limiting (HTTP 429)', () => {
  const rateLimited = () => new ApiError({ status: 429, message: 'Resource exhausted' })

  beforeEach(() => {
    // Only setTimeout is faked, so the backoff waits are instant but promises behave normally.
    vi.useFakeTimers({ toFake: ['setTimeout'] })
  })

  it('backs off exponentially, tells the user, then succeeds', async () => {
    const onStatus = vi.fn()
    generateContent
      .mockRejectedValueOnce(rateLimited())
      .mockRejectedValueOnce(rateLimited())
      .mockResolvedValueOnce(reply({ skills: [] }))

    const result = generateStructured(config, request({ onStatus, cache: false }), db)
    await vi.advanceTimersByTimeAsync(RATE_LIMIT_DELAYS_MS[0])
    expect(generateContent).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(RATE_LIMIT_DELAYS_MS[1])

    await expect(result).resolves.toEqual({ skills: [] })
    expect(onStatus).toHaveBeenNthCalledWith(1, expect.stringContaining('o 2 s (pokus 1 z 4)'))
    expect(onStatus).toHaveBeenNthCalledWith(2, expect.stringContaining('o 4 s (pokus 2 z 4)'))
  })

  it('gives up with a rate-limit error after all retries', async () => {
    generateContent.mockRejectedValue(rateLimited())

    const result = generateStructured(config, request({ cache: false }), db).catch((e) => e)
    await vi.runAllTimersAsync()

    expect((await result).kind).toBe('rate-limit')
    expect(generateContent).toHaveBeenCalledTimes(RATE_LIMIT_DELAYS_MS.length + 1)
  })
})

describe('cache', () => {
  it('reuses the stored answer for an identical request', async () => {
    generateContent.mockResolvedValue(reply({ skills: ['React'] }))

    await generateStructured(config, request(), db)
    const second = await generateStructured(config, request(), db)

    expect(second).toEqual({ skills: ['React'] })
    expect(generateContent).toHaveBeenCalledTimes(1)
  })

  it('calls the API again for a different prompt or model', async () => {
    generateContent.mockResolvedValue(reply({ skills: [] }))

    await generateStructured(config, request(), db)
    await generateStructured(config, request({ prompt: 'other prompt' }), db)
    await generateStructured({ ...config, model: 'other-model' }, request(), db)

    expect(generateContent).toHaveBeenCalledTimes(3)
  })

  it('skips the cache when disabled', async () => {
    generateContent.mockResolvedValue(reply({ skills: [] }))

    await generateStructured(config, request({ cache: false }), db)
    await generateStructured(config, request({ cache: false }), db)

    expect(generateContent).toHaveBeenCalledTimes(2)
    expect(await db.aiCache.count()).toBe(0)
  })

  it('ignores a cached answer that no longer matches the schema', async () => {
    const key = await sha256(JSON.stringify([config.model, 'system', 'prompt']))
    await db.aiCache.put({ hash: key, value: { old: 'shape' }, createdAt: new Date().toISOString() })
    generateContent.mockResolvedValue(reply({ skills: ['Vue'] }))

    await expect(generateStructured(config, request(), db)).resolves.toEqual({ skills: ['Vue'] })
    expect(generateContent).toHaveBeenCalledTimes(1)
  })
})

describe('helpers', () => {
  it('computes SHA-256 as hex', async () => {
    expect(await sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('strips the $schema keyword Gemini does not accept', () => {
    const jsonSchema = toGeminiJsonSchema(AnswerSchema)
    expect(jsonSchema).not.toHaveProperty('$schema')
    expect(jsonSchema).toMatchObject({ type: 'object', required: ['skills'] })
  })
})
