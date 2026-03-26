import type {
  OpenAIChatRequest,
  OpenAIChatResponse,
  OpenAIErrorResponse,
  OpenAIImageRequest,
  OpenAIImageResponse,
  OpenAIModelInfo,
  ProviderType,
} from '@z-image/shared'
import type { LLMProviderType } from '@/lib/constants'

const API_URL = import.meta.env.VITE_API_URL || ''

export class OpenAIAPIError extends Error {
  status: number
  type?: string
  code?: string
  param?: string | null

  constructor(
    message: string,
    status: number,
    meta?: Partial<Pick<OpenAIAPIError, 'type' | 'code' | 'param'>>
  ) {
    super(message)
    this.name = 'OpenAIAPIError'
    this.status = status
    this.type = meta?.type
    this.code = meta?.code
    this.param = meta?.param
  }
}

function normalizeOpenAIBaseUrl(input: string): string {
  let url = input.trim()
  if (url.endsWith('/')) url = url.slice(0, -1)
  if (url.endsWith('/chat/completions')) url = url.slice(0, -'/chat/completions'.length)
  if (url.endsWith('/v1')) return url
  return `${url}/v1`
}

export function createOpenAIClientForBaseUrl(baseUrl: string): OpenAIClient {
  const normalized = normalizeOpenAIBaseUrl(baseUrl)
  return new OpenAIClient(normalized.replace(/\/v1$/, ''))
}

async function readOpenAIError(res: Response): Promise<OpenAIAPIError> {
  const status = res.status
  const text = await res.text().catch(() => '')

  try {
    const parsed = JSON.parse(text) as OpenAIErrorResponse
    const msg = parsed?.error?.message || text || `Request failed with status ${status}`
    return new OpenAIAPIError(msg, status, {
      type: parsed?.error?.type,
      code: parsed?.error?.code ?? undefined,
      param: parsed?.error?.param ?? undefined,
    })
  } catch {
    return new OpenAIAPIError(text || `Request failed with status ${status}`, status)
  }
}

export class OpenAIClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(path: string, init: RequestInit, token?: string): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const res = await fetch(`${this.baseURL}${path}`, { ...init, headers })
    if (!res.ok) throw await readOpenAIError(res)
    return (await res.json()) as T
  }

  async generateImage(request: OpenAIImageRequest, token?: string): Promise<OpenAIImageResponse> {
    return this.request<OpenAIImageResponse>(
      '/v1/images/generations',
      { method: 'POST', body: JSON.stringify(request) },
      token
    )
  }

  async chatCompletions(request: OpenAIChatRequest, token?: string): Promise<OpenAIChatResponse> {
    return this.request<OpenAIChatResponse>(
      '/v1/chat/completions',
      { method: 'POST', body: JSON.stringify(request) },
      token
    )
  }

  async listModels(token?: string): Promise<OpenAIModelInfo[]> {
    const res = await this.request<{ object: string; data: OpenAIModelInfo[] }>(
      '/v1/models',
      { method: 'GET' },
      token
    )
    return res.data
  }
}

export const openai = new OpenAIClient(API_URL)

export function buildImageTokenWithPrefix(provider: ProviderType, token: string): string {
  if (provider === 'gitee') return `gitee:${token}`
  if (provider === 'modelscope') return `ms:${token}`
  if (provider === 'a4f') return `a4f:${token}`
  // huggingface: no prefix (default)
  return token
}

export function getFullImageModelId(provider: ProviderType, modelId: string): string {
  if (provider === 'gitee') return `gitee/${modelId}`
  if (provider === 'modelscope') return `ms/${modelId}`
  if (provider === 'a4f') return `a4f/${modelId}`
  return modelId
}

export function buildChatTokenWithPrefix(provider: LLMProviderType, token: string): string {
  if (provider === 'gitee-llm') return `gitee:${token}`
  if (provider === 'modelscope-llm') return `ms:${token}`
  if (provider === 'huggingface-llm') return `hf:${token}`
  if (provider === 'deepseek') return `deepseek:${token}`
  return token
}

export function getFullChatModelId(provider: LLMProviderType, modelId: string): string {
  if (provider === 'gitee-llm') return `gitee/${modelId}`
  if (provider === 'modelscope-llm') return `ms/${modelId}`
  if (provider === 'huggingface-llm') return `hf/${modelId}`
  if (provider === 'deepseek') return `deepseek/${modelId}`
  if (provider === 'pollinations') return `pollinations/${modelId}`
  return modelId
}

export async function fetchOpenAIModels(
  baseUrl: string,
  apiKey: string
): Promise<OpenAIModelInfo[]> {
  const client = createOpenAIClientForBaseUrl(baseUrl)
  return client.listModels(apiKey).catch(async (err) => {
    if (err instanceof OpenAIAPIError) throw err
    throw new OpenAIAPIError(err instanceof Error ? err.message : 'Failed to fetch models', 500)
  })
}
