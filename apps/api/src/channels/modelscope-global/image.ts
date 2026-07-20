import { Errors } from '@z-image/shared'
import type { ImageCapability, ImageRequest, ImageResult } from '../../core/types'
import { modelscopeGlobalConfig } from './config'

interface ModelScopeGlobalTaskResponse {
  task_id?: string
}

interface ModelScopeGlobalTaskStatusResponse {
  task_status?: 'PENDING' | 'RUNNING' | 'SUCCEED' | 'FAILED'
  output_images?: string[]
  error_message?: string
}

interface ModelScopeGlobalErrorResponse {
  message?: string
  error?: string
  errors?: { message?: string }
  code?: string
}

function parseModelScopeGlobalError(status: number, data: ModelScopeGlobalErrorResponse): Error {
  const provider = 'ModelScope Global'
  const message = data.errors?.message || data.error || data.message || `HTTP ${status}`

  if (
    status === 401 ||
    status === 403 ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('invalid token')
  ) {
    return Errors.authInvalid(provider, message)
  }

  if (
    status === 429 ||
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('too many')
  ) {
    return Errors.rateLimited(provider)
  }

  if (
    message.toLowerCase().includes('quota') ||
    message.toLowerCase().includes('exceeded') ||
    message.toLowerCase().includes('insufficient')
  ) {
    return Errors.quotaExceeded(provider)
  }

  if (message.toLowerCase().includes('expired')) {
    return Errors.authExpired(provider)
  }

  return Errors.providerError(provider, message)
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const modelscopeGlobalImage: ImageCapability = {
  async generate(request: ImageRequest, token?: string | null): Promise<ImageResult> {
    if (!token) throw Errors.authRequired('ModelScope Global')

    const t = token.trim()
    if (t.length < 8) throw Errors.authInvalid('ModelScope Global', 'Token is too short')

    const sizeString = `${request.width}x${request.height}`
    const seed = request.seed ?? Math.floor(Math.random() * 2147483647)
    const body: Record<string, unknown> = {
      prompt: request.prompt,
      model: request.model || 'Tongyi-MAI/Z-Image-Turbo',
      size: sizeString,
      seed,
      steps: request.steps ?? 9,
    }

    if (request.negativePrompt) body.negative_prompt = request.negativePrompt
    if (request.guidanceScale !== undefined) body.guidance = request.guidanceScale
    if (request.loras) body.loras = request.loras

    const taskId = await submitTask(t, body)
    const imageUrl = await pollForResult(t, taskId)
    return { url: imageUrl, seed, model: body.model as string }
  },
}

async function submitTask(token: string, body: Record<string, unknown>): Promise<string> {
  const response = await fetch(`${modelscopeGlobalConfig.baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(modelscopeGlobalConfig.asyncMode?.headers || {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errData = (await response.json().catch(() => ({}))) as ModelScopeGlobalErrorResponse
    throw parseModelScopeGlobalError(response.status, errData)
  }

  const data = (await response.json()) as ModelScopeGlobalTaskResponse
  if (!data.task_id) throw Errors.generationFailed('ModelScope Global', 'No task_id returned')
  return data.task_id
}

async function pollForResult(token: string, taskId: string): Promise<string> {
  const maxAttempts = modelscopeGlobalConfig.asyncMode?.maxPollAttempts ?? 35
  const pollIntervalMs = modelscopeGlobalConfig.asyncMode?.pollIntervalMs ?? 3000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${modelscopeGlobalConfig.baseUrl}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-ModelScope-Task-Type': 'image_generation',
      },
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as ModelScopeGlobalErrorResponse
      throw parseModelScopeGlobalError(response.status, errData)
    }

    const data = (await response.json()) as ModelScopeGlobalTaskStatusResponse
    const status = data.task_status

    if (status === 'SUCCEED') {
      const url = data.output_images?.[0]
      if (!url) throw Errors.generationFailed('ModelScope Global', 'No image in result')
      return url
    }

    if (status === 'FAILED') {
      throw Errors.generationFailed('ModelScope Global', data.error_message || 'Task failed')
    }

    await delay(pollIntervalMs)
  }

  throw Errors.timeout('ModelScope Global')
}
