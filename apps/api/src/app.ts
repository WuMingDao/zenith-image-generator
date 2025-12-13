/**
 * Z-Image API - Platform Agnostic Hono App
 *
 * This module exports a platform-agnostic Hono app that can be used
 * with any runtime (Node.js, Cloudflare Workers, Deno, Bun, etc.)
 */

import {
  Errors,
  type GenerateRequest,
  type GenerateSuccessResponse,
  HF_SPACES,
  type ImageDetails,
  MODEL_CONFIGS,
  PROVIDER_CONFIGS,
  type ProviderType,
  getModelByProviderAndId,
  getModelsByProvider,
  isAllowedImageUrl,
  validateDimensions,
  validatePrompt,
  validateScale,
  validateSteps,
} from '@z-image/shared'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import {
  bodyLimit,
  errorHandler,
  notFoundHandler,
  requestId,
  requestLogger,
  securityHeaders,
  sendError,
  timeout,
} from './middleware'
import { getProvider, hasProvider } from './providers'
import { callGradioApi, formatDimensions, formatDuration } from './utils'

export interface AppConfig {
  corsOrigins?: string[]
}

export function createApp(config: AppConfig = {}) {
  const app = new Hono().basePath('/api')

  // Default CORS origins for development
  const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000']
  const origins = config.corsOrigins || defaultOrigins

  // Pre-create CORS middleware instance (optimization)
  const corsMiddleware = cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-API-Key', 'X-HF-Token', 'X-MS-Token', 'X-Request-ID'],
  })

  // Global error handlers
  app.onError(errorHandler)
  app.notFound(notFoundHandler)

  // Apply middleware in correct order
  app.use('/*', requestId) // Request ID first for logging
  app.use('/*', corsMiddleware)
  app.use('/*', securityHeaders)
  app.use('/*', requestLogger)

  // Apply timeout to all generation endpoints (120 seconds)
  app.use('/generate', timeout(120000))
  app.use('/generate-hf', timeout(120000))
  app.use('/upscale', timeout(120000))

  // Apply body limit (50KB for most endpoints)
  app.use('/generate', bodyLimit(50 * 1024))
  app.use('/generate-hf', bodyLimit(50 * 1024))
  app.use('/upscale', bodyLimit(50 * 1024))

  // Health check
  app.get('/', (c) => {
    return c.json({
      status: 'ok',
      message: 'Z-Image API is running',
      timestamp: new Date().toISOString(),
    })
  })

  // Get all providers
  app.get('/providers', (c) => {
    const providers = Object.values(PROVIDER_CONFIGS).map((p) => ({
      id: p.id,
      name: p.name,
      requiresAuth: p.requiresAuth,
      authHeader: p.authHeader,
    }))
    return c.json({ providers })
  })

  // Get models by provider
  app.get('/providers/:provider/models', (c) => {
    const provider = c.req.param('provider') as ProviderType
    if (!PROVIDER_CONFIGS[provider]) {
      return c.json({ error: `Invalid provider: ${provider}` }, 400)
    }
    const models = getModelsByProvider(provider).map((m) => ({
      id: m.id,
      name: m.name,
      features: m.features,
    }))
    return c.json({ provider, models })
  })

  // Get all models
  app.get('/models', (c) => {
    const models = MODEL_CONFIGS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      features: m.features,
    }))
    return c.json({ models })
  })

  // Unified generate endpoint
  app.post('/generate', async (c) => {
    let body: GenerateRequest & { negative_prompt?: string; num_inference_steps?: number }
    try {
      body = await c.req.json()
    } catch {
      return sendError(c, Errors.invalidParams('body', 'Invalid JSON body'))
    }

    // Determine provider (default to gitee for backward compatibility)
    const providerId = body.provider || 'gitee'
    if (!hasProvider(providerId)) {
      return sendError(c, Errors.invalidProvider(providerId))
    }

    // Get auth token based on provider
    const providerConfig = PROVIDER_CONFIGS[providerId]
    const authToken = c.req.header(providerConfig?.authHeader || 'X-API-Key')

    // Check auth requirement
    if (providerConfig?.requiresAuth && !authToken) {
      return sendError(c, Errors.authRequired(providerConfig.name))
    }

    // Validate prompt
    const promptValidation = validatePrompt(body.prompt)
    if (!promptValidation.valid) {
      return sendError(c, Errors.invalidPrompt(promptValidation.error || 'Invalid prompt'))
    }

    // Validate dimensions
    const width = body.width ?? 1024
    const height = body.height ?? 1024
    const dimensionsValidation = validateDimensions(width, height)
    if (!dimensionsValidation.valid) {
      return sendError(
        c,
        Errors.invalidDimensions(dimensionsValidation.error || 'Invalid dimensions')
      )
    }

    // Validate steps
    const steps = body.steps ?? body.num_inference_steps ?? 9
    const stepsValidation = validateSteps(steps)
    if (!stepsValidation.valid) {
      return sendError(c, Errors.invalidParams('steps', stepsValidation.error || 'Invalid steps'))
    }

    try {
      const startTime = Date.now()
      const provider = getProvider(providerId as ProviderType)
      const result = await provider.generate({
        model: body.model,
        prompt: body.prompt,
        negativePrompt: body.negativePrompt || body.negative_prompt,
        width,
        height,
        steps,
        seed: body.seed,
        guidanceScale: body.guidanceScale,
        authToken,
      })
      const duration = Date.now() - startTime

      // Get model and provider display names
      const modelConfig = getModelByProviderAndId(providerId as ProviderType, body.model)
      const modelName = modelConfig?.name || body.model
      const providerName = providerConfig?.name || providerId

      const imageDetails: ImageDetails = {
        url: result.url,
        provider: providerName,
        model: modelName,
        dimensions: formatDimensions(width, height),
        duration: formatDuration(duration),
        seed: result.seed,
        steps,
        prompt: body.prompt,
        negativePrompt: body.negativePrompt || body.negative_prompt || '',
      }

      const response: GenerateSuccessResponse = { imageDetails }
      return c.json(response)
    } catch (err) {
      return sendError(c, err)
    }
  })

  // Legacy HuggingFace endpoint (for backward compatibility)
  app.post('/generate-hf', async (c) => {
    let body: {
      prompt: string
      width?: number
      height?: number
      model?: string
      seed?: number
      steps?: number
    }
    try {
      body = await c.req.json()
    } catch {
      return sendError(c, Errors.invalidParams('body', 'Invalid JSON body'))
    }

    // Validate prompt
    const promptValidation = validatePrompt(body.prompt)
    if (!promptValidation.valid) {
      return sendError(c, Errors.invalidPrompt(promptValidation.error || 'Invalid prompt'))
    }

    const hfToken = c.req.header('X-HF-Token')
    const width = body.width ?? 1024
    const height = body.height ?? 1024
    const modelId = body.model || 'z-image-turbo'
    const steps = body.steps ?? 9

    const dimensionsValidation = validateDimensions(width, height)
    if (!dimensionsValidation.valid) {
      return sendError(
        c,
        Errors.invalidDimensions(dimensionsValidation.error || 'Invalid dimensions')
      )
    }

    try {
      const startTime = Date.now()
      const provider = getProvider('huggingface')
      const result = await provider.generate({
        model: modelId,
        prompt: body.prompt,
        width,
        height,
        steps,
        seed: body.seed,
        authToken: hfToken,
      })
      const duration = Date.now() - startTime

      // Get model display name
      const modelConfig = getModelByProviderAndId('huggingface', modelId)
      const modelName = modelConfig?.name || modelId

      const imageDetails: ImageDetails = {
        url: result.url,
        provider: 'HuggingFace',
        model: modelName,
        dimensions: formatDimensions(width, height),
        duration: formatDuration(duration),
        seed: result.seed,
        steps,
        prompt: body.prompt,
        negativePrompt: '',
      }

      const response: GenerateSuccessResponse = { imageDetails }
      return c.json(response)
    } catch (err) {
      return sendError(c, err)
    }
  })

  // Upscale endpoint
  app.post('/upscale', async (c) => {
    let body: { url: string; scale?: number }
    try {
      body = await c.req.json()
    } catch {
      return sendError(c, Errors.invalidParams('body', 'Invalid JSON body'))
    }

    if (!body.url || typeof body.url !== 'string') {
      return sendError(c, Errors.invalidParams('url', 'url is required'))
    }

    if (!isAllowedImageUrl(body.url)) {
      return sendError(c, Errors.invalidParams('url', 'URL not allowed'))
    }

    const hfToken = c.req.header('X-HF-Token')
    const scale = body.scale ?? 4

    const scaleValidation = validateScale(scale)
    if (!scaleValidation.valid) {
      return sendError(c, Errors.invalidParams('scale', scaleValidation.error || 'Invalid scale'))
    }

    try {
      const data = await callGradioApi(
        HF_SPACES.upscaler,
        'realesrgan',
        [
          { path: body.url, meta: { _type: 'gradio.FileData' } },
          'RealESRGAN_x4plus',
          0.5,
          false,
          scale,
        ],
        hfToken
      )
      const result = data as Array<{ url?: string }>
      const imageUrl = result[0]?.url
      if (!imageUrl) {
        return sendError(c, Errors.generationFailed('HuggingFace Upscaler', 'No image returned'))
      }
      return c.json({ url: imageUrl })
    } catch (err) {
      return sendError(c, err)
    }
  })

  return app
}

// Default app instance for simple usage
const app = createApp()

export default app
