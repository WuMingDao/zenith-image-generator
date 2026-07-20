import {
  Errors,
  type ProviderType,
  validateDimensions,
  validatePrompt,
  validateSteps,
  wrapGradioUrl,
} from '@z-image/shared'
import type { ImageRequest, ImageResult } from '../core/types'
import type { OpenAIImageRequest, OpenAIImageResponse } from './types'

export type OpenAIConvertedRequest = Pick<
  ImageRequest,
  'prompt' | 'negativePrompt' | 'width' | 'height' | 'steps' | 'seed' | 'guidanceScale'
>

export function parseSize(size?: string): { width: number; height: number } {
  if (!size) return { width: 1024, height: 1024 }

  const [w, h] = size.split('x').map((n) => Number.parseInt(n, 10))
  return {
    width: Number.isFinite(w) && w > 0 ? w : 1024,
    height: Number.isFinite(h) && h > 0 ? h : 1024,
  }
}

export function parseBearerToken(authHeader?: string): {
  providerHint?: ProviderType
  token?: string
} {
  if (!authHeader) return {}
  if (!authHeader.startsWith('Bearer ')) return {}

  const raw = authHeader.slice('Bearer '.length).trim()
  if (!raw) return {}

  if (raw.startsWith('gitee:')) {
    const token = raw.slice('gitee:'.length).trim()
    return token ? { providerHint: 'gitee', token } : {}
  }
  if (raw.startsWith('ms:')) {
    const token = raw.slice('ms:'.length).trim()
    return token ? { providerHint: 'modelscope', token } : {}
  }
  if (raw.startsWith('msg:')) {
    const token = raw.slice('msg:'.length).trim()
    return token ? { providerHint: 'modelscope-global', token } : {}
  }
  if (raw.startsWith('hf:')) {
    const token = raw.slice('hf:'.length).trim()
    return token ? { providerHint: 'huggingface', token } : {}
  }
  if (raw.startsWith('a4f:')) {
    const token = raw.slice('a4f:'.length).trim()
    return token ? { providerHint: 'a4f', token } : {}
  }

  return { token: raw }
}

export function convertRequest(req: OpenAIImageRequest): OpenAIConvertedRequest {
  const promptValidation = validatePrompt(req.prompt)
  if (!promptValidation.valid) {
    throw Errors.invalidPrompt(promptValidation.error || 'Invalid prompt')
  }

  const { width, height } = parseSize(req.size)
  const dimensionsValidation = validateDimensions(width, height)
  if (!dimensionsValidation.valid) {
    throw Errors.invalidDimensions(dimensionsValidation.error || 'Invalid dimensions')
  }

  const steps = req.steps ?? req.num_inference_steps ?? (req.quality === 'hd' ? 30 : undefined)
  if (steps !== undefined) {
    const stepsValidation = validateSteps(steps)
    if (!stepsValidation.valid) {
      throw Errors.invalidParams('steps', stepsValidation.error || 'Invalid steps')
    }
  }

  return {
    prompt: req.prompt,
    negativePrompt: req.negative_prompt,
    width,
    height,
    steps,
    seed: req.seed,
    guidanceScale: req.guidance_scale ?? req.cfg_scale,
  }
}

export function convertResponse(result: ImageResult, baseUrl?: string): OpenAIImageResponse {
  return {
    created: Math.floor(Date.now() / 1000),
    // Wrap Gradio file URLs behind our /proxy/image endpoint so clients can
    // access images without being blocked by Gradio 6.20.0+ SSRF-safe proxy
    // or ephemeral /tmp/gradio/ file cleanup. Non-Gradio URLs pass through.
    // The original URL is preserved in the url= query param for later retrieval.
    data: [{ url: wrapGradioUrl(result.url, baseUrl) }],
  }
}
