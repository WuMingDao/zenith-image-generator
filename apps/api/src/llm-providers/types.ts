/**
 * LLM Provider Interface Definition
 */

/** LLM completion request */
export interface LLMCompleteRequest {
  /** User prompt */
  prompt: string
  /** System prompt */
  systemPrompt: string
  /** Model ID (optional, uses provider default) */
  model?: string
  /** Authentication token (optional) */
  authToken?: string
  /** Max tokens to generate */
  maxTokens?: number
}

/** LLM completion result */
export interface LLMCompleteResult {
  /** Generated content */
  content: string
  /** Model used */
  model: string
}

/** LLM provider interface */
export interface LLMProvider {
  /** Provider ID */
  readonly id: string
  /** Provider display name */
  readonly name: string
  /** Complete a chat request */
  complete(request: LLMCompleteRequest): Promise<LLMCompleteResult>
}
