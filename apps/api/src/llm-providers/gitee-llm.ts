/**
 * Gitee AI LLM Provider
 *
 * Requires API key authentication (reuses same token as image generation)
 */

import { Errors } from '@z-image/shared'
import type { LLMCompleteRequest, LLMCompleteResult, LLMProvider } from './types'

const GITEE_LLM_API_URL = 'https://ai.gitee.com/v1/chat/completions'

interface GiteeLLMResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

interface GiteeLLMErrorResponse {
  message?: string
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

export class GiteeLLMProvider implements LLMProvider {
  readonly id = 'gitee-llm'
  readonly name = 'Gitee AI'

  async complete(request: LLMCompleteRequest): Promise<LLMCompleteResult> {
    if (!request.authToken) {
      throw Errors.authRequired(this.name)
    }

    const model = request.model || 'DeepSeek-V3'

    const response = await fetch(GITEE_LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.authToken.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens || 1000,
        stream: false,
      }),
    })

    if (!response.ok) {
      return this.handleError(response)
    }

    const data = (await response.json()) as GiteeLLMResponse
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw Errors.providerError(this.name, 'Empty response from provider')
    }

    return { content, model }
  }

  private async handleError(response: Response): Promise<never> {
    const errorText = await response.text().catch(() => 'Unknown error')
    console.error('[Gitee LLM] API Error:', errorText)

    let errorData: GiteeLLMErrorResponse = {}
    try {
      errorData = JSON.parse(errorText)
    } catch {
      // Not JSON, use raw text
    }

    const message = errorData.error?.message || errorData.message || errorText

    if (
      response.status === 401 ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('invalid api key')
    ) {
      throw Errors.authInvalid(this.name, message)
    }

    if (
      response.status === 429 ||
      message.toLowerCase().includes('rate limit') ||
      message.toLowerCase().includes('quota')
    ) {
      if (message.toLowerCase().includes('quota')) {
        throw Errors.quotaExceeded(this.name)
      }
      throw Errors.rateLimited(this.name)
    }

    if (message.toLowerCase().includes('expired')) {
      throw Errors.authExpired(this.name)
    }

    throw Errors.providerError(this.name, message)
  }
}

export const giteeLLMProvider = new GiteeLLMProvider()
