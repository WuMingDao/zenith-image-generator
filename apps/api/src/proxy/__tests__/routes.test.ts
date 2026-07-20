/**
 * Proxy Routes Tests (/proxy/image)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../app'

describe('Proxy routes', () => {
  const app = createApp()

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GET /proxy/image streams an image from an allowed Gradio host', async () => {
    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'image/png' }),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(imageBytes)
          controller.close()
        },
      }),
    } as Response)

    const targetUrl = 'https://mrfakename-z-image-turbo.hf.space/gradio_api/file=/tmp/gradio/abc/image.png'
    const res = await app.request(`/proxy/image?url=${encodeURIComponent(targetUrl)}`)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(targetUrl)
  })

  it('returns 400 when url parameter is missing', async () => {
    const res = await app.request('/proxy/image')
    expect(res.status).toBe(400)
  })

  it('returns 400 when url is invalid', async () => {
    const res = await app.request('/proxy/image?url=not-a-url')
    expect(res.status).toBe(400)
  })

  it('returns 400 when host is not in allow-list (SSRF protection)', async () => {
    const targetUrl = 'https://evil.example.com/gradio_api/file=/tmp/gradio/abc/image.png'
    const res = await app.request(`/proxy/image?url=${encodeURIComponent(targetUrl)}`)
    expect(res.status).toBe(400)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it('returns 400 when url is not a Gradio file URL', async () => {
    const targetUrl = 'https://mrfakename-z-image-turbo.hf.space/regular/path/image.png'
    const res = await app.request(`/proxy/image?url=${encodeURIComponent(targetUrl)}`)
    expect(res.status).toBe(400)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it('returns 502 when upstream returns an error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response)

    const targetUrl = 'https://mrfakename-z-image-turbo.hf.space/gradio_api/file=/tmp/gradio/expired/image.png'
    const res = await app.request(`/proxy/image?url=${encodeURIComponent(targetUrl)}`)
    expect(res.status).toBe(502)
  })

  it('allows ModelScope global host', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      body: new ReadableStream({ start(c) { c.close() } }),
    } as Response)

    const targetUrl = 'https://api-inference.modelscope.ai/gradio_api/file=/tmp/gradio/abc/image.jpg'
    const res = await app.request(`/proxy/image?url=${encodeURIComponent(targetUrl)}`)
    expect(res.status).toBe(200)
  })
})
