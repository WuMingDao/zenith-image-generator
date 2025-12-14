/**
 * DeepSeek LLM Provider
 *
 * Requires API key authentication
 */

import { Errors } from '@z-image/shared'
import type { LLMCompleteRequest, LLMCompleteResult, LLMProvider } from './types'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

interface DeepSeekErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

export class DeepSeekProvider implements LLMProvider {
  readonly id = 'deepseek'
  readonly name = 'DeepSeek'

  async complete(request: LLMCompleteRequest): Promise<LLMCompleteResult> {
    if (!request.authToken) {
      throw Errors.authRequired(this.name)
    }

    const model = request.model || 'deepseek-chat'

    const response = await fetch(DEEPSEEK_API_URL, {
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
      }),
    })

    if (!response.ok) {
      return this.handleError(response)
    }

    const data = (await response.json()) as DeepSeekResponse
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw Errors.providerError(this.name, 'Empty response from provider')
    }

    return { content, model }
  }

  private async handleError(response: Response): Promise<never> {
    const errorText = await response.text().catch(() => 'Unknown error')
    console.error('[DeepSeek] API Error:', errorText)

    let errorData: DeepSeekErrorResponse = {}
    try {
      errorData = JSON.parse(errorText)
    } catch {
      // Not JSON, use raw text
    }

    const message = errorData.error?.message || errorText

    if (response.status === 401) {
      throw Errors.authInvalid(this.name, message)
    }

    if (response.status === 429) {
      throw Errors.rateLimited(this.name)
    }

    if (response.status === 402 || message.toLowerCase().includes('quota')) {
      throw Errors.quotaExceeded(this.name)
    }

    if (message.toLowerCase().includes('expired')) {
      throw Errors.authExpired(this.name)
    }

    throw Errors.providerError(this.name, message)
  }
}

export const deepseekProvider = new DeepSeekProvider()
