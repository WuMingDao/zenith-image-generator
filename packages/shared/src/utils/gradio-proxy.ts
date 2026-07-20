/**
 * Gradio file URL proxy utilities.
 *
 * Gradio-based providers (HuggingFace Spaces, ModelScope, etc.) return image URLs
 * in the form `https://<host>/gradio_api/file=<path>`. These URLs are often
 * inaccessible from the client browser because:
 *
 * 1. Gradio 6.20.0+ serves `/gradio_api/file=` via an SSRF-safe streaming proxy
 *    (CVE-2026-59806), which may reject requests from IPs that didn't initiate
 *    the generation request.
 * 2. `/tmp/gradio/` ephemeral files are cleaned up periodically.
 *
 * Solution: wrap these URLs behind our own `/proxy/image` endpoint so the
 * API layer (running on Cloudflare Workers) fetches the image on behalf of
 * the client, using the same IP that initiated the generation.
 */

/** Path marker that identifies a Gradio file-serving URL. */
export const GRADIO_FILE_PATH_MARKER = '/gradio_api/file='

/**
 * Hosts allowed for proxying. Only these hosts can be proxied through
 * the `/proxy/image` endpoint to prevent SSRF attacks.
 *
 * Entries starting with `.` match any subdomain (e.g. `.hf.space` matches
 * `user-space.hf.space`). Other entries must match exactly.
 */
export const PROXY_ALLOWED_HOSTS: readonly string[] = [
  '.hf.space', // HuggingFace Spaces (*.hf.space)
  'api-inference.modelscope.cn', // ModelScope
  'api-inference.modelscope.ai', // ModelScope Global
]

/**
 * Determine whether a URL is a Gradio file-serving URL that should be proxied.
 */
export function isGradioFileUrl(url: string): boolean {
  return url.includes(GRADIO_FILE_PATH_MARKER)
}

/**
 * Determine whether a hostname is in the proxy allow-list.
 */
export function isAllowedProxyHost(hostname: string): boolean {
  return PROXY_ALLOWED_HOSTS.some((h) =>
    h.startsWith('.') ? hostname.endsWith(h) : hostname === h
  )
}

/**
 * Wrap a Gradio file URL with our proxy endpoint.
 *
 * Non-Gradio URLs are returned unchanged. Gradio file URLs are encoded into
 * a `/proxy/image?url=...` path so the client fetches the image through our
 * API layer rather than directly from the provider.
 *
 * The original URL is always preserved verbatim in the `url` query parameter
 * (percent-encoded) so it can be extracted later for direct upstream access.
 *
 * @param originalUrl - The URL returned by the upstream model
 * @param baseUrl - Optional absolute origin (e.g. `https://api.example.com`)
 *                  to produce a fully-qualified URL. When omitted, a relative
 *                  path is returned.
 */
export function wrapGradioUrl(originalUrl: string, baseUrl?: string): string {
  if (!isGradioFileUrl(originalUrl)) return originalUrl
  const proxyPath = `/proxy/image?url=${encodeURIComponent(originalUrl)}`
  if (baseUrl) {
    // Ensure no trailing slash duplication
    return `${baseUrl.replace(/\/$/, '')}${proxyPath}`
  }
  return proxyPath
}

/**
 * Extract the original upstream URL from a wrapped proxy URL.
 *
 * Returns `undefined` if the input is not a wrapped proxy URL or doesn't
 * contain a decodable `url` parameter.
 */
export function unwrapGradioUrl(wrappedUrl: string): string | undefined {
  try {
    const parsed = new URL(wrappedUrl, 'http://placeholder.local')
    if (!parsed.pathname.startsWith('/proxy/image')) return undefined
    const original = parsed.searchParams.get('url')
    return original || undefined
  } catch {
    return undefined
  }
}
