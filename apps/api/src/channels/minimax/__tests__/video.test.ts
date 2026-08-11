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

  it('creates a v2 image-to-video task with the default model', async () => {
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
    expect(call[0]).toBe('https://api.minimax.io/v2/video_generation')
    expect(call[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-api-key',
      }),
    })
    const body = JSON.parse(call[1]?.body as string)
    expect(body).toEqual({
      model: 'MiniMax-H3',
      content: [
        { type: 'text', text: 'pan left' },
        {
          type: 'image_url',
          image_url: { url: 'https://example.com/frame.png' },
          role: 'first_frame',
        },
      ],
      resolution: '2K',
      duration: 5,
      ratio: 'adaptive',
    })
  })

  it('keeps legacy models on the v1 request format', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ task_id: 'task-v1', base_resp: { status_code: 0 } }),
    } as Response)

    await minimaxVideo.createTask(
      {
        imageUrl: 'https://example.com/frame.png',
        prompt: 'pan left',
        width: 1280,
        height: 720,
        model: 'MiniMax-Hailuo-2.3',
      },
      'test-api-key'
    )

    expect(mockFetch.mock.calls[0][0]).toBe('https://api.minimax.io/v1/video_generation')
    expect(JSON.parse(mockFetch.mock.calls[0][1]?.body as string)).toEqual({
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
        {
          imageUrl: 'https://example.com/frame.png',
          prompt: 'pan left',
          width: 1280,
          height: 720,
          model: 'MiniMax-Hailuo-2.3',
        },
        'bad-key'
      )
    ).rejects.toMatchObject({ code: ApiErrorCode.AUTH_INVALID })
  })

  it('maps v2 running tasks to processing', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        task: { id: 'task-123', status: 'running' },
      }),
    } as Response)

    const status = await minimaxVideo.getStatus('task-123', 'test-api-key')
    expect(status).toEqual({ status: 'processing' })
    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://api.minimax.io/v2/query/video_generation/task-123'
    )
  })

  it('returns the download url from a successful v2 query', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        task: {
          id: 'task-123',
          status: 'succeeded',
          content: { url: 'https://cdn.example.com/video.mp4' },
        },
      }),
    } as Response)

    const status = await minimaxVideo.getStatus('task-123', 'test-api-key')
    expect(status).toEqual({ status: 'success', videoUrl: 'https://cdn.example.com/video.mp4' })
  })

  it('falls back to v1 polling and resolves the download url', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'invalid task_id' } }),
      } as Response)
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
      'https://api.minimax.io/v1/query/video_generation?task_id=task-123'
    )
    expect(mockFetch.mock.calls[2][0]).toBe(
      'https://api.minimax.io/v1/files/retrieve?file_id=file-9'
    )
  })

  it('reports failed v2 status', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        task: {
          id: 'task-123',
          status: 'failed',
          error: { message: 'generation failed' },
        },
      }),
    } as Response)

    const status = await minimaxVideo.getStatus('task-123', 'test-api-key')
    expect(status).toEqual({ status: 'failed', error: 'generation failed' })
  })
})
