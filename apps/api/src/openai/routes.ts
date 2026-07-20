import { Errors, getModelsByProvider } from '@z-image/shared'
import { Hono } from 'hono'
import { ensureCustomChannelsInitialized, getChannel, getImageChannel } from '../channels'
import { parseTokens, runWithTokenRotation } from '../core/token-manager'
import { bodyLimit, rateLimitPresets, sendError, timeout } from '../middleware'
import { convertRequest, convertResponse, parseBearerToken } from './adapter'
import { handleChatCompletion } from './chat'
import { resolveModel } from './model-resolver'
import type { OpenAIImageRequest, OpenAIModelsListResponse } from './types'

function resolveImageChannel(modelParam?: string): { channelId: string; model: string } {
  const raw = (modelParam || '').trim()
  if (raw.startsWith('custom/')) {
    const rest = raw.slice('custom/'.length)
    const firstSlash = rest.indexOf('/')
    if (firstSlash > 0) {
      const channelId = rest.slice(0, firstSlash).trim()
      const model = rest.slice(firstSlash + 1).trim()
      if (channelId && model) return { channelId, model }
      if (channelId) return { channelId, model }
    }
  }

  const resolved = resolveModel(modelParam)
  return { channelId: resolved.provider, model: resolved.model }
}

function listModels(): OpenAIModelsListResponse {
  const created = 1700000000
  const giteeModels = getModelsByProvider('gitee').map((m) => m.id)
  const modelscopeModels = getModelsByProvider('modelscope').map((m) => m.id)
  const modelscopeGlobalModels = getModelsByProvider('modelscope-global').map((m) => m.id)
  const a4fModels = getModelsByProvider('a4f').map((m) => m.id)

  return {
    object: 'list',
    data: [
      ...['z-image-turbo', 'qwen-image-fast', 'ovis-image', 'flux-1-schnell'].map((id) => ({
        id,
        object: 'model' as const,
        created,
        owned_by: 'huggingface',
      })),
      ...giteeModels.flatMap((id) => {
        const entries = [{ id: `gitee/${id}`, owned_by: 'gitee' }]
        if (id === 'Qwen-Image') entries.push({ id: 'gitee/qwen-image', owned_by: 'gitee' })
        if (id === 'FLUX_1-Krea-dev')
          entries.push({ id: 'gitee/flux-1-krea-dev', owned_by: 'gitee' })
        if (id === 'FLUX.1-dev') entries.push({ id: 'gitee/flux-1-dev', owned_by: 'gitee' })
        return entries.map((e) => ({ ...e, object: 'model' as const, created }))
      }),
      ...modelscopeModels.flatMap((id) => {
        const entries = [{ id: `ms/${id}`, owned_by: 'modelscope' }]
        if (id === 'Tongyi-MAI/Z-Image-Turbo')
          entries.push({ id: 'ms/z-image-turbo', owned_by: 'modelscope' })
        if (id === 'black-forest-labs/FLUX.2-dev')
          entries.push({ id: 'ms/flux-2', owned_by: 'modelscope' })
        if (id === 'black-forest-labs/FLUX.1-Krea-dev')
          entries.push({ id: 'ms/flux-1-krea-dev', owned_by: 'modelscope' })
        if (id === 'MusePublic/489_ckpt_FLUX_1')
          entries.push({ id: 'ms/flux-1', owned_by: 'modelscope' })
        return entries.map((e) => ({ ...e, object: 'model' as const, created }))
      }),
      ...modelscopeGlobalModels.flatMap((id) => {
        const entries = [{ id: `msg/${id}`, owned_by: 'modelscope-global' }]
        if (id === 'Tongyi-MAI/Z-Image-Turbo')
          entries.push({ id: 'msg/z-image-turbo', owned_by: 'modelscope-global' })
        if (id === 'black-forest-labs/FLUX.2-dev')
          entries.push({ id: 'msg/flux-2', owned_by: 'modelscope-global' })
        if (id === 'black-forest-labs/FLUX.1-Krea-dev')
          entries.push({ id: 'msg/flux-1-krea-dev', owned_by: 'modelscope-global' })
        if (id === 'MusePublic/489_ckpt_FLUX_1')
          entries.push({ id: 'msg/flux-1', owned_by: 'modelscope-global' })
        return entries.map((e) => ({ ...e, object: 'model' as const, created }))
      }),
      ...a4fModels.map((id) => ({
        id: `a4f/${id}`,
        object: 'model' as const,
        created,
        owned_by: 'a4f',
      })),
    ],
  }
}

export function registerOpenAIRoutes(app: Hono) {
  const v1 = new Hono().basePath('/v1')

  // Base middleware for all /v1 routes.
  v1.use('/*', timeout(120000))

  v1.post('/images/generations', bodyLimit(50 * 1024), rateLimitPresets.generate, async (c) => {
    ensureCustomChannelsInitialized(
      c.env as unknown as Record<string, string | undefined> | undefined
    )

    let body: OpenAIImageRequest
    try {
      body = (await c.req.json()) as OpenAIImageRequest
    } catch {
      return sendError(c, Errors.invalidParams('body', 'Invalid JSON body'))
    }

    if (!body?.prompt) {
      return sendError(c, Errors.invalidPrompt('Prompt is required'))
    }

    if (body.n !== undefined && body.n !== 1) {
      return sendError(c, Errors.invalidParams('n', 'Only n=1 is supported'))
    }

    if (body.response_format !== undefined && body.response_format !== 'url') {
      return sendError(
        c,
        Errors.invalidParams('response_format', "Only response_format='url' is supported")
      )
    }

    const { channelId, model } = resolveImageChannel(body.model)
    const auth = parseBearerToken(c.req.header('Authorization'))

    if (auth.providerHint && auth.providerHint !== channelId) {
      return sendError(
        c,
        Errors.invalidParams(
          'Authorization',
          'Token prefix does not match requested model provider'
        )
      )
    }

    const channel = getChannel(channelId)
    const imageChannel = getImageChannel(channelId)
    if (!channel || !imageChannel) {
      return sendError(c, Errors.invalidProvider(channelId))
    }

    const resolvedModel = model || channel.config.imageModels?.[0]?.id

    const allowAnonymous =
      channel.config.auth.type === 'none' || channel.config.auth.optional === true
    const headerTokens = parseTokens(auth.token)
    const tokens = headerTokens.length ? headerTokens : channel.config.tokens || []
    if (!allowAnonymous && tokens.length === 0) {
      return sendError(c, Errors.authRequired(channel.name))
    }

    try {
      const internalReq = convertRequest(body)
      const result = await runWithTokenRotation(
        channel.id,
        tokens,
        (token) => imageChannel.generate({ ...internalReq, model: resolvedModel }, token),
        { allowAnonymous }
      )
      // Return raw URL for compatibility with OpenAI "url" response_format.
      return c.json(convertResponse(result))
    } catch (err) {
      return sendError(c, err)
    }
  })

  v1.get('/models', rateLimitPresets.readonly, (c) => c.json(listModels()))

  v1.post(
    '/chat/completions',
    bodyLimit(50 * 1024),
    rateLimitPresets.optimize,
    handleChatCompletion
  )

  app.route('/', v1)
}
