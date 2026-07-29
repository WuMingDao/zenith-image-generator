import { Errors } from '@z-image/shared'
import type { VideoCapability, VideoRequest, VideoResult, VideoStatus } from '../../core/types'

const MINIMAX_VIDEO_API = 'https://api.minimax.io/v1/video_generation'
const MINIMAX_QUERY_API = 'https://api.minimax.io/v1/query/video_generation'
const MINIMAX_FILE_API = 'https://api.minimax.io/v1/files/retrieve'
const DEFAULT_MODEL = 'MiniMax-Hailuo-2.3'
const PROVIDER = 'MiniMax'

interface MiniMaxBaseResp {
  status_code?: number
  status_msg?: string
}

interface MiniMaxErrorResponse {
  base_resp?: MiniMaxBaseResp
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

async function retrieveDownloadUrl(fileId: string, token: string): Promise<string | undefined> {
  const response = await fetch(`${MINIMAX_FILE_API}?file_id=${encodeURIComponent(fileId)}`, {
    headers: { Authorization: `Bearer ${token.trim()}` },
  })

  if (!response.ok) {
    const errData = (await response.json().catch(() => ({}))) as MiniMaxErrorResponse
    throw parseMiniMaxError(
      response.status,
      errData.base_resp?.status_code,
      errData.base_resp?.status_msg || `HTTP ${response.status}`
    )
  }

  const data = (await response.json()) as MiniMaxFileResponse
  assertBaseRespOk(response.status, data.base_resp)
  return data.file?.download_url
}

export const minimaxVideo: VideoCapability = {
  async createTask(request: VideoRequest, token?: string | null): Promise<VideoResult> {
    if (!token) throw Errors.authRequired(PROVIDER)

    const body = {
      model: request.model || DEFAULT_MODEL,
      first_frame_image: request.imageUrl,
      prompt: request.prompt,
    }

    const response = await fetch(MINIMAX_VIDEO_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as MiniMaxErrorResponse
      throw parseMiniMaxError(
        response.status,
        errData.base_resp?.status_code,
        errData.base_resp?.status_msg || `HTTP ${response.status}`
      )
    }

    const data = (await response.json()) as MiniMaxCreateResponse
    assertBaseRespOk(response.status, data.base_resp)

    if (!data.task_id) throw Errors.providerError(PROVIDER, 'Missing task_id in response')
    return { taskId: data.task_id }
  },

  async getStatus(taskId: string, token?: string | null): Promise<VideoStatus> {
    if (!token) throw Errors.authRequired(PROVIDER)

    const response = await fetch(`${MINIMAX_QUERY_API}?task_id=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${token.trim()}` },
    })

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as MiniMaxErrorResponse
      throw parseMiniMaxError(
        response.status,
        errData.base_resp?.status_code,
        errData.base_resp?.status_msg || `HTTP ${response.status}`
      )
    }

    const data = (await response.json()) as MiniMaxQueryResponse
    assertBaseRespOk(response.status, data.base_resp)

    if (data.status === 'Success') {
      const videoUrl = data.file_id ? await retrieveDownloadUrl(data.file_id, token) : undefined
      return { status: 'success', videoUrl }
    }

    if (data.status === 'Fail') {
      return { status: 'failed', error: data.base_resp?.status_msg }
    }

    if (data.status === 'Processing') {
      return { status: 'processing' }
    }

    // Queueing, Preparing, or any not-yet-started state.
    return { status: 'pending' }
  },
}
