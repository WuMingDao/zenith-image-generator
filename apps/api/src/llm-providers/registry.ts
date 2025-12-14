/**
 * LLM Provider Registry
 */

import type { LLMProviderType } from '@z-image/shared'
import { deepseekProvider } from './deepseek'
import { giteeLLMProvider } from './gitee-llm'
import { huggingfaceLLMProvider } from './huggingface-llm'
import { modelscopeLLMProvider } from './modelscope-llm'
import { pollinationsProvider } from './pollinations'
import type { LLMProvider } from './types'

/** LLM Provider registry map */
const llmProviders: Record<string, LLMProvider> = {
  pollinations: pollinationsProvider,
  'huggingface-llm': huggingfaceLLMProvider,
  'gitee-llm': giteeLLMProvider,
  'modelscope-llm': modelscopeLLMProvider,
  deepseek: deepseekProvider,
}

/** Get LLM provider by ID */
export function getLLMProvider(providerId: LLMProviderType): LLMProvider {
  const provider = llmProviders[providerId]
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${providerId}`)
  }
  return provider
}

/** Check if LLM provider exists */
export function hasLLMProvider(providerId: string): boolean {
  return providerId in llmProviders
}

/** Get all LLM provider IDs */
export function getLLMProviderIds(): string[] {
  return Object.keys(llmProviders)
}

/** Register a new LLM provider */
export function registerLLMProvider(provider: LLMProvider): void {
  llmProviders[provider.id] = provider
}
