/**
 * Security Middleware
 */

import type { MiddlewareHandler } from 'hono'

/**
 * Security headers middleware
 * Adds essential security headers to responses
 */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next()

  // Prevent MIME type sniffing
  c.res.headers.set('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking
  c.res.headers.set('X-Frame-Options', 'DENY')

  // XSS protection (legacy browsers)
  c.res.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
}
