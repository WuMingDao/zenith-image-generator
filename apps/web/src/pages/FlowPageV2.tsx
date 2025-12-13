import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, Loader2, Settings, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ApiConfigAccordion } from '@/components/feature/ApiConfigAccordion'
import { ConfigNode } from '@/components/flow/ConfigNode'
import { ImageNode } from '@/components/flow/ImageNode'
import { FlowInput } from '@/components/flow/FlowInput'
import { Lightbox } from '@/components/flow/Lightbox'
import { StorageLimitModal } from '@/components/flow/StorageLimitModal'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useFlowStore, LAYOUT } from '@/stores/flowStore'
import {
  getDefaultModel,
  getModelsByProvider,
  loadSettings,
  type ProviderType,
  saveSettings,
} from '@/lib/constants'
import { encryptAndStoreToken, loadAllTokens } from '@/lib/crypto'
import { downloadImagesAsZip } from '@/lib/utils'
import { getBlob, blobToDataUrl, cleanupForNewBlob, storeBlob } from '@/lib/imageBlobStore'

const nodeTypes = {
  configNode: ConfigNode,
  imageNode: ImageNode,
}

function FlowCanvas() {
  const { t } = useTranslation()

  // Flow store - subscribe to actual state values
  const configNodes = useFlowStore((s) => s.configNodes)
  const imageNodes = useFlowStore((s) => s.imageNodes)
  const previewConfig = useFlowStore((s) => s.previewConfig)
  const updateConfigPosition = useFlowStore((s) => s.updateConfigPosition)
  const loadConfigForEditing = useFlowStore((s) => s.loadConfigForEditing)
  const clearAll = useFlowStore((s) => s.clearAll)
  const storageLimitState = useFlowStore((s) => s.storageLimitState)
  const clearStorageLimitState = useFlowStore((s) => s.clearStorageLimitState)
  const updateImageGenerated = useFlowStore((s) => s.updateImageGenerated)

  // Download state
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState('')

  // Compute nodes from state
  const nodes = useMemo(() => {
    const result: Node[] = [...configNodes, ...imageNodes]

    // Add preview node if exists
    if (previewConfig) {
      const confirmedCount = configNodes.length
      const position = {
        x: LAYOUT.FIRST_CONFIG_X + confirmedCount * LAYOUT.CONFIG_SPACING,
        y: LAYOUT.FIRST_CONFIG_Y,
      }
      result.push({
        id: previewConfig.id,
        type: 'configNode',
        position,
        data: previewConfig,
        draggable: false,
      })
    }

    return result
  }, [configNodes, imageNodes, previewConfig])

  // Compute edges from state
  const edges = useMemo(() => {
    return imageNodes.map((imageNode) => ({
      id: `edge-${imageNode.data.configId}-${imageNode.id}`,
      source: imageNode.data.configId,
      target: imageNode.id,
      type: 'smoothstep',
      style: { stroke: '#3f3f46', strokeWidth: 1.5 },
    }))
  }, [imageNodes])

  // Settings state
  const [tokens, setTokens] = useState<Record<ProviderType, string>>({
    gitee: '',
    huggingface: '',
    modelscope: '',
  })
  const [provider, setProvider] = useState<ProviderType>(
    () => loadSettings().provider ?? 'huggingface'
  )
  const [model, setModel] = useState(() => loadSettings().model ?? 'z-image-turbo')
  const [showSettings, setShowSettings] = useState(false)

  // Load tokens
  useEffect(() => {
    loadAllTokens().then(setTokens)
  }, [])

  // Update model when provider changes
  useEffect(() => {
    const models = getModelsByProvider(provider)
    if (!models.find((m) => m.id === model)) {
      setModel(getDefaultModel(provider))
    }
  }, [provider, model])

  const saveToken = async (p: ProviderType, token: string) => {
    setTokens((prev) => ({ ...prev, [p]: token }))
    await encryptAndStoreToken(p, token)
  }

  const updateSettings = (patch: Partial<Record<string, unknown>>) => {
    const prev = loadSettings()
    saveSettings({ ...prev, ...patch })
  }

  // Handle node drag - group dragging for config nodes (real-time)
  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'configNode' && !node.data.isPreview) {
        updateConfigPosition(node.id, node.position.x, node.position.y)
      }
    },
    [updateConfigPosition]
  )

  // Handle node drag stop - finalize position
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'configNode' && !node.data.isPreview) {
        updateConfigPosition(node.id, node.position.x, node.position.y)
      }
    },
    [updateConfigPosition]
  )

  // Handle node double click - load config for editing
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'configNode' && !node.data.isPreview) {
        loadConfigForEditing(node.id)
      }
    },
    [loadConfigForEditing]
  )

  // Handle clear all
  const handleClearAll = useCallback(() => {
    if (confirm(t('flow.clearConfirm'))) {
      clearAll()
    }
  }, [clearAll, t])

  // Handle download all images
  const handleDownloadAll = useCallback(async () => {
    // Get all images with blob or URL data
    const imagesWithData = imageNodes.filter((n) => n.data.imageBlobId || n.data.imageUrl)
    if (imagesWithData.length === 0) {
      alert(t('flow.noImages'))
      return
    }

    setIsDownloading(true)
    setDownloadProgress(t('flow.downloadProgress', { current: 0, total: imagesWithData.length }))

    try {
      // Build image list, preferring blob storage over URLs
      const images: Array<{ url: string; filename: string }> = []

      for (let i = 0; i < imagesWithData.length; i++) {
        const node = imagesWithData[i]
        let url: string | null = null

        // Try to get from blob storage first (local, no CORS issues)
        if (node.data.imageBlobId) {
          try {
            const blob = await getBlob(node.data.imageBlobId)
            if (blob) {
              url = await blobToDataUrl(blob)
            }
          } catch (e) {
            console.warn('Failed to get blob, falling back to URL:', e)
          }
        }

        // Fallback to URL if blob not available
        if (!url && node.data.imageUrl) {
          url = node.data.imageUrl
        }

        if (url) {
          images.push({
            url,
            filename: `zenith-${i + 1}-${node.data.seed}.png`,
          })
        }
      }

      await downloadImagesAsZip(
        images,
        `zenith-images-${Date.now()}.zip`,
        (current, total) => {
          setDownloadProgress(t('flow.downloadProgress', { current, total }))
        }
      )
    } catch (error) {
      console.error('Failed to download images:', error)
    } finally {
      setIsDownloading(false)
      setDownloadProgress('')
    }
  }, [imageNodes, t])

  // Handle storage limit modal - download all from modal
  const handleStorageDownloadAll = useCallback(async () => {
    await handleDownloadAll()
  }, [handleDownloadAll])

  // Handle storage limit modal - confirm cleanup
  const handleConfirmCleanup = useCallback(async () => {
    if (!storageLimitState?.pendingBlob || !storageLimitState?.pendingImageId) {
      clearStorageLimitState()
      return
    }

    const { pendingBlob, pendingImageId } = storageLimitState

    // Perform cleanup
    await cleanupForNewBlob(pendingBlob.size)

    // Store the pending blob
    const blobId = await storeBlob(pendingImageId, pendingBlob)

    // Update the image with the new blobId
    const imageNode = imageNodes.find((n) => n.id === pendingImageId)
    if (imageNode && blobId) {
      updateImageGenerated(
        pendingImageId,
        imageNode.data.imageUrl || '',
        imageNode.data.duration || '',
        blobId
      )
    }

    clearStorageLimitState()
  }, [storageLimitState, imageNodes, updateImageGenerated, clearStorageLimitState])

  return (
    <div className="h-screen w-screen bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView={false}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-zinc-950"
      >
        <Background variant={BackgroundVariant.Dots} color="#27272a" gap={20} size={1} />
        <Controls className="!bg-zinc-800/90 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button:hover]:!bg-zinc-700 [&>button>svg]:!fill-zinc-400" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'configNode') {
              return node.data.isPreview ? '#f97316' : '#3f3f46'
            }
            return '#27272a'
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-zinc-900/90 !border-zinc-700 !rounded-lg"
        />
      </ReactFlow>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-6 bg-gradient-to-b from-zinc-950 to-transparent">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('common.back')}</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <h1 className="text-2xl font-bold text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] tracking-wider">
          {t('header.title')}
        </h1>

        <div className="flex items-center gap-2">
          {imageNodes.some((n) => n.data.imageUrl) && (
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={isDownloading}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 rounded-lg text-zinc-400 hover:text-green-400 hover:border-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{downloadProgress || t('flow.downloading')}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="text-sm">{t('flow.downloadAll')}</span>
                </>
              )}
            </button>
          )}
          {(configNodes.length > 0 || imageNodes.length > 0) && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 rounded-lg text-zinc-400 hover:text-red-400 hover:border-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">{t('common.clear')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">{t('common.api')}</span>
            {tokens[provider] && <span className="w-2 h-2 bg-green-500 rounded-full" />}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-zinc-100 font-medium">{t('apiConfig.settings')}</h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ApiConfigAccordion
              provider={provider}
              model={model}
              currentToken={tokens[provider]}
              availableModels={getModelsByProvider(provider)}
              setProvider={(p) => {
                setProvider(p)
                updateSettings({ provider: p })
              }}
              setModel={(m) => {
                setModel(m)
                updateSettings({ model: m })
              }}
              saveToken={saveToken}
            />
          </div>
        </div>
      )}

      {/* Flow Input */}
      <FlowInput providerLabel={`${provider} / ${model}`} />

      {/* Lightbox */}
      <Lightbox />

      {/* Storage Limit Modal */}
      <StorageLimitModal
        isOpen={!!storageLimitState?.needsCleanup}
        reason={storageLimitState?.reason || null}
        currentCount={storageLimitState?.currentCount || 0}
        currentSizeMB={storageLimitState?.currentSizeMB || 0}
        onDownloadAll={handleStorageDownloadAll}
        onConfirmCleanup={handleConfirmCleanup}
        onCancel={clearStorageLimitState}
        isDownloading={isDownloading}
      />
    </div>
  )
}

export default function FlowPageV2() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  )
}
