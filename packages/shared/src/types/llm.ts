/**
 * LLM Provider Type Definitions
 */

/** Supported LLM provider types */
export type LLMProviderType =
  | 'pollinations'
  | 'huggingface-llm'
  | 'gitee-llm'
  | 'modelscope-llm'
  | 'aihubmix'
  | 'deepseek'
  | 'custom'

/** Custom OpenAI-compatible provider configuration */
export interface CustomLLMConfig {
  /** API base URL (e.g., https://api.openai.com/v1) */
  baseUrl: string
  /** API key */
  apiKey: string
  /** Model name */
  model: string
}

/** LLM Model configuration */
export interface LLMModelConfig {
  /** Model ID */
  id: string
  /** Display name */
  name: string
  /** Optional description */
  description?: string
}

/** LLM Provider configuration */
export interface LLMProviderConfig {
  /** Provider ID */
  id: LLMProviderType
  /** Display name */
  name: string
  /** API endpoint URL */
  url: string
  /** Default model ID */
  defaultModel: string
  /** Whether authentication is required */
  needsAuth: boolean
  /** Authentication header name (if needsAuth is true) */
  authHeader?: string
  /** Available models */
  models: LLMModelConfig[]
}

/** Prompt optimize request */
export interface OptimizeRequest {
  /** The prompt to optimize */
  prompt: string
  /** LLM provider to use (default: pollinations) */
  provider?: LLMProviderType
  /** Output language (default: en) */
  lang?: 'en' | 'zh'
  /** Specific model to use */
  model?: string
  /** Custom system prompt */
  systemPrompt?: string
  /** Custom provider configuration (when provider is 'custom') */
  customConfig?: CustomLLMConfig
}

/** Prompt optimize success response */
export interface OptimizeResponse {
  /** The optimized prompt */
  optimized: string
  /** Provider used */
  provider: LLMProviderType
  /** Model used */
  model: string
}

/** Prompt optimize error response */
export interface OptimizeErrorResponse {
  /** Error message */
  error: string
  /** Error code */
  code: string
  /** Additional details */
  details?: {
    provider?: string
    upstream?: string
  }
}

/** Prompt translate request */
export interface TranslateRequest {
  /** The prompt to translate (Chinese to English) */
  prompt: string
  /** LLM provider to use (default: pollinations) */
  provider?: LLMProviderType
  /** Specific model to use */
  model?: string
  /** Custom provider configuration (when provider is 'custom') */
  customConfig?: CustomLLMConfig
}

/** Prompt translate success response */
export interface TranslateResponse {
  /** The translated prompt */
  translated: string
  /** Provider used */
  provider: LLMProviderType
  /** Model used */
  model: string
}
