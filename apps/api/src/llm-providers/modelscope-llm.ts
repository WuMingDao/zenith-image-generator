/**
 * ModelScope LLM Provider
 *
 * Requires API key authentication (reuses same token as image generation)
 */

import { Errors } from '@z-image/shared'
import type { LLMCompleteRequest, LLMCompleteResult, LLMProvider } from './types'

const MODELSCOPE_LLM_API_URL = 'https://api-inference.modelscope.cn/v1/chat/completions'

interface ModelScopeLLMResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

interface ModelScopeLLMErrorResponse {
  message?: string
  error?: {
    message?: string
    code?: string
    type?: string
  }
}

export class ModelScopeLLMProvider implements LLMProvider {
  readonly id = 'modelscope-llm'
  readonly name = 'ModelScope'

  async complete(request: LLMCompleteRequest): Promise<LLMCompleteResult> {
    if (!request.authToken) {
      throw Errors.authRequired(this.name)
    }

    const model = request.model || 'deepseek-ai/DeepSeek-V3.2'

    const response = await fetch(MODELSCOPE_LLM_API_URL, {
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

    const data = (await response.json()) as ModelScopeLLMResponse
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw Errors.providerError(this.name, 'Empty response from provider')
    }

    return { content, model }
  }

  private async handleError(response: Response): Promise<never> {
    const errorText = await response.text().catch(() => 'Unknown error')
    console.error('[ModelScope LLM] API Error:', errorText)

    let errorData: ModelScopeLLMErrorResponse = {}
    try {
      errorData = JSON.parse(errorText)
    } catch {
      // Not JSON, use raw text
    }

    const message = errorData.error?.message || errorData.message || errorText

    if (
      response.status === 401 ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('invalid')
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

export const modelscopeLLMProvider = new ModelScopeLLMProvider()
