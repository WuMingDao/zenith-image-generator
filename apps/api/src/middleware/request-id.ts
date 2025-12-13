/**
 * Request ID Middleware
 */

import type { MiddlewareHandler } from 'hono'

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Request ID middleware
 * Assigns a unique ID to each request for logging and tracing
 */
export const requestId: MiddlewareHandler = async (c, next) => {
  // Use existing request ID from header if provided, otherwise generate new one
  const id = c.req.header('X-Request-ID') || generateRequestId()
  c.set('requestId', id)

  await next()

  // Add request ID to response header
  c.res.headers.set('X-Request-ID', id)
}
