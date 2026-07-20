/**
 * Provider Configuration
 */

import type { ProviderConfig } from '../types/provider'

/** HuggingFace Spaces URLs */
export const HF_SPACES = {
  // Primary space for z-image-turbo (public file URLs for browser display)
  'z-image-turbo': 'https://luca115-z-image-turbo.hf.space',
  'qwen-image-fast': 'https://mcp-tools-qwen-image-fast.hf.space',
  'ovis-image': 'https://aidc-ai-ovis-image-7b.hf.space',
  'flux-1-schnell': 'https://black-forest-labs-flux-1-schnell.hf.space',
  upscaler: 'https://tuan2308-upscaler.hf.space',
} as const

/** Provider configuration map */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  a4f: {
    id: 'a4f',
    name: 'A4F',
    requiresAuth: true,
    authHeader: 'Authorization',
    baseUrl: 'https://api.a4f.co/v1',
  },
  gitee: {
    id: 'gitee',
    name: 'Gitee AI',
    requiresAuth: true,
    authHeader: 'X-API-Key',
    baseUrl: 'https://ai.gitee.com/v1',
  },
  huggingface: {
    id: 'huggingface',
    name: 'HuggingFace',
    requiresAuth: false,
    authHeader: 'X-HF-Token',
    baseUrl: HF_SPACES['z-image-turbo'],
  },
  modelscope: {
    id: 'modelscope',
    name: 'ModelScope',
    requiresAuth: true,
    authHeader: 'X-MS-Token',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
  },
  'modelscope-global': {
    id: 'modelscope-global',
    name: 'ModelScope Global',
    requiresAuth: true,
    authHeader: 'X-MS-Token',
    baseUrl: 'https://api-inference.modelscope.ai/v1',
  },
} as const

/** Get provider configuration by ID */
export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return PROVIDER_CONFIGS[providerId]
}
