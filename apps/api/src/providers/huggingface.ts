/**
 * HuggingFace Provider Implementation
 */

import { Errors, HF_SPACES } from '@z-image/shared'
import type { ImageProvider, ProviderGenerateRequest, ProviderGenerateResult } from './types'

/** Parse HuggingFace error message */
function parseHuggingFaceError(message: string, status?: number): Error {
  const provider = 'HuggingFace'
  const lowerMsg = message.toLowerCase()

  // Check for rate limit / queue errors
  if (status === 429 || lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
    return Errors.rateLimited(provider)
  }

  // Check for quota errors
  if (lowerMsg.includes('quota') || lowerMsg.includes('exceeded')) {
    return Errors.quotaExceeded(provider)
  }

  // Check for authentication errors
  if (
    status === 401 ||
    status === 403 ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('forbidden')
  ) {
    return Errors.authInvalid(provider, message)
  }

  // Check for timeout
  if (lowerMsg.includes('timeout') || lowerMsg.includes('timed out')) {
    return Errors.timeout(provider)
  }

  // Check for service unavailable
  if (status === 503 || lowerMsg.includes('unavailable') || lowerMsg.includes('loading')) {
    return Errors.providerError(provider, 'Service is temporarily unavailable or loading')
  }

  // Generic provider error
  return Errors.providerError(provider, message)
}

/** Extract complete event data from SSE stream */
function extractCompleteEventData(sseStream: string): unknown {
  const lines = sseStream.split('\n')
  let currentEvent = ''

  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent = line.substring(6).trim()
    } else if (line.startsWith('data:')) {
      const jsonData = line.substring(5).trim()
      if (currentEvent === 'complete') {
        return JSON.parse(jsonData)
      }
      if (currentEvent === 'error') {
        // Parse actual error message from data
        try {
          const errorData = JSON.parse(jsonData)
          const errorMsg =
            errorData?.error || errorData?.message || JSON.stringify(errorData) || 'Unknown error'
          throw parseHuggingFaceError(errorMsg)
        } catch (e) {
          if (e instanceof SyntaxError) {
            throw parseHuggingFaceError(jsonData || 'Unknown SSE error')
          }
          throw e
        }
      }
    }
  }
  // No complete/error event found, show raw response for debugging
  throw Errors.providerError(
    'HuggingFace',
    `Unexpected SSE response: ${sseStream.substring(0, 200)}`
  )
}

/** Call Gradio API */
async function callGradioApi(baseUrl: string, endpoint: string, data: unknown[], hfToken?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (hfToken) headers.Authorization = `Bearer ${hfToken}`

  const queue = await fetch(`${baseUrl}/gradio_api/call/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  })

  if (!queue.ok) {
    const errText = await queue.text().catch(() => '')
    throw parseHuggingFaceError(errText || `Queue request failed: ${queue.status}`, queue.status)
  }

  const queueData = (await queue.json()) as { event_id?: string }
  if (!queueData.event_id) {
    throw Errors.providerError('HuggingFace', 'No event_id returned from queue')
  }

  const result = await fetch(`${baseUrl}/gradio_api/call/${endpoint}/${queueData.event_id}`, {
    headers,
  })
  const text = await result.text()

  return extractCompleteEventData(text) as unknown[]
}

/** Parse seed from response based on model */
function parseSeedFromResponse(modelId: string, result: unknown[], fallbackSeed: number): number {
  // Qwen Image Fast returns seed as string: "Seed used for generation: 12345"
  if (modelId === 'qwen-image-fast' && typeof result[1] === 'string') {
    const match = result[1].match(/Seed used for generation:\s*(\d+)/)
    if (match) return Number.parseInt(match[1], 10)
  }
  // Other models return seed as number in data[1]
  if (typeof result[1] === 'number') return result[1]
  return fallbackSeed
}

/** Model-specific Gradio configurations */
const MODEL_CONFIGS: Record<
  string,
  { endpoint: string; buildData: (r: ProviderGenerateRequest, seed: number) => unknown[] }
> = {
  'z-image-turbo': {
    endpoint: 'generate_image',
    buildData: (r, seed) => [r.prompt, r.height, r.width, r.steps ?? 9, seed, false],
  },
  'qwen-image-fast': {
    endpoint: 'generate_image',
    buildData: (r, seed) => [r.prompt, seed, true, '1:1', 3, r.steps ?? 8],
  },
  'ovis-image': {
    endpoint: 'generate',
    buildData: (r, seed) => [r.prompt, r.height, r.width, seed, r.steps ?? 24, 4],
  },
  'flux-1-schnell': {
    endpoint: 'infer',
    buildData: (r, seed) => [r.prompt, seed, false, r.width, r.height, r.steps ?? 8],
  },
}

export class HuggingFaceProvider implements ImageProvider {
  readonly id = 'huggingface'
  readonly name = 'HuggingFace'

  async generate(request: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    const seed = request.seed ?? Math.floor(Math.random() * 2147483647)
    const modelId = request.model || 'z-image-turbo'
    const baseUrl = HF_SPACES[modelId as keyof typeof HF_SPACES] || HF_SPACES['z-image-turbo']
    const config = MODEL_CONFIGS[modelId] || MODEL_CONFIGS['z-image-turbo']

    // Debug: log model info (uncomment for debugging)
    // console.log(`[HuggingFace] Model: ${modelId}, BaseURL: ${baseUrl}`)

    const data = await callGradioApi(
      baseUrl,
      config.endpoint,
      config.buildData(request, seed),
      request.authToken
    )

    const result = data as Array<{ url?: string } | number | string>
    const imageUrl = (result[0] as { url?: string })?.url
    if (!imageUrl) {
      throw Errors.generationFailed('HuggingFace', 'No image returned')
    }

    return {
      url: imageUrl,
      seed: parseSeedFromResponse(modelId, result, seed),
    }
  }
}

export const huggingfaceProvider = new HuggingFaceProvider()
