/**
 * OpenAI-Compatible Routes Tests (/v1)
 * Tests with mocked fetch - no real API calls
 */

import { ApiErrorCode } from '@z-image/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app'

describe('OpenAI-compatible routes', () => {
  const app = createApp()

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POST /v1/images/generations defaults to HuggingFace z-image-turbo', async () => {
    const mockFetch = vi.mocked(fetch)

    // Gradio queue
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ event_id: 'evt-1' }),
    } as Response)

    // Gradio result (SSE)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'event: complete\ndata: [{"url":"https://hf.space/img.png"}, 42]\n\n',
    } as Response)

    const res = await app.request('/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'a cat', size: '1024x1024' }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as { created: number; data: Array<{ url: string }> }
    expect(json.created).toBeTypeOf('number')
    // Non-Gradio URLs pass through unchanged
    expect(json.data[0]?.url).toBe('https://hf.space/img.png')

    expect(mockFetch.mock.calls[0]?.[0]).toContain('luca115-z-image-turbo.hf.space')
  })

  it('POST /v1/images/generations wraps Gradio file URLs behind /proxy/image', async () => {
    const mockFetch = vi.mocked(fetch)

    // Gradio queue
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ event_id: 'evt-2' }),
    } as Response)

    // Gradio result (SSE) with a real Gradio file URL
    const gradioUrl =
      'https://mrfakename-z-image-turbo.hf.space/gradio_api/file=/tmp/gradio/abc123/image.png'
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `event: complete\ndata: [{"url":"${gradioUrl}"}, 7]\n\n`,
    } as Response)

    const res = await app.request('/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'a dog', size: '1024x1024' }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: Array<{ url: string }> }
    const returnedUrl = json.data[0]?.url
    // URL should be a fully-qualified proxy URL (includes origin from request)
    const parsed = new URL(returnedUrl!)
    expect(parsed.pathname).toBe('/proxy/image')
    // The original Gradio URL must be fully recoverable from the url= param
    expect(parsed.searchParams.get('url')).toBe(gradioUrl)
  })

  it('POST /v1/images/generations supports gitee/ model prefix + gitee: token', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ url: 'https://example.com/gitee.png' }] }),
    } as Response)

    const res = await app.request('/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer gitee:test-api-key',
      },
      body: JSON.stringify({
        model: 'gitee/z-image-turbo',
        prompt: 'a bird',
        size: '1024x768',
        negative_prompt: 'blurry',
      }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: Array<{ url: string }> }
    expect(json.data[0]?.url).toBe('https://example.com/gitee.png')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://ai.gitee.com/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      })
    )

    const body = JSON.parse((mockFetch.mock.calls[0]?.[1]?.body as string) || '{}')
    expect(body.width).toBe(1024)
    expect(body.height).toBe(768)
    expect(body.negative_prompt).toBe('blurry')
  })

  it('POST /v1/images/generations supports ms/ model prefix + ms: token', async () => {
    const mockFetch = vi.mocked(fetch)

    // submit
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ task_id: 'task-123' }),
    } as Response)

    // poll
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ task_status: 'SUCCEED', output_images: ['https://example.com/ms.png'] }),
    } as Response)

    const res = await app.request('/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ms:token-12345678',
      },
      body: JSON.stringify({
        model: 'ms/flux-2',
        prompt: 'a robot',
      }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: Array<{ url: string }> }
    expect(json.data[0]?.url).toBe('https://example.com/ms.png')
  })

  it('POST /v1/images/generations rejects n != 1', async () => {
    const res = await app.request('/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'a cat', n: 2 }),
    })

    expect(res.status).toBe(400)
    const json = (await res.json()) as { error?: { code?: string } }
    expect(json.error?.code).toBe(ApiErrorCode.INVALID_PARAMS)
  })

  it('GET /v1/models returns OpenAI-like list', async () => {
    const res = await app.request('/v1/models')
    expect(res.status).toBe(200)

    const json = (await res.json()) as { object: string; data: Array<{ id: string }> }
    expect(json.object).toBe('list')
    expect(json.data.map((m) => m.id)).toContain('z-image-turbo')
    expect(json.data.map((m) => m.id)).toContain('gitee/z-image-turbo')
    expect(json.data.map((m) => m.id)).toContain('ms/flux-2')
  })

  it('POST /v1/chat/completions returns OpenAI-like chat completion', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'optimized prompt' } }] }),
    } as Response)

    const res = await app.request('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'pollinations/openai-fast',
        messages: [
          { role: 'system', content: 'You are a prompt optimizer' },
          { role: 'user', content: 'a cat' },
        ],
        max_tokens: 100,
      }),
    })

    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      object: string
      choices: Array<{ message: { content: string } }>
    }
    expect(json.object).toBe('chat.completion')
    expect(json.choices[0]?.message?.content).toBe('optimized prompt')
  })
})
