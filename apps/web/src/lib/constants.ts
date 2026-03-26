/**
 * Frontend Constants
 *
 * Uses shared types and constants from @z-image/shared
 * with frontend-specific additions (icons)
 */

import {
  type AspectRatioConfig,
  DEFAULT_OPTIMIZE_SYSTEM_PROMPT,
  getModelsByProvider,
  LLM_PROVIDER_CONFIGS,
  type LLMProviderType,
  MODEL_CONFIGS,
  PROVIDER_CONFIGS,
  type ProviderType,
  ASPECT_RATIOS as SHARED_ASPECT_RATIOS,
} from '@z-image/shared'
import { RectangleHorizontal, RectangleVertical, Square } from 'lucide-react'

// Re-export shared types
export type { ProviderType, AspectRatioConfig, LLMProviderType }
export { PROVIDER_CONFIGS, MODEL_CONFIGS, getModelsByProvider, LLM_PROVIDER_CONFIGS }
export { DEFAULT_OPTIMIZE_SYSTEM_PROMPT }

// Environment defaults (with fallbacks to prevent undefined)
export const DEFAULT_PROMPT = import.meta.env.VITE_DEFAULT_PROMPT ?? ''
export const DEFAULT_NEGATIVE_PROMPT = import.meta.env.VITE_DEFAULT_NEGATIVE_PROMPT ?? ''

// Aspect ratios with icons for UI
const ASPECT_RATIO_ICONS = {
  '1:1': Square,
  '4:3': RectangleHorizontal,
  '3:4': RectangleVertical,
  '16:9': RectangleHorizontal,
  '9:16': RectangleVertical,
} as const

export interface AspectRatioWithIcon extends AspectRatioConfig {
  icon: typeof Square
}

export const ASPECT_RATIOS: AspectRatioWithIcon[] = SHARED_ASPECT_RATIOS.map((ratio) => ({
  ...ratio,
  icon: ASPECT_RATIO_ICONS[ratio.label as keyof typeof ASPECT_RATIO_ICONS] || Square,
}))

export type AspectRatio = (typeof ASPECT_RATIOS)[number]

// Storage
export const STORAGE_KEY = 'zenith-settings'

export function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

export function saveSettings(settings: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

// Provider options for UI
export const PROVIDER_OPTIONS: { value: ProviderType; label: string; requiresAuth: boolean }[] = [
  { value: 'huggingface', label: 'HuggingFace', requiresAuth: false },
  { value: 'a4f', label: 'A4F', requiresAuth: true },
  { value: 'gitee', label: 'Gitee AI', requiresAuth: true },
  { value: 'modelscope', label: 'ModelScope', requiresAuth: true },
]

// Get default model for provider
export function getDefaultModel(provider: ProviderType): string {
  const models = getModelsByProvider(provider)
  return models[0]?.id || 'z-image-turbo'
}

// ============================================================================
// LLM Settings (for prompt optimization)
// ============================================================================

export const AIHUBMIX_BASE_URL = 'https://aihubmix.com/v1'

/** LLM provider options for UI (excluding deepseek for now, can add later) */
export const LLM_PROVIDER_OPTIONS: { value: LLMProviderType; label: string; needsAuth: boolean }[] =
  [
    { value: 'pollinations', label: 'Pollinations AI', needsAuth: false },
    { value: 'huggingface-llm', label: 'HuggingFace', needsAuth: false },
    { value: 'gitee-llm', label: 'Gitee AI', needsAuth: true },
    { value: 'modelscope-llm', label: 'ModelScope', needsAuth: true },
    { value: 'aihubmix', label: 'AIHubMix', needsAuth: true },
    { value: 'custom', label: 'Custom (OpenAI Compatible)', needsAuth: true },
  ]

/** Get models for LLM provider */
export function getLLMModels(provider: LLMProviderType) {
  return LLM_PROVIDER_CONFIGS[provider]?.models || []
}

/** Get default LLM model for provider */
export function getDefaultLLMModel(provider: LLMProviderType): string {
  return LLM_PROVIDER_CONFIGS[provider]?.defaultModel || 'openai'
}

export function isDirectOpenAICompatibleLLMProvider(provider: LLMProviderType): boolean {
  return provider === 'custom' || provider === 'aihubmix'
}

/** Custom LLM provider configuration */
export interface CustomLLMConfig {
  /** API base URL (e.g., https://api.openai.com/v1) */
  baseUrl: string
  /** API key */
  apiKey: string
  /** Model name */
  model: string
}

/** LLM Settings interface */
export interface LLMSettings {
  /** LLM provider for optimization */
  llmProvider: LLMProviderType
  /** LLM model for optimization */
  llmModel: string
  /** LLM provider for translation */
  translateProvider: LLMProviderType
  /** LLM model for translation */
  translateModel: string
  /** Auto-translate enabled (Chinese to English) */
  autoTranslate: boolean
  /** Custom system prompt for optimization */
  customSystemPrompt: string
  /** Custom provider config for optimization */
  customOptimizeConfig: CustomLLMConfig
  /** Custom provider config for translation */
  customTranslateConfig: CustomLLMConfig
}

/** Default custom LLM config */
export const DEFAULT_CUSTOM_LLM_CONFIG: CustomLLMConfig = {
  baseUrl: '',
  apiKey: '',
  model: '',
}

export function getLLMProviderBaseUrl(
  provider: LLMProviderType,
  config: CustomLLMConfig
): string {
  if (provider === 'aihubmix') return AIHUBMIX_BASE_URL
  return config.baseUrl
}

/** Default LLM settings */
export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  llmProvider: 'pollinations',
  llmModel: 'openai-fast',
  translateProvider: 'pollinations',
  translateModel: 'openai-fast',
  autoTranslate: true,
  customSystemPrompt: '',
  customOptimizeConfig: { ...DEFAULT_CUSTOM_LLM_CONFIG },
  customTranslateConfig: { ...DEFAULT_CUSTOM_LLM_CONFIG },
}

/** LLM settings storage key */
export const LLM_SETTINGS_KEY = 'zenith-llm-settings'

/** Load LLM settings from localStorage */
export function loadLLMSettings(): LLMSettings {
  try {
    const saved = localStorage.getItem(LLM_SETTINGS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Ensure all fields have proper default values (handle undefined/null from old data)
      return {
        llmProvider: parsed.llmProvider ?? DEFAULT_LLM_SETTINGS.llmProvider,
        llmModel: parsed.llmModel ?? DEFAULT_LLM_SETTINGS.llmModel,
        translateProvider: parsed.translateProvider ?? DEFAULT_LLM_SETTINGS.translateProvider,
        translateModel: parsed.translateModel ?? DEFAULT_LLM_SETTINGS.translateModel,
        autoTranslate: parsed.autoTranslate ?? DEFAULT_LLM_SETTINGS.autoTranslate,
        customSystemPrompt: parsed.customSystemPrompt ?? DEFAULT_LLM_SETTINGS.customSystemPrompt,
        customOptimizeConfig: {
          baseUrl: parsed.customOptimizeConfig?.baseUrl ?? DEFAULT_CUSTOM_LLM_CONFIG.baseUrl,
          apiKey: parsed.customOptimizeConfig?.apiKey ?? DEFAULT_CUSTOM_LLM_CONFIG.apiKey,
          model: parsed.customOptimizeConfig?.model ?? DEFAULT_CUSTOM_LLM_CONFIG.model,
        },
        customTranslateConfig: {
          baseUrl: parsed.customTranslateConfig?.baseUrl ?? DEFAULT_CUSTOM_LLM_CONFIG.baseUrl,
          apiKey: parsed.customTranslateConfig?.apiKey ?? DEFAULT_CUSTOM_LLM_CONFIG.apiKey,
          model: parsed.customTranslateConfig?.model ?? DEFAULT_CUSTOM_LLM_CONFIG.model,
        },
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_LLM_SETTINGS
}

/** Save LLM settings to localStorage */
export function saveLLMSettings(settings: Partial<LLMSettings>): void {
  const current = loadLLMSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(updated))
}

/** Get the effective system prompt (custom or default) */
export function getEffectiveSystemPrompt(customPrompt: string | undefined | null): string {
  const trimmed = (customPrompt ?? '').trim()
  return trimmed || DEFAULT_OPTIMIZE_SYSTEM_PROMPT
}
