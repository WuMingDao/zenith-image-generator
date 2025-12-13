/**
 * ModelScope Provider Implementation
 */

import { Errors } from '@z-image/shared'
import type { ImageProvider, ProviderGenerateRequest, ProviderGenerateResult } from './types'

interface ModelScopeResponse {
  images?: Array<{ url?: string }>
}

interface ModelScopeErrorResponse {
  message?: string
  error?: string
  errors?: { message?: string }
  code?: string
}

/** Parse ModelScope API error response */
function parseModelScopeError(status: number, data: ModelScopeErrorResponse): Error {
  const provider = 'ModelScope'
  const message = data.errors?.message || data.error || data.message || `HTTP ${status}`

  // Check for authentication errors
  if (
    status === 401 ||
    status === 403 ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('invalid token')
  ) {
    return Errors.authInvalid(provider, message)
  }

  // Check for quota/rate limit errors
  if (
    status === 429 ||
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('too many')
  ) {
    return Errors.rateLimited(provider)
  }

  if (
    message.toLowerCase().includes('quota') ||
    message.toLowerCase().includes('exceeded') ||
    message.toLowerCase().includes('insufficient')
  ) {
    return Errors.quotaExceeded(provider)
  }

  // Check for token expiration
  if (message.toLowerCase().includes('expired')) {
    return Errors.authExpired(provider)
  }

  // Generic provider error
  return Errors.providerError(provider, message)
}

export class ModelScopeProvider implements ImageProvider {
  readonly id = 'modelscope'
  readonly name = 'ModelScope'

  private readonly baseUrl = 'https://api-inference.modelscope.cn/v1'

  async generate(request: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    if (!request.authToken) {
      throw Errors.authRequired('ModelScope')
    }

    const token = request.authToken.trim()

    if (token.length < 8) {
      throw Errors.authInvalid('ModelScope', 'Token is too short')
    }

    const sizeString = `${request.width}x${request.height}`
    const body: Record<string, unknown> = {
      prompt: request.prompt,
      model: request.model || 'Tongyi-MAI/Z-Image-Turbo',
      size: sizeString,
      seed: request.seed ?? Math.floor(Math.random() * 2147483647),
      steps: request.steps ?? 9,
    }

    if (request.guidanceScale !== undefined) {
      body.guidance = request.guidanceScale
    }

    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as ModelScopeErrorResponse
      throw parseModelScopeError(response.status, errData)
    }

    const data = (await response.json()) as ModelScopeResponse
    const imageUrl = data.images?.[0]?.url

    if (!imageUrl) {
      throw Errors.generationFailed('ModelScope', 'No image returned')
    }

    return { url: imageUrl, seed: body.seed as number }
  }
}

export const modelscopeProvider = new ModelScopeProvider()
