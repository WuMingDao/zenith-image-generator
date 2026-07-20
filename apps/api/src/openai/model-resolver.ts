import type { ProviderType } from '@z-image/shared'

interface ResolvedModel {
  provider: ProviderType
  model: string
}

const DEFAULT_HF_MODEL = 'z-image-turbo'
const HF_MODELS = new Set(['z-image-turbo', 'qwen-image-fast', 'ovis-image', 'flux-1-schnell'])

const GITEE_MODEL_ALIASES: Record<string, string> = {
  'z-image-turbo': 'z-image-turbo',
  'qwen-image': 'Qwen-Image',
  'flux-1-krea-dev': 'FLUX_1-Krea-dev',
  'flux-1-dev': 'FLUX.1-dev',
}

const MODELSCOPE_MODEL_ALIASES: Record<string, string> = {
  'z-image-turbo': 'Tongyi-MAI/Z-Image-Turbo',
  'flux-2': 'black-forest-labs/FLUX.2-dev',
  'flux-1-krea-dev': 'black-forest-labs/FLUX.1-Krea-dev',
  'flux-1': 'MusePublic/489_ckpt_FLUX_1',
}

// ModelScope Global uses the same model aliases as ModelScope
const MODELSCOPE_GLOBAL_MODEL_ALIASES: Record<string, string> = { ...MODELSCOPE_MODEL_ALIASES }

export function resolveModel(modelParam?: string): ResolvedModel {
  const model = (modelParam || DEFAULT_HF_MODEL).trim()

  if (model.startsWith('gitee/')) {
    const raw = model.slice('gitee/'.length)
    return { provider: 'gitee', model: GITEE_MODEL_ALIASES[raw] || raw }
  }

  if (model.startsWith('ms/')) {
    const raw = model.slice('ms/'.length)
    return { provider: 'modelscope', model: MODELSCOPE_MODEL_ALIASES[raw] || raw }
  }

  if (model.startsWith('msg/')) {
    const raw = model.slice('msg/'.length)
    return { provider: 'modelscope-global', model: MODELSCOPE_GLOBAL_MODEL_ALIASES[raw] || raw }
  }

  if (model.startsWith('a4f/')) {
    const raw = model.slice('a4f/'.length)
    return { provider: 'a4f', model: raw }
  }

  return { provider: 'huggingface', model: HF_MODELS.has(model) ? model : DEFAULT_HF_MODEL }
}
