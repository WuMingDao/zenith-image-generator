/**
 * Request Logger Middleware
 */

import type { MiddlewareHandler } from 'hono'

/**
 * Simple request logger middleware
 * Logs method, path, status, and duration
 */
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now()
  const method = c.req.method
  const path = c.req.path

  await next()

  const duration = Date.now() - start
  const status = c.res.status
  const requestId = c.get('requestId') || '-'

  // Color-coded status for development
  const statusColor = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅'

  console.log(`${statusColor} [${requestId}] ${method} ${path} ${status} ${duration}ms`)
}
