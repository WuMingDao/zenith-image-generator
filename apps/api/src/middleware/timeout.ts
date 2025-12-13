/**
 * Timeout Middleware
 */

import { Errors } from '@z-image/shared'
import type { MiddlewareHandler } from 'hono'

/**
 * Create timeout middleware
 * @param timeoutMs Timeout in milliseconds (default: 120000ms = 2 minutes)
 */
export function timeout(timeoutMs = 120000): MiddlewareHandler {
  return async (_c, next) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      // Create a promise that rejects on timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(Errors.timeout('API'))
        })
      })

      // Race between the actual handler and timeout
      await Promise.race([next(), timeoutPromise])
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
