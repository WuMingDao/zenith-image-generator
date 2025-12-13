/**
 * Global Error Handler Middleware
 */

import { ApiError, type ApiErrorResponse, Errors } from '@z-image/shared'
import type { Context, ErrorHandler, NotFoundHandler } from 'hono'

/**
 * Convert any error to ApiError
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    return err
  }
  if (err instanceof Error) {
    // Check for timeout errors
    if (err.message.includes('timeout') || err.message.includes('Timeout')) {
      return Errors.timeout('API')
    }
    return Errors.unknown(err.message)
  }
  return Errors.unknown('An unknown error occurred')
}

/**
 * Send error response helper
 */
export function sendError(c: Context, err: unknown): Response {
  const apiError = toApiError(err)
  const response: ApiErrorResponse = apiError.toResponse()
  return c.json(response, apiError.statusCode as 400 | 401 | 429 | 500 | 502 | 504)
}

/**
 * Global error handler for Hono
 */
export const errorHandler: ErrorHandler = (err, c) => {
  // Log error with request ID if available
  const requestId = c.get('requestId') || 'unknown'
  console.error(`[${requestId}] Unhandled error:`, err)

  return sendError(c, err)
}

/**
 * Not found handler for Hono
 */
export const notFoundHandler: NotFoundHandler = (c) => {
  return c.json(
    {
      error: 'Not found',
      code: 'NOT_FOUND',
    },
    404
  )
}
