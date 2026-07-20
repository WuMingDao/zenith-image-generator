/**
 * Z-Image API - Hono App
 *
 * This app exposes only OpenAI-format endpoints under `/v1/*`.
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  errorHandler,
  notFoundHandler,
  requestId,
  requestLogger,
  securityHeaders,
} from './middleware'
import './channels'
import { registerOpenAIRoutes } from './openai/routes'
import { proxyRoutes } from './proxy/routes'

export interface AppConfig {
  corsOrigins?: string[]
}

export function createApp(config: AppConfig = {}) {
  const app = new Hono()

  app.onError(errorHandler)
  app.notFound(notFoundHandler)

  app.use('/*', requestId)
  app.use(
    '/*',
    cors({
      origin: config.corsOrigins || ['*'],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
  )
  app.use('/*', securityHeaders)
  app.use('/*', requestLogger)

  // Health check
  app.get('/', (c) => c.json({ status: 'ok' }))

  // Image proxy for Gradio file URLs (see packages/shared/src/utils/gradio-proxy.ts)
  app.route('/proxy', proxyRoutes)

  // OpenAI-compatible routes
  registerOpenAIRoutes(app)

  return app
}

// Default app instance for runtimes that expect a default export
const app = createApp()
export default app
