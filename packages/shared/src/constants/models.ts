/**
 * Model Configuration
 */

import type { ModelConfig, ProviderType } from '../types/provider'

/** All model configurations */
export const MODEL_CONFIGS: ModelConfig[] = [
  // A4F models (OpenAI-compatible)
  {
    id: 'provider-4/imagen-3.5',
    name: 'Imagen 3.5 (provider-4)',
    provider: 'a4f',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 1, default: 1 },
      seed: false,
    },
  },
  {
    id: 'provider-4/imagen-4',
    name: 'Imagen 4 (provider-4)',
    provider: 'a4f',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 1, default: 1 },
      seed: false,
    },
  },
  {
    id: 'provider-8/imagen-3',
    name: 'Imagen 3 (provider-8)',
    provider: 'a4f',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 1, default: 1 },
      seed: false,
    },
  },
  {
    id: 'provider-4/flux-schnell',
    name: 'FLUX Schnell (provider-4)',
    provider: 'a4f',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 1, default: 1 },
      seed: false,
    },
  },
  {
    id: 'provider-8/z-image',
    name: 'Z-Image (provider-8)',
    provider: 'a4f',
    features: {
      negativePrompt: false,
      steps: { min: 1, max: 1, default: 1 },
      seed: false,
    },
  },
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
    id: 'GLM-Image',
    name: 'GLM Image',
    provider: 'gitee',
    features: {
      negativePrompt: true,
      steps: { min: 1, max: 50, default: 30 },
      guidanceScale: { min: 0, max: 20, default: 1.5 },
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
    id: 'Qwen-Image-2512',
    name: 'Qwen Image 2512',
    provider: 'gitee',
    features: {
      negativePrompt: true,
      steps: { min: 1, max: 50, default: 4 },
      guidanceScale: { min: 0, max: 20, default: 1 },
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
      negativePrompt: true,
      steps: { min: 1, max: 20, default: 9 },
      seed: true,
    },
  },
  {
    id: 'Qwen/Qwen-Image-2512',
    name: 'Qwen Image 2512',
    provider: 'modelscope',
    features: {
      negativePrompt: true,
      steps: { min: 1, max: 50, default: 4 },
      seed: true,
    },
  },
  {
    id: 'black-forest-labs/FLUX.2-dev',
    name: 'FLUX.2',
    provider: 'modelscope',
    features: {
      negativePrompt: true,
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
      negativePrompt: true,
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
      negativePrompt: true,
      steps: { min: 1, max: 50, default: 24 },
      guidanceScale: { min: 1, max: 20, default: 3.5 },
      seed: true,
    },
  },
  // ModelScope Global models (mirror of ModelScope, served from api-inference.modelscope.ai)
  {
    id: 'Tongyi-MAI/Z-Image-Turbo',
    name: 'Z-Image Turbo',
    provider: 'modelscope-global',
    features: {
      negativePrompt: true,
      steps: { min: 1, max: 20, default: 9 },
      seed: true,
    },
  },
  {
    id: 'Qwen/Qwen-Image-2512',
    name: 'Qwen Image 2512',
    provider: 'modelscope-global',
    features: {
      negativePrompt: true,
      steps: { min: 1, max: 50, default: 4 },
      seed: true,
    },
  },
  {
    id: 'black-forest-labs/FLUX.2-dev',
    name: 'FLUX.2',
    provider: 'modelscope-global',
    features: {
      negativePrompt: true,
      steps: { min: 1, max: 50, default: 24 },
      guidanceScale: { min: 1, max: 10, default: 3.5 },
      seed: true,
    },
  },
  {
    id: 'black-forest-labs/FLUX.1-Krea-dev',
    name: 'FLUX.1 Krea',
    provider: 'modelscope-global',
    features: {
      negativePrompt: true,
      steps: { min: 1, max: 50, default: 24 },
      guidanceScale: { min: 1, max: 20, default: 3.5 },
      seed: true,
    },
  },
  {
    id: 'MusePublic/489_ckpt_FLUX_1',
    name: 'FLUX.1',
    provider: 'modelscope-global',
    features: {
      negativePrompt: true,
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
