import { describe, expect, it } from 'vitest'
import {
  GRADIO_FILE_PATH_MARKER,
  isAllowedProxyHost,
  isGradioFileUrl,
  PROXY_ALLOWED_HOSTS,
  unwrapGradioUrl,
  wrapGradioUrl,
} from './gradio-proxy'

describe('gradio-proxy utilities', () => {
  describe('isGradioFileUrl', () => {
    it('returns true for URLs containing the Gradio file marker', () => {
      expect(
        isGradioFileUrl(
          'https://mrfakename-z-image-turbo.hf.space/gradio_api/file=/tmp/gradio/abc/image.png'
        )
      ).toBe(true)
    })

    it('returns false for regular HTTP URLs', () => {
      expect(isGradioFileUrl('https://example.com/image.png')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isGradioFileUrl('')).toBe(false)
    })
  })

  describe('isAllowedProxyHost', () => {
    it('allows HuggingFace Space subdomains', () => {
      expect(isAllowedProxyHost('mrfakename-z-image-turbo.hf.space')).toBe(true)
      expect(isAllowedProxyHost('user-any-space.hf.space')).toBe(true)
    })

    it('allows ModelScope hosts', () => {
      expect(isAllowedProxyHost('api-inference.modelscope.cn')).toBe(true)
      expect(isAllowedProxyHost('api-inference.modelscope.ai')).toBe(true)
    })

    it('rejects arbitrary hosts (SSRF protection)', () => {
      expect(isAllowedProxyHost('example.com')).toBe(false)
      expect(isAllowedProxyHost('localhost')).toBe(false)
      expect(isAllowedProxyHost('169.254.169.254')).toBe(false)
      expect(isAllowedProxyHost('evil.com')).toBe(false)
    })

    it('does not allow suffix-only matches without dot boundary', () => {
      // .hf.space must match as a suffix with the dot, so "notahf.space" should not match
      expect(isAllowedProxyHost('notahf.space')).toBe(false)
    })
  })

  describe('wrapGradioUrl', () => {
    it('wraps Gradio file URLs behind /proxy/image (relative)', () => {
      const original = 'https://mrfakename-z-image-turbo.hf.space/gradio_api/file=/tmp/gradio/abc/image.png'
      const wrapped = wrapGradioUrl(original)
      expect(wrapped.startsWith('/proxy/image?url=')).toBe(true)
      expect(decodeURIComponent(wrapped.split('url=')[1])).toBe(original)
    })

    it('wraps with absolute URL when baseUrl is provided', () => {
      const original = 'https://mrfakename-z-image-turbo.hf.space/gradio_api/file=/tmp/gradio/abc/image.png'
      const wrapped = wrapGradioUrl(original, 'https://api.example.com')
      expect(wrapped.startsWith('https://api.example.com/proxy/image?url=')).toBe(true)
    })

    it('handles baseUrl with trailing slash', () => {
      const original = 'https://space.hf.space/gradio_api/file=/tmp/x.png'
      const wrapped = wrapGradioUrl(original, 'https://api.example.com/')
      expect(wrapped).toBe(`https://api.example.com/proxy/image?url=${encodeURIComponent(original)}`)
    })

    it('returns non-Gradio URLs unchanged regardless of baseUrl', () => {
      const url = 'https://example.com/image.png'
      expect(wrapGradioUrl(url, 'https://api.example.com')).toBe(url)
    })

    it('returns non-Gradio CDN URLs unchanged', () => {
      const url = 'https://cdn.example.com/path/to/image.jpg'
      expect(wrapGradioUrl(url)).toBe(url)
    })

    it('properly encodes special characters in the URL', () => {
      const original = 'https://space.hf.space/gradio_api/file=/tmp/gradio/abc def/image.png'
      const wrapped = wrapGradioUrl(original)
      expect(wrapped).toContain(encodeURIComponent(original))
    })

    it('preserves the full original URL for later direct retrieval', () => {
      const original = 'https://mrfakename-z-image-turbo.hf.space/gradio_api/file=/tmp/gradio/abc123/image.png'
      const wrapped = wrapGradioUrl(original, 'https://api.example.com')
      // The original URL must be fully recoverable from the wrapped URL
      expect(unwrapGradioUrl(wrapped)).toBe(original)
    })
  })

  describe('unwrapGradioUrl', () => {
    it('extracts the original URL from a wrapped proxy URL', () => {
      const original = 'https://space.hf.space/gradio_api/file=/tmp/gradio/abc/image.png'
      const wrapped = wrapGradioUrl(original, 'https://api.example.com')
      expect(unwrapGradioUrl(wrapped)).toBe(original)
    })

    it('extracts the original URL from a relative wrapped URL', () => {
      const original = 'https://space.hf.space/gradio_api/file=/tmp/gradio/abc/image.png'
      const wrapped = wrapGradioUrl(original)
      expect(unwrapGradioUrl(wrapped)).toBe(original)
    })

    it('returns undefined for non-proxy URLs', () => {
      expect(unwrapGradioUrl('https://example.com/image.png')).toBeUndefined()
    })

    it('returns undefined when url param is missing', () => {
      expect(unwrapGradioUrl('/proxy/image')).toBeUndefined()
    })
  })

  describe('constants', () => {
    it('exports the Gradio file path marker', () => {
      expect(GRADIO_FILE_PATH_MARKER).toBe('/gradio_api/file=')
    })

    it('exports a non-empty allow-list', () => {
      expect(PROXY_ALLOWED_HOSTS.length).toBeGreaterThan(0)
    })
  })
})
