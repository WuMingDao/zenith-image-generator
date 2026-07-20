/**
 * API Provider Type Definitions
 */

/** Supported provider types */
export type ProviderType = 'a4f' | 'gitee' | 'huggingface' | 'modelscope' | 'modelscope-global'

/** Provider configuration */
export interface ProviderConfig {
  /** Provider ID */
  id: ProviderType
  /** Display name */
  name: string
  /** Whether authentication is required */
  requiresAuth: boolean
  /** Authentication header name */
  authHeader: string
  /** API base URL */
  baseUrl: string
}

/** Model feature configuration */
export interface ModelFeatures {
  /** Whether negative prompt is supported */
  negativePrompt: boolean
  /** Inference steps configuration */
  steps: {
    min: number
    max: number
    default: number
  }
  /** Guidance scale configuration (optional) */
  guidanceScale?: {
    min: number
    max: number
    default: number
  }
  /** Whether seed is supported */
  seed: boolean
}

/** Model configuration */
export interface ModelConfig {
  /** Model ID */
  id: string
  /** Display name */
  name: string
  /** Provider this model belongs to */
  provider: ProviderType
  /** Supported features */
  features: ModelFeatures
}
