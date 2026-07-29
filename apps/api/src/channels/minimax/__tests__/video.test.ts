import { ApiErrorCode } from '@z-image/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { minimaxVideo } from '../video'

describe('minimaxVideo', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws AUTH_REQUIRED when no token provided on createTask', async () => {
    await expect(
      minimaxVideo.createTask(
        { imageUrl: 'https://example.com/frame.png', prompt: 'pan left', width: 1280, height: 720 },
        null
      )
    ).rejects.toMatchObject({ code: ApiErrorCode.AUTH_REQUIRED })
  })

  it('creates an image-to-video task with the default model', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ task_id: 'task-123', base_resp: { status_code: 0 } }),
    } as Response)

    const result = await minimaxVideo.createTask(
      { imageUrl: 'https://example.com/frame.png', prompt: 'pan left', width: 1280, height: 720 },
      'test-api-key'
    )

    expect(result).toEqual({ taskId: 'task-123' })

    const call = mockFetch.mock.calls[0]
    expect(call[0]).toBe('https://api.minimax.io/v1/video_generation')
    expect(call[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-api-key',
      }),
    })
    const body = JSON.parse(call[1]?.body as string)
    expect(body).toMatchObject({
      model: 'MiniMax-Hailuo-2.3',
      first_frame_image: 'https://example.com/frame.png',
      prompt: 'pan left',
    })
  })

  it('surfaces logical failures reported via base_resp.status_code', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ base_resp: { status_code: 1004, status_msg: 'invalid api key' } }),
    } as Response)

    await expect(
      minimaxVideo.createTask(
        { imageUrl: 'https://example.com/frame.png', prompt: 'pan left', width: 1280, height: 720 },
        'bad-key'
      )
    ).rejects.toMatchObject({ code: ApiErrorCode.AUTH_INVALID })
  })

  it('maps in-progress query states to pending/processing', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        task_id: 'task-123',
        status: 'Processing',
        base_resp: { status_code: 0 },
      }),
    } as Response)

    const status = await minimaxVideo.getStatus('task-123', 'test-api-key')
    expect(status).toEqual({ status: 'processing' })
    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://api.minimax.io/v1/query/video_generation?task_id=task-123'
    )
  })

  it('resolves the download url after a successful query', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          task_id: 'task-123',
          status: 'Success',
          file_id: 'file-9',
          base_resp: { status_code: 0 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          file: { download_url: 'https://cdn.example.com/video.mp4' },
          base_resp: { status_code: 0 },
        }),
      } as Response)

    const status = await minimaxVideo.getStatus('task-123', 'test-api-key')
    expect(status).toEqual({ status: 'success', videoUrl: 'https://cdn.example.com/video.mp4' })
    expect(mockFetch.mock.calls[1][0]).toBe(
      'https://api.minimax.io/v1/files/retrieve?file_id=file-9'
    )
  })

  it('reports failed status', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        task_id: 'task-123',
        status: 'Fail',
        base_resp: { status_code: 0, status_msg: 'generation failed' },
      }),
    } as Response)

    const status = await minimaxVideo.getStatus('task-123', 'test-api-key')
    expect(status).toEqual({ status: 'failed', error: 'generation failed' })
  })
})
