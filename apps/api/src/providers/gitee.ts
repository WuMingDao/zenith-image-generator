/**
 * Gitee AI Provider Implementation
 */

import { Errors } from '@z-image/shared'
import type { ImageProvider, ProviderGenerateRequest, ProviderGenerateResult } from './types'

const GITEE_API_URL = 'https://ai.gitee.com/v1/images/generations'

interface GiteeImageResponse {
  data: Array<{
    url?: string
    b64_json?: string
  }>
}

interface GiteeErrorResponse {
  message?: string
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

/** Parse Gitee API error response */
function parseGiteeError(status: number, data: GiteeErrorResponse): Error {
  const provider = 'Gitee AI'
  const message = data.error?.message || data.message || `HTTP ${status}`

  // Check for authentication errors
  if (
    status === 401 ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('invalid api key')
  ) {
    return Errors.authInvalid(provider, message)
  }

  // Check for quota/rate limit errors
  if (
    status === 429 ||
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('quota')
  ) {
    if (message.toLowerCase().includes('quota')) {
      return Errors.quotaExceeded(provider)
    }
    return Errors.rateLimited(provider)
  }

  // Check for token expiration
  if (message.toLowerCase().includes('expired')) {
    return Errors.authExpired(provider)
  }

  // Generic provider error
  return Errors.providerError(provider, message)
}

export class GiteeProvider implements ImageProvider {
  readonly id = 'gitee'
  readonly name = 'Gitee AI'

  async generate(request: ProviderGenerateRequest): Promise<ProviderGenerateResult> {
    if (!request.authToken) {
      throw Errors.authRequired('Gitee AI')
    }

    const seed = request.seed ?? Math.floor(Math.random() * 2147483647)

    const requestBody: Record<string, unknown> = {
      prompt: request.prompt,
      model: request.model || 'z-image-turbo',
      width: request.width,
      height: request.height,
      seed,
      num_inference_steps: request.steps ?? 9,
      response_format: 'url',
    }

    if (request.negativePrompt) {
      requestBody.negative_prompt = request.negativePrompt
    }

    if (request.guidanceScale !== undefined) {
      requestBody.guidance_scale = request.guidanceScale
    }

    const response = await fetch(GITEE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.authToken.trim()}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as GiteeErrorResponse
      throw parseGiteeError(response.status, errData)
    }

    const data = (await response.json()) as GiteeImageResponse

    if (!data.data?.[0]?.url) {
      throw Errors.generationFailed('Gitee AI', 'No image returned')
    }

    return {
      url: data.data[0].url,
      seed,
    }
  }
}

export const giteeProvider = new GiteeProvider()
