/**
 * HuggingFace LLM Provider
 *
 * Uses HuggingFace Inference API for text generation
 * Optional authentication (X-HF-Token) - rate limited without token
 */

import { Errors } from '@z-image/shared'
import type { LLMCompleteRequest, LLMCompleteResult, LLMProvider } from './types'

// HuggingFace Inference API base URL
const HF_INFERENCE_API_URL = 'https://api-inference.huggingface.co/models'

/** HuggingFace text generation response */
interface HuggingFaceTextGenResponse {
  generated_text?: string
}

/** HuggingFace OpenAI-compatible response */
interface HuggingFaceChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

interface HuggingFaceErrorResponse {
  error?: string
  estimated_time?: number
}

export class HuggingFaceLLMProvider implements LLMProvider {
  readonly id = 'huggingface-llm'
  readonly name = 'HuggingFace'

  async complete(request: LLMCompleteRequest): Promise<LLMCompleteResult> {
    const model = request.model || 'Qwen/Qwen2.5-72B-Instruct'
    const url = `${HF_INFERENCE_API_URL}/${model}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add auth token if provided (optional but reduces rate limiting)
    if (request.authToken) {
      headers.Authorization = `Bearer ${request.authToken.trim()}`
    }

    // Build the prompt with system and user messages
    const fullPrompt = `<|system|>\n${request.systemPrompt}\n<|user|>\n${request.prompt}\n<|assistant|>\n`

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: request.maxTokens || 1000,
          temperature: 0.7,
          do_sample: true,
          return_full_text: false,
        },
      }),
    })

    if (!response.ok) {
      return this.handleError(response)
    }

    const data: unknown = await response.json()

    // Handle different response formats
    let content: string | undefined

    if (Array.isArray(data)) {
      // Standard text generation format: [{ generated_text: "..." }]
      const first = data[0] as HuggingFaceTextGenResponse | undefined
      if (first?.generated_text) {
        content = first.generated_text.trim()
      }
    } else if (data && typeof data === 'object') {
      const textGenResponse = data as HuggingFaceTextGenResponse
      const chatResponse = data as HuggingFaceChatResponse

      if (textGenResponse.generated_text) {
        content = textGenResponse.generated_text.trim()
      } else if (chatResponse.choices?.[0]?.message?.content) {
        // OpenAI-compatible format
        content = chatResponse.choices[0].message.content.trim()
      }
    }

    if (!content) {
      throw Errors.providerError(this.name, 'Empty response from provider')
    }

    return { content, model }
  }

  private async handleError(response: Response): Promise<never> {
    const errorText = await response.text().catch(() => 'Unknown error')
    console.error('[HuggingFace LLM] API Error:', errorText)

    let errorData: HuggingFaceErrorResponse = {}
    try {
      errorData = JSON.parse(errorText)
    } catch {
      // Not JSON, use raw text
    }

    const message = errorData.error || errorText

    // Model loading - needs retry
    if (response.status === 503 || message.includes('loading')) {
      const waitTime = errorData.estimated_time ? Math.ceil(errorData.estimated_time) : 20
      throw Errors.providerError(this.name, `Model is loading, please retry in ${waitTime} seconds`)
    }

    if (response.status === 401) {
      throw Errors.authInvalid(this.name, message)
    }

    if (response.status === 429) {
      throw Errors.rateLimited(this.name)
    }

    if (response.status === 402 || message.toLowerCase().includes('quota')) {
      throw Errors.quotaExceeded(this.name)
    }

    throw Errors.providerError(this.name, message)
  }
}

export const huggingfaceLLMProvider = new HuggingFaceLLMProvider()
