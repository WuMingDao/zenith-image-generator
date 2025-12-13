/**
 * Body Limit Middleware
 */

import { Errors } from '@z-image/shared'
import type { MiddlewareHandler } from 'hono'
import { sendError } from './error-handler'

/**
 * Create body limit middleware
 * @param maxSize Maximum body size in bytes (default: 50KB)
 */
export function bodyLimit(maxSize = 50 * 1024): MiddlewareHandler {
  return async (c, next) => {
    const contentLength = c.req.header('Content-Length')

    if (contentLength) {
      const size = Number.parseInt(contentLength, 10)
      if (size > maxSize) {
        return sendError(
          c,
          Errors.invalidParams(
            'body',
            `Request body too large. Maximum size: ${Math.round(maxSize / 1024)}KB`
          )
        )
      }
    }

    await next()
  }
}
