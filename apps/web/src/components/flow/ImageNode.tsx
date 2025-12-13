import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Download, Loader2, AlertCircle, ZoomIn } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImageData } from '@/stores/flowStore'
import { useFlowStore } from '@/stores/flowStore'
import { loadSettings, type ProviderType, getModelsByProvider, getDefaultModel } from '@/lib/constants'
import { loadAllTokens } from '@/lib/crypto'
import { storeBlob, getBlob, urlToBlob, blobToObjectUrl, blobToDataUrl, checkStorageLimit } from '@/lib/imageBlobStore'
import type { ImageDetails } from '@z-image/shared'

interface ImageNodeProps extends NodeProps {
  data: ImageData
}

interface GenerateApiResponse {
  error?: string
  imageDetails?: ImageDetails
}

async function generateImageApi(
  prompt: string,
  width: number,
  height: number,
  provider: ProviderType,
  token: string,
  model: string,
  seed: number
): Promise<ImageDetails> {
  const baseUrl = import.meta.env.VITE_API_URL || ''
  const { PROVIDER_CONFIGS } = await import('@/lib/constants')
  const providerConfig = PROVIDER_CONFIGS[provider]

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { [providerConfig.authHeader]: token }),
    },
    body: JSON.stringify({
      provider,
      prompt,
      model,
      width,
      height,
      steps: 9,
      seed,
    }),
  })

  const text = await res.text()
  if (!text) throw new Error('Empty response from server')

  let data: GenerateApiResponse
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Invalid response: ${text.slice(0, 100)}`)
  }

  if (!res.ok) throw new Error(data.error || 'Failed to generate')
  if (!data.imageDetails) throw new Error('No image details returned')
  return data.imageDetails
}

function ImageNodeComponent({ id, data }: ImageNodeProps) {
  const { t } = useTranslation()
  const { prompt, width, height, seed, imageUrl, imageBlobId, duration, isLoading, error } = data
  const [elapsed, setElapsed] = useState(0)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const startTimeRef = useRef(0)
  const generatingRef = useRef(false)
  const objectUrlRef = useRef<string | null>(null)

  const updateImageGenerated = useFlowStore((s) => s.updateImageGenerated)
  const updateImageError = useFlowStore((s) => s.updateImageError)
  const setLightboxImage = useFlowStore((s) => s.setLightboxImage)
  const setStorageLimitState = useFlowStore((s) => s.setStorageLimitState)
  const hasHydrated = useFlowStore((s) => s._hasHydrated)

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  // Load blob for display when we have a blobId
  useEffect(() => {
    if (!imageBlobId) {
      // Fallback to URL if no blob
      setDisplayUrl(imageUrl || null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const blob = await getBlob(imageBlobId)
        if (cancelled) return

        if (blob) {
          // Revoke previous object URL
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current)
          }
          const url = blobToObjectUrl(blob)
          objectUrlRef.current = url
          setDisplayUrl(url)
        } else {
          // Blob not found, fallback to URL
          setDisplayUrl(imageUrl || null)
        }
      } catch (e) {
        console.error('Failed to load blob:', e)
        setDisplayUrl(imageUrl || null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [imageBlobId, imageUrl])

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

      const tokens = await loadAllTokens()
      const token = tokens[provider]

      const { PROVIDER_CONFIGS } = await import('@/lib/constants')
      if (PROVIDER_CONFIGS[provider].requiresAuth && !token) {
        updateImageError(id, 'No API Token')
        return
      }

      try {
        const imageDetails = await generateImageApi(
          prompt,
          width,
          height,
          provider,
          token,
          selectedModel,
          seed
        )

        // Fetch image and store as blob
        let blobId: string | undefined
        try {
          const blob = await urlToBlob(imageDetails.url)

          // Check storage limit before storing
          const limitCheck = await checkStorageLimit(blob.size)
          if (limitCheck?.needsCleanup) {
            // Storage limit reached - show modal
            setStorageLimitState({
              needsCleanup: true,
              reason: limitCheck.reason,
              currentCount: limitCheck.currentCount,
              currentSizeMB: limitCheck.currentSizeMB,
              pendingImageId: id,
              pendingBlob: blob,
            })
            // Still update the image with URL (without blob storage)
            updateImageGenerated(id, imageDetails.url, imageDetails.duration, undefined)
            return
          }

          const storedId = await storeBlob(id, blob)
          if (storedId) {
            blobId = storedId
          }
        } catch (e) {
          console.warn('Failed to store image blob:', e)
        }

        updateImageGenerated(id, imageDetails.url, imageDetails.duration, blobId)
      } catch (err) {
        updateImageError(id, err instanceof Error ? err.message : 'Failed to generate')
      }
    })()
  }, [id, prompt, width, height, seed, imageUrl, isLoading, hasHydrated, updateImageGenerated, updateImageError, setStorageLimitState])

  const handleDownload = async () => {
    if (!imageBlobId && !imageUrl) return

    try {
      // Try to get blob from store first
      if (imageBlobId) {
        const blob = await getBlob(imageBlobId)
        if (blob) {
          const dataUrl = await blobToDataUrl(blob)
          const a = document.createElement('a')
          a.href = dataUrl
          a.download = `zenith-${seed}-${Date.now()}.png`
          a.click()
          return
        }
      }

      // Fallback to URL download
      if (imageUrl) {
        const { downloadImage } = await import('@/lib/utils')
        await downloadImage(imageUrl, `zenith-${seed}-${Date.now()}.png`)
      }
    } catch (e) {
      console.error('Failed to download image:', e)
    }
  }

  const handleDoubleClick = () => {
    if (displayUrl || imageUrl) {
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
      ) : displayUrl ? (
        <>
          <img
            src={displayUrl}
            alt="Generated"
            className="w-full h-full object-cover"
          />

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
