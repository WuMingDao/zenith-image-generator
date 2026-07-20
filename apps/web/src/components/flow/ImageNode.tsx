import { Handle, type NodeProps, Position } from '@xyflow/react'
import type { ImageDetails, OpenAIErrorResponse, OpenAIImageResponse } from '@z-image/shared'
import { AlertCircle, Download, Loader2, ZoomIn } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getDefaultModel,
  getModelsByProvider,
  loadSettings,
  type ProviderType,
} from '@/lib/constants'
import { loadTokensArray } from '@/lib/crypto'
import { saveToHistory } from '@/lib/historyStore'
import { getNextAvailableToken, isQuotaError, markTokenExhausted } from '@/lib/tokenRotation'
import type { ImageData } from '@/stores/flowStore'
import { useFlowStore } from '@/stores/flowStore'

interface ImageNodeProps extends NodeProps {
  data: ImageData
}

const MAX_RETRY_ATTEMPTS = 10

async function generateImageApiSingle(
  prompt: string,
  width: number,
  height: number,
  provider: ProviderType,
  token: string | null,
  model: string,
  seed: number
): Promise<ImageDetails> {
  const baseUrl = import.meta.env.VITE_API_URL || ''
  const { PROVIDER_CONFIGS } = await import('@/lib/constants')
  const providerConfig = PROVIDER_CONFIGS[provider]

  const start = Date.now()
  const res = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && {
        Authorization: `Bearer ${
          provider === 'gitee'
            ? `gitee:${token}`
            : provider === 'modelscope'
              ? `ms:${token}`
              : provider === 'modelscope-global'
                ? `msg:${token}`
                : provider === 'a4f'
                  ? `a4f:${token}`
                  : token
        }`,
      }),
    },
    body: JSON.stringify({
      prompt,
      model:
        provider === 'gitee'
          ? `gitee/${model}`
          : provider === 'modelscope'
            ? `ms/${model}`
            : provider === 'modelscope-global'
              ? `msg/${model}`
              : provider === 'a4f'
                ? `a4f/${model}`
                : model,
      size: `${width}x${height}`,
      steps: 9,
      seed,
      n: 1,
      response_format: 'url',
    }),
  })

  const json = (await res.json().catch(() => null)) as
    | OpenAIImageResponse
    | OpenAIErrorResponse
    | null
  if (!res.ok) {
    const error = new Error(
      (json as OpenAIErrorResponse | null)?.error?.message || 'Failed to generate'
    ) as Error & {
      status?: number
    }
    error.status = res.status
    throw error
  }

  const url = (json as OpenAIImageResponse | null)?.data?.[0]?.url
  if (!url) throw new Error('No image returned')

  const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`
  return {
    url,
    provider: providerConfig.name,
    model,
    dimensions: `${width} x ${height}`,
    duration,
    seed,
    steps: 9,
    prompt,
    negativePrompt: '',
  }
}

async function generateImageWithRotation(
  prompt: string,
  width: number,
  height: number,
  provider: ProviderType,
  allTokens: string[],
  model: string,
  seed: number,
  requiresAuth: boolean
): Promise<ImageDetails> {
  // No tokens configured
  if (allTokens.length === 0) {
    if (requiresAuth) {
      throw new Error('No API Token')
    }
    // Try anonymous
    return generateImageApiSingle(prompt, width, height, provider, null, model, seed)
  }

  // Token rotation loop
  let attempts = 0
  while (attempts < MAX_RETRY_ATTEMPTS) {
    const token = getNextAvailableToken(provider, allTokens)

    // All tokens exhausted
    if (!token) {
      if (!requiresAuth) {
        // Try anonymous
        return generateImageApiSingle(prompt, width, height, provider, null, model, seed)
      }
      throw new Error('All API tokens exhausted. Quota will reset tomorrow.')
    }

    try {
      return await generateImageApiSingle(prompt, width, height, provider, token, model, seed)
    } catch (err) {
      if (isQuotaError(err)) {
        markTokenExhausted(provider, token)
        attempts++
        continue
      }
      throw err
    }
  }

  throw new Error('Maximum retry attempts reached')
}

function ImageNodeComponent({ id, data }: ImageNodeProps) {
  const { t } = useTranslation()
  const { prompt, width, height, seed, imageUrl, duration, isLoading, error } = data
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef(0)
  const generatingRef = useRef(false)

  const updateImageGenerated = useFlowStore((s) => s.updateImageGenerated)
  const updateImageError = useFlowStore((s) => s.updateImageError)
  const setLightboxImage = useFlowStore((s) => s.setLightboxImage)
  const hasHydrated = useFlowStore((s) => s._hasHydrated)

  // Timer for elapsed time during generation
  useEffect(() => {
    if (!isLoading) return
    startTimeRef.current = Date.now()
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000)
    }, 100)
    return () => clearInterval(interval)
  }, [isLoading])

  // Generate image on mount (only after hydration)
  useEffect(() => {
    if (!hasHydrated) return // Wait for store hydration
    if (imageUrl || !isLoading) return
    if (generatingRef.current) return
    generatingRef.current = true

    ;(async () => {
      const settings = loadSettings()
      const provider = (settings.provider as ProviderType) ?? 'huggingface'

      // Validate model
      const validModels = getModelsByProvider(provider)
      const savedModel = settings.model || 'z-image-turbo'
      const selectedModel = validModels.some((m) => m.id === savedModel)
        ? savedModel
        : getDefaultModel(provider)

      // Load tokens array for rotation
      const tokens = await loadTokensArray(provider)

      const { PROVIDER_CONFIGS } = await import('@/lib/constants')
      const requiresAuth = PROVIDER_CONFIGS[provider].requiresAuth

      try {
        const imageDetails = await generateImageWithRotation(
          prompt,
          width,
          height,
          provider,
          tokens,
          selectedModel,
          seed,
          requiresAuth
        )

        // Save metadata-only history entry (no blob caching).
        saveToHistory({
          url: imageDetails.url,
          prompt,
          negativePrompt: '',
          providerId: provider,
          providerName: imageDetails.provider,
          modelId: selectedModel,
          modelName: imageDetails.model,
          width,
          height,
          steps: imageDetails.steps,
          seed: imageDetails.seed,
          duration: imageDetails.duration,
          source: 'flow',
        })

        updateImageGenerated(id, imageDetails.url, imageDetails.duration)
      } catch (err) {
        updateImageError(id, err instanceof Error ? err.message : 'Failed to generate')
      }
    })()
  }, [
    id,
    prompt,
    width,
    height,
    seed,
    imageUrl,
    isLoading,
    hasHydrated,
    updateImageGenerated,
    updateImageError,
  ])

  const handleDownload = async () => {
    if (!imageUrl) return

    try {
      const { downloadImage } = await import('@/lib/utils')
      await downloadImage(imageUrl, `zenith-${seed}-${Date.now()}.png`)
    } catch (e) {
      console.error('Failed to download image:', e)
    }
  }

  const handleDoubleClick = () => {
    if (imageUrl) {
      setLightboxImage(id)
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: React Flow node with double-click handler
    <div
      className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 w-[256px] h-[256px] group cursor-pointer"
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-500"
      />

      {isLoading ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-3" />
          <span className="text-zinc-400 font-mono text-lg">{elapsed.toFixed(1)}s</span>
          <span className="text-zinc-600 text-xs mt-1">{t('prompt.generating')}</span>
        </div>
      ) : error ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 p-4">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <span className="text-red-400 text-sm text-center">{error}</span>
        </div>
      ) : imageUrl ? (
        <>
          <img src={imageUrl} alt="Generated" className="w-full h-full object-cover" />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
            <ZoomIn className="w-8 h-8 text-white" />
            <span className="text-xs text-zinc-300">{t('flow.doubleClickEnlarge')}</span>

            {/* Download button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleDownload()
              }}
              className="absolute bottom-3 right-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Download size={16} />
            </button>
          </div>

          {/* Duration badge */}
          {duration && (
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-zinc-300">
              {duration}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

export const ImageNode = memo(ImageNodeComponent)
export default ImageNode
