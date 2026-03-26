import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { DEFAULT_TRANSLATE_SYSTEM_PROMPT } from '@z-image/shared'
import { ArrowLeft, Download, Github, History, Loader2, Settings, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ImageHistory } from '@/components/feature/ImageHistory'
import { SettingsModal } from '@/components/feature/SettingsModal'
import { ConfigNode } from '@/components/flow/ConfigNode'
import { FlowInput } from '@/components/flow/FlowInput'
import { ImageNode } from '@/components/flow/ImageNode'
import { Lightbox } from '@/components/flow/Lightbox'
import { type ContextMenuState, NodeContextMenu } from '@/components/flow/NodeContextMenu'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import {
  buildChatTokenWithPrefix,
  createOpenAIClientForBaseUrl,
  getFullChatModelId,
  openai,
} from '@/lib/api'
import {
  getDefaultLLMModel,
  getDefaultModel,
  getEffectiveSystemPrompt,
  getLLMProviderBaseUrl,
  getModelsByProvider,
  isDirectOpenAICompatibleLLMProvider,
  type LLMProviderType,
  type LLMSettings,
  loadLLMSettings,
  loadSettings,
  type ProviderType,
  saveLLMSettings,
  saveSettings,
} from '@/lib/constants'
import { decryptTokenFromStore, encryptAndStoreToken, loadAllTokens } from '@/lib/crypto'
import { downloadImagesAsZip } from '@/lib/utils'
import { LAYOUT, useFlowStore } from '@/stores/flowStore'

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
  const deleteConfig = useFlowStore((s) => s.deleteConfig)
  const deleteImage = useFlowStore((s) => s.deleteImage)

  // Download state
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

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
    a4f: '',
    gitee: '',
    huggingface: '',
    modelscope: '',
  })
  const [provider, setProvider] = useState<ProviderType>(
    () => loadSettings().provider ?? 'huggingface'
  )
  const [model, setModel] = useState(() => loadSettings().model ?? 'z-image-turbo')
  const [showSettings, setShowSettings] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)

  // LLM Settings state
  const [llmSettings, setLLMSettings] = useState<LLMSettings>(loadLLMSettings)

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

  // LLM Settings handlers
  const updateLLMSettings = useCallback((updates: Partial<LLMSettings>) => {
    setLLMSettings((prev) => {
      const newSettings = { ...prev, ...updates }
      saveLLMSettings(newSettings)
      return newSettings
    })
  }, [])

  const setLLMProvider = useCallback(
    (provider: LLMProviderType) => {
      updateLLMSettings({
        llmProvider: provider,
        llmModel: getDefaultLLMModel(provider),
      })
    },
    [updateLLMSettings]
  )

  const setLLMModel = useCallback(
    (model: string) => {
      updateLLMSettings({ llmModel: model })
    },
    [updateLLMSettings]
  )

  const setAutoTranslate = useCallback(
    (enabled: boolean) => {
      updateLLMSettings({ autoTranslate: enabled })
    },
    [updateLLMSettings]
  )

  const setCustomSystemPrompt = useCallback(
    (prompt: string) => {
      updateLLMSettings({ customSystemPrompt: prompt })
    },
    [updateLLMSettings]
  )

  const setCustomOptimizeConfig = useCallback(
    (config: Partial<{ baseUrl: string; apiKey: string; model: string }>) => {
      setLLMSettings((prev) => {
        const newSettings = {
          ...prev,
          customOptimizeConfig: { ...prev.customOptimizeConfig, ...config },
        }
        saveLLMSettings(newSettings)
        return newSettings
      })
    },
    []
  )

  const setCustomTranslateConfig = useCallback(
    (config: Partial<{ baseUrl: string; apiKey: string; model: string }>) => {
      setLLMSettings((prev) => {
        const newSettings = {
          ...prev,
          customTranslateConfig: { ...prev.customTranslateConfig, ...config },
        }
        saveLLMSettings(newSettings)
        return newSettings
      })
    },
    []
  )

  const setTranslateProvider = useCallback(
    (provider: LLMProviderType) => {
      updateLLMSettings({
        translateProvider: provider,
        translateModel: getDefaultLLMModel(provider),
      })
    },
    [updateLLMSettings]
  )

  const setTranslateModel = useCallback(
    (model: string) => {
      updateLLMSettings({ translateModel: model })
    },
    [updateLLMSettings]
  )

  // Optimize prompt handler
  const handleOptimize = useCallback(
    async (prompt: string): Promise<string | null> => {
      if (!prompt.trim() || isOptimizing) return null

      setIsOptimizing(true)
      try {
        const provider = llmSettings.llmProvider
        const systemPrompt = `${getEffectiveSystemPrompt(llmSettings.customSystemPrompt)}\n\nEnsure the output is in English.`

        if (isDirectOpenAICompatibleLLMProvider(provider)) {
          const { apiKey, model } = llmSettings.customOptimizeConfig
          const baseUrl = getLLMProviderBaseUrl(provider, llmSettings.customOptimizeConfig)
          const resolvedModel =
            model || (provider === 'aihubmix' ? getDefaultLLMModel(provider) : '')
          if (!apiKey || !resolvedModel) {
            toast.error(
              provider === 'aihubmix'
                ? 'Please configure your AIHubMix API key and model'
                : 'Please configure custom provider URL, API key, and model'
            )
            return null
          }
          if (!baseUrl) {
            toast.error('Please configure custom provider URL')
            return null
          }
          const client = createOpenAIClientForBaseUrl(baseUrl)
          const resp = await client.chatCompletions(
            {
              model: resolvedModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
              ],
              max_tokens: 1000,
            },
            apiKey
          )
          const out = resp.choices?.[0]?.message?.content?.trim()
          if (!out) throw new Error('Empty response from provider')
          toast.success(t('prompt.optimizeSuccess'))
          return out
        }

        // Get token for LLM provider
        let token: string | undefined
        switch (provider) {
          case 'gitee-llm':
            token = await decryptTokenFromStore('gitee')
            break
          case 'modelscope-llm':
            token = await decryptTokenFromStore('modelscope')
            break
          case 'huggingface-llm':
            token = await decryptTokenFromStore('huggingface')
            break
          case 'deepseek':
            token = await decryptTokenFromStore('deepseek')
            break
        }

        const resp = await openai.chatCompletions(
          {
            model: getFullChatModelId(provider, llmSettings.llmModel),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1000,
          },
          token ? buildChatTokenWithPrefix(provider, token) : undefined
        )

        const out = resp.choices?.[0]?.message?.content?.trim()
        if (!out) throw new Error('Empty response from provider')
        toast.success(t('prompt.optimizeSuccess'))
        return out
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Optimization failed'
        toast.error(msg)
        return null
      } finally {
        setIsOptimizing(false)
      }
    },
    [isOptimizing, t, llmSettings]
  )

  // Translate prompt handler
  const handleTranslate = useCallback(
    async (prompt: string): Promise<string | null> => {
      if (!prompt.trim() || isTranslating) return null

      setIsTranslating(true)
      try {
        const provider = llmSettings.translateProvider

        if (isDirectOpenAICompatibleLLMProvider(provider)) {
          const { apiKey, model } = llmSettings.customTranslateConfig
          const baseUrl = getLLMProviderBaseUrl(provider, llmSettings.customTranslateConfig)
          const resolvedModel =
            model || (provider === 'aihubmix' ? getDefaultLLMModel(provider) : '')
          if (!apiKey || !resolvedModel) {
            toast.error(
              provider === 'aihubmix'
                ? 'Please configure your AIHubMix API key and model'
                : 'Please configure custom provider URL, API key, and model'
            )
            return null
          }
          if (!baseUrl) {
            toast.error('Please configure custom provider URL')
            return null
          }
          const client = createOpenAIClientForBaseUrl(baseUrl)
          const resp = await client.chatCompletions(
            {
              model: resolvedModel,
              messages: [
                { role: 'system', content: DEFAULT_TRANSLATE_SYSTEM_PROMPT },
                { role: 'user', content: prompt },
              ],
              max_tokens: 1000,
              temperature: 0.3,
            },
            apiKey
          )
          const out = resp.choices?.[0]?.message?.content?.trim()
          if (!out) throw new Error('Empty response from provider')
          toast.success(t('prompt.translateSuccess'))
          return out
        }

        // Get token for translate provider
        let token: string | undefined
        switch (provider) {
          case 'gitee-llm':
            token = await decryptTokenFromStore('gitee')
            break
          case 'modelscope-llm':
            token = await decryptTokenFromStore('modelscope')
            break
          case 'huggingface-llm':
            token = await decryptTokenFromStore('huggingface')
            break
          case 'deepseek':
            token = await decryptTokenFromStore('deepseek')
            break
        }

        const resp = await openai.chatCompletions(
          {
            model: getFullChatModelId(provider, llmSettings.translateModel),
            messages: [
              { role: 'system', content: DEFAULT_TRANSLATE_SYSTEM_PROMPT },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1000,
            temperature: 0.3,
          },
          token ? buildChatTokenWithPrefix(provider, token) : undefined
        )

        const out = resp.choices?.[0]?.message?.content?.trim()
        if (!out) throw new Error('Empty response from provider')
        toast.success(t('prompt.translateSuccess'))
        return out
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Translation failed'
        toast.error(msg)
        return null
      } finally {
        setIsTranslating(false)
      }
    },
    [isTranslating, t, llmSettings]
  )

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

  // Handle node right click - show context menu
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    // Prevent default context menu
    event.preventDefault()

    // Don't show context menu for preview nodes
    if (node.data.isPreview) return

    // Only show for config and image nodes
    if (node.type !== 'configNode' && node.type !== 'imageNode') return

    setContextMenu({
      nodeId: node.id,
      nodeType: node.type as 'configNode' | 'imageNode',
      x: event.clientX,
      y: event.clientY,
    })
  }, [])

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Handle clear all
  const handleClearAll = useCallback(() => {
    if (confirm(t('flow.clearConfirm'))) {
      clearAll()
    }
  }, [clearAll, t])

  // Handle download all images
  const handleDownloadAll = useCallback(async () => {
    // Get all images with URL data
    const imagesWithData = imageNodes.filter((n) => n.data.imageUrl)
    if (imagesWithData.length === 0) {
      alert(t('flow.noImages'))
      return
    }

    setIsDownloading(true)
    setDownloadProgress(t('flow.downloadProgress', { current: 0, total: imagesWithData.length }))

    try {
      const images: Array<{ url: string; filename: string }> = []

      for (let i = 0; i < imagesWithData.length; i++) {
        const node = imagesWithData[i]
        const url = node.data.imageUrl || null

        if (url) {
          images.push({
            url,
            filename: `zenith-${i + 1}-${node.data.seed}.png`,
          })
        }
      }

      await downloadImagesAsZip(images, `zenith-images-${Date.now()}.zip`, (current, total) => {
        setDownloadProgress(t('flow.downloadProgress', { current, total }))
      })
    } catch (error) {
      console.error('Failed to download images:', error)
    } finally {
      setIsDownloading(false)
      setDownloadProgress('')
    }
  }, [imageNodes, t])

  return (
    <div className="h-screen w-screen bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={closeContextMenu}
        onPaneContextMenu={closeContextMenu}
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
          <a
            href="https://github.com/WuMingDao/zenith-image-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span className="text-sm"></span>
          </a>
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
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            <History className="w-4 h-4" />
            <span className="text-sm">{t('history.title')}</span>
          </button>
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

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
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
        llmSettings={llmSettings}
        setLLMProvider={setLLMProvider}
        setLLMModel={setLLMModel}
        setTranslateProvider={setTranslateProvider}
        setTranslateModel={setTranslateModel}
        setAutoTranslate={setAutoTranslate}
        setCustomSystemPrompt={setCustomSystemPrompt}
        setCustomOptimizeConfig={setCustomOptimizeConfig}
        setCustomTranslateConfig={setCustomTranslateConfig}
      />

      {/* Flow Input */}
      <FlowInput
        providerLabel={`${provider} / ${model}`}
        onOptimize={handleOptimize}
        onTranslate={handleTranslate}
        isOptimizing={isOptimizing}
        isTranslating={isTranslating}
      />

      {/* Lightbox */}
      <Lightbox />

      <ImageHistory
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={(item) => {
          // Flow doesn't have a single "current image" slot; open the item in a new tab.
          window.open(item.url, '_blank', 'noopener,noreferrer')
          toast.success(t('history.load'))
          setShowHistory(false)
        }}
      />

      {/* Node Context Menu */}
      {contextMenu && (
        <NodeContextMenu
          menu={contextMenu}
          onClose={closeContextMenu}
          onDeleteConfig={deleteConfig}
          onDeleteImage={deleteImage}
        />
      )}
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
