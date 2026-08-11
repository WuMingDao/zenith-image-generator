import { Errors } from '@z-image/shared'
import type { VideoCapability, VideoRequest, VideoResult, VideoStatus } from '../../core/types'
import { minimaxConfig } from './config'

const MINIMAX_V1_BASE_URL = minimaxConfig.baseUrl.replace(/\/+$/, '')
const MINIMAX_API_ORIGIN = MINIMAX_V1_BASE_URL.replace(/\/v1$/, '')
const MINIMAX_V1_VIDEO_API = `${MINIMAX_V1_BASE_URL}/video_generation`
const MINIMAX_V1_QUERY_API = `${MINIMAX_V1_BASE_URL}/query/video_generation`
const MINIMAX_V1_FILE_API = `${MINIMAX_V1_BASE_URL}/files/retrieve`
const MINIMAX_V2_VIDEO_API = `${MINIMAX_API_ORIGIN}/v2/video_generation`
const MINIMAX_V2_QUERY_API = `${MINIMAX_API_ORIGIN}/v2/query/video_generation`
const V2_MODEL = 'MiniMax-H3'
const DEFAULT_MODEL = V2_MODEL
const DEFAULT_DURATION_SECONDS = 5
const PROVIDER = 'MiniMax'

interface MiniMaxBaseResp {
  status_code?: number
  status_msg?: string
}

interface MiniMaxErrorResponse {
  base_resp?: MiniMaxBaseResp
  error?: {
    message?: string
  }
}

interface MiniMaxCreateResponse {
  task_id?: string
  base_resp?: MiniMaxBaseResp
}

// MiniMax video query returns one of: Queueing, Preparing, Processing, Success, Fail.
interface MiniMaxQueryResponse {
  task_id?: string
  status?: string
  file_id?: string
  base_resp?: MiniMaxBaseResp
}

interface MiniMaxFileResponse {
  file?: {
    download_url?: string
  }
  base_resp?: MiniMaxBaseResp
}

interface MiniMaxV2QueryResponse {
  task?: {
    status?: string
    content?: {
      url?: string
    }
    error?: {
      message?: string
    }
  }
}

function parseMiniMaxError(
  status: number,
  statusCode: number | undefined,
  rawMessage: string
): Error {
  const message = rawMessage || `HTTP ${status}`
  const lower = message.toLowerCase()

  if (
    status === 401 ||
    statusCode === 1004 ||
    lower.includes('unauthorized') ||
    lower.includes('invalid api key')
  ) {
    return Errors.authInvalid(PROVIDER, message)
  }

  if (
    statusCode === 1008 ||
    lower.includes('insufficient') ||
    lower.includes('balance') ||
    lower.includes('quota')
  ) {
    return Errors.quotaExceeded(PROVIDER)
  }

  if (status === 429 || statusCode === 1002 || lower.includes('rate limit')) {
    return Errors.rateLimited(PROVIDER)
  }

  if (lower.includes('expired')) {
    return Errors.authExpired(PROVIDER)
  }

  return Errors.providerError(PROVIDER, message)
}

// MiniMax returns HTTP 200 even for logical failures, so callers must also
// inspect base_resp.status_code (0 means success).
function assertBaseRespOk(status: number, baseResp: MiniMaxBaseResp | undefined): void {
  const statusCode = baseResp?.status_code
  if (statusCode !== undefined && statusCode !== 0) {
    throw parseMiniMaxError(status, statusCode, baseResp?.status_msg || `status_code ${statusCode}`)
  }
}

async function throwResponseError(response: Response): Promise<never> {
  const data = (await response.json().catch(() => ({}))) as MiniMaxErrorResponse
  throw parseMiniMaxError(
    response.status,
    data.base_resp?.status_code,
    data.base_resp?.status_msg || data.error?.message || `HTTP ${response.status}`
  )
}

async function retrieveDownloadUrl(fileId: string, token: string): Promise<string | undefined> {
  const response = await fetch(`${MINIMAX_V1_FILE_API}?file_id=${encodeURIComponent(fileId)}`, {
    headers: { Authorization: `Bearer ${token.trim()}` },
  })

  if (!response.ok) {
    await throwResponseError(response)
  }

  const data = (await response.json()) as MiniMaxFileResponse
  assertBaseRespOk(response.status, data.base_resp)
  return data.file?.download_url
}

async function getV2Status(taskId: string, token: string): Promise<VideoStatus | undefined> {
  const response = await fetch(`${MINIMAX_V2_QUERY_API}/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${token.trim()}` },
  })

  // The public task response does not retain the selected model. A v1 task is
  // rejected by the v2 query endpoint, so retry it through the legacy flow.
  if (response.status === 400 || response.status === 404) return undefined
  if (!response.ok) await throwResponseError(response)

  const data = (await response.json()) as MiniMaxV2QueryResponse
  const task = data.task
  if (!task) throw Errors.providerError(PROVIDER, 'Missing task in response')

  if (task.status === 'succeeded') {
    return { status: 'success', videoUrl: task.content?.url }
  }
  if (task.status === 'failed' || task.status === 'cancelled') {
    return { status: 'failed', error: task.error?.message || 'Video generation failed' }
  }
  if (task.status === 'running') return { status: 'processing' }
  return { status: 'pending' }
}

async function getV1Status(taskId: string, token: string): Promise<VideoStatus> {
  const response = await fetch(`${MINIMAX_V1_QUERY_API}?task_id=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${token.trim()}` },
  })

  if (!response.ok) await throwResponseError(response)

  const data = (await response.json()) as MiniMaxQueryResponse
  assertBaseRespOk(response.status, data.base_resp)

  if (data.status === 'Success') {
    const videoUrl = data.file_id ? await retrieveDownloadUrl(data.file_id, token) : undefined
    return { status: 'success', videoUrl }
  }

  if (data.status === 'Fail') {
    return { status: 'failed', error: data.base_resp?.status_msg }
  }

  if (data.status === 'Processing') return { status: 'processing' }

  // Queueing, Preparing, or any not-yet-started state.
  return { status: 'pending' }
}

export const minimaxVideo: VideoCapability = {
  async createTask(request: VideoRequest, token?: string | null): Promise<VideoResult> {
    if (!token) throw Errors.authRequired(PROVIDER)

    const model = request.model || DEFAULT_MODEL
    const isV2 = model === V2_MODEL
    const body = isV2
      ? {
          model,
          content: [
            { type: 'text', text: request.prompt },
            {
              type: 'image_url',
              image_url: { url: request.imageUrl },
              role: 'first_frame',
            },
          ],
          resolution: '2K',
          duration: DEFAULT_DURATION_SECONDS,
          ratio: 'adaptive',
        }
      : {
          model,
          first_frame_image: request.imageUrl,
          prompt: request.prompt,
        }

    const response = await fetch(isV2 ? MINIMAX_V2_VIDEO_API : MINIMAX_V1_VIDEO_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      await throwResponseError(response)
    }

    const data = (await response.json()) as MiniMaxCreateResponse
    assertBaseRespOk(response.status, data.base_resp)

    if (!data.task_id) throw Errors.providerError(PROVIDER, 'Missing task_id in response')
    return { taskId: data.task_id }
  },

  async getStatus(taskId: string, token?: string | null): Promise<VideoStatus> {
    if (!token) throw Errors.authRequired(PROVIDER)

    const v2Status = await getV2Status(taskId, token)
    return v2Status || getV1Status(taskId, token)
  },
}
