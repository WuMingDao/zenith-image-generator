/**
 * Pollinations AI LLM Provider
 *
 * Free, no-auth-required LLM provider
 */

import { Errors } from '@z-image/shared'
import type { LLMCompleteRequest, LLMCompleteResult, LLMProvider } from './types'

const POLLINATIONS_API_URL = 'https://text.pollinations.ai/openai'

interface PollinationsResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

export class PollinationsProvider implements LLMProvider {
  readonly id = 'pollinations'
  readonly name = 'Pollinations AI'

  async complete(request: LLMCompleteRequest): Promise<LLMCompleteResult> {
    const model = request.model || 'openai'

    const response = await fetch(POLLINATIONS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      const error = await response.text().catch(() => 'Unknown error')
      console.error('[Pollinations] API Error:', error)

      if (response.status === 429) {
        throw Errors.rateLimited(this.name)
      }

      throw Errors.providerError(this.name, error)
    }

    const data = (await response.json()) as PollinationsResponse
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw Errors.providerError(this.name, 'Empty response from provider')
    }

    return { content, model }
  }
}

export const pollinationsProvider = new PollinationsProvider()
