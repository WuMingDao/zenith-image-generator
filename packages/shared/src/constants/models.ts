/**
 * Model Configuration
 */

import type { ModelConfig, ProviderType } from '../types/provider'

/** All model configurations */
export const MODEL_CONFIGS: ModelConfig[] = [
  // Gitee AI models
  {
    id: 'z-image-turbo',
    name: 'Z-Image Turbo',
    provider: 'gitee',
    features: {
      negativePrompt: true,
      steps: { min: 1, max: 20, default: 9 },
      seed: true,
    },
  },
  {
    id: 'Qwen-Image',
    name: 'Qwen Image',
    provider: 'gitee',
    features: {
      negativePrompt: true,
      steps: { min: 4, max: 50, default: 20 },
      seed: true,
    },
  },
  {
    id: 'flux-1-schnell',
    name: 'FLUX.1 Schnell',
    provider: 'gitee',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 50, default: 8 },
      guidanceScale: { min: 0, max: 50, default: 7.5 },
      seed: true,
    },
  },
  {
    id: 'FLUX_1-Krea-dev',
    name: 'FLUX.1 Krea',
    provider: 'gitee',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 50, default: 20 },
      guidanceScale: { min: 0, max: 20, default: 4.5 },
      seed: true,
    },
  },
  {
    id: 'FLUX.1-dev',
    name: 'FLUX.1',
    provider: 'gitee',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 50, default: 20 },
      guidanceScale: { min: 0, max: 20, default: 4.5 },
      seed: true,
    },
  },
  // HuggingFace models
  {
    id: 'z-image-turbo',
    name: 'Z-Image Turbo',
    provider: 'huggingface',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 20, default: 9 },
      seed: true,
    },
  },
  {
    id: 'qwen-image-fast',
    name: 'Qwen Image Fast',
    provider: 'huggingface',
    features: {
      negativePrompt: false,
      steps: { min: 4, max: 28, default: 8 },
      seed: true,
    },
  },
  {
    id: 'ovis-image',
    name: 'Ovis Image',
    provider: 'huggingface',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 50, default: 24 },
      seed: true,
    },
  },
  {
    id: 'flux-1-schnell',
    name: 'FLUX.1 Schnell',
    provider: 'huggingface',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 50, default: 8 },
      seed: true,
    },
  },
  // ModelScope models
  {
    id: 'Tongyi-MAI/Z-Image-Turbo',
    name: 'Z-Image Turbo',
    provider: 'modelscope',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 20, default: 9 },
      seed: true,
    },
  },
  {
    id: 'black-forest-labs/FLUX.2-dev',
    name: 'FLUX.2',
    provider: 'modelscope',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 50, default: 24 },
      guidanceScale: { min: 1, max: 10, default: 3.5 },
      seed: true,
    },
  },
  {
    id: 'black-forest-labs/FLUX.1-Krea-dev',
    name: 'FLUX.1 Krea',
    provider: 'modelscope',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 50, default: 24 },
      guidanceScale: { min: 1, max: 20, default: 3.5 },
      seed: true,
    },
  },
  {
    id: 'MusePublic/489_ckpt_FLUX_1',
    name: 'FLUX.1',
    provider: 'modelscope',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 50, default: 24 },
      guidanceScale: { min: 1, max: 20, default: 3.5 },
      seed: true,
    },
  },
]

/** Get models by provider */
export function getModelsByProvider(provider: ProviderType): ModelConfig[] {
  return MODEL_CONFIGS.filter((m) => m.provider === provider)
}

/** Get model configuration by ID */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIGS.find((m) => m.id === modelId)
}

/** Get model configuration by provider and ID */
export function getModelByProviderAndId(
  provider: ProviderType,
  modelId: string
): ModelConfig | undefined {
  return MODEL_CONFIGS.find((m) => m.provider === provider && m.id === modelId)
}
