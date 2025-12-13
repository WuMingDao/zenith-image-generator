import { ImageIcon, RefreshCw, Sparkles, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { ASPECT_RATIOS } from '@/lib/constants'
import { useFlowStore, type ConfigData } from '@/stores/flowStore'

const STORAGE_KEY = 'zenith-flow-input-config'

interface InputConfig {
  aspectRatioIndex: number
  resolutionIndex: number
  batchCount: number
  seed: number
}

function loadInputConfig(): InputConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return {
    aspectRatioIndex: 0,
    resolutionIndex: 0,
    batchCount: 2,
    seed: Math.floor(Math.random() * 100000),
  }
}

function saveInputConfig(config: InputConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Ignore storage errors
  }
}

interface FlowInputProps {
  providerLabel: string
}

export function FlowInput({ providerLabel }: FlowInputProps) {
  const { t } = useTranslation()

  // Load initial config from localStorage
  const initialConfig = loadInputConfig()
  const [aspectRatioIndex, setAspectRatioIndex] = useState(initialConfig.aspectRatioIndex)
  const [resolutionIndex, setResolutionIndex] = useState(initialConfig.resolutionIndex)
  const [prompt, setPrompt] = useState('')
  const [batchCount, setBatchCount] = useState(initialConfig.batchCount)
  const [seed, setSeed] = useState(initialConfig.seed)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Save config to localStorage when it changes
  useEffect(() => {
    saveInputConfig({ aspectRatioIndex, resolutionIndex, batchCount, seed })
  }, [aspectRatioIndex, resolutionIndex, batchCount, seed])

  // Flow store
  const setPreviewConfig = useFlowStore((s) => s.setPreviewConfig)
  const confirmConfig = useFlowStore((s) => s.confirmConfig)
  const editingConfigId = useFlowStore((s) => s.editingConfigId)
  const isEditingModified = useFlowStore((s) => s.isEditingModified)
  const setEditingModified = useFlowStore((s) => s.setEditingModified)
  const clearEditing = useFlowStore((s) => s.clearEditing)

  const currentAspectRatio = ASPECT_RATIOS[aspectRatioIndex]
  const currentResolution = currentAspectRatio.presets[resolutionIndex]

  // Update preview when config changes
  useEffect(() => {
    // // If editing mode and not modified, don't show preview
    // if (editingConfigId && !isEditingModified) {
    //   setPreviewConfig(null)
    //   return
    // }

    // If there's content, show preview
    if (prompt.trim()) {
      setPreviewConfig({
        prompt: prompt.trim(),
        width: currentResolution.w,
        height: currentResolution.h,
        batchCount,
        seed,
      })
    } else {
      setPreviewConfig(null)
    }
  }, [prompt, currentResolution.w, currentResolution.h, batchCount, seed, setPreviewConfig])

  // Handle input change
  const handleInputChange = (value: string) => {
    setPrompt(value)

    // If editing mode, mark as modified
    if (editingConfigId) {
      setEditingModified(true)
    }
  }

  // Load config from editing
  const loadConfig = useCallback((config: ConfigData) => {
    setPrompt(config.prompt)
    setSeed(config.seed)
    setBatchCount(config.batchCount)

    // Find matching aspect ratio and resolution
    for (let i = 0; i < ASPECT_RATIOS.length; i++) {
      const ratio = ASPECT_RATIOS[i]
      for (let j = 0; j < ratio.presets.length; j++) {
        if (ratio.presets[j].w === config.width && ratio.presets[j].h === config.height) {
          setAspectRatioIndex(i)
          setResolutionIndex(j)
          break
        }
      }
    }

    textareaRef.current?.focus()
  }, [])

  // Expose loadConfig for external use
  useEffect(() => {
    // Listen for config load events
    const unsubscribe = useFlowStore.subscribe(
      (state) => state.editingConfigId,
      (editingId, prevEditingId) => {
        if (editingId && editingId !== prevEditingId) {
          const config = useFlowStore.getState().configNodes.find((n) => n.id === editingId)
          if (config) {
            loadConfig(config.data)
          }
        }
      }
    )
    return unsubscribe
  }, [loadConfig])

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!prompt.trim()) return

    const newConfigId = confirmConfig()
    if (newConfigId) {
      // Reset form
      setPrompt('')
      setSeed(Math.floor(Math.random() * 100000))
      clearEditing()
    }
  }, [prompt, confirmConfig, clearEditing])

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          // Shift+Enter: new line (default behavior)
          return
        }
        // Enter: submit
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const cycleAspectRatio = () => {
    setAspectRatioIndex((prev) => (prev + 1) % ASPECT_RATIOS.length)
  }

  const cycleResolution = () => {
    setResolutionIndex((prev) => (prev + 1) % 2)
  }

  const cycleBatchCount = () => {
    setBatchCount((prev) => (prev % 4) + 1)
  }

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 100000))
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50 flex items-end gap-3">
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 relative">
        {/* Editing indicator */}
        {editingConfigId && (
          <div className="absolute -top-10 left-4 flex items-center gap-2 px-3 py-1.5 rounded-t-xl bg-blue-500/10 border border-blue-500/30 border-b-0">
            <span className="text-xs text-blue-300">
              {t('flow.editingConfig', { configId: editingConfigId })}
              {isEditingModified && <span className="text-orange-400 ml-2">• {t('flow.modified')}</span>}
            </span>
            <button
              type="button"
              onClick={() => {
                clearEditing()
                setPrompt('')
              }}
              className="ml-1 text-blue-400 hover:text-blue-300 text-xs"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}

        {/* Row 1: Badges */}
        <div className="flex gap-2">
          <Badge
            variant="secondary"
            onClick={cycleAspectRatio}
            className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-full px-3 py-0.5 text-xs font-normal cursor-pointer"
          >
            {currentAspectRatio.label}
          </Badge>
          <Badge
            variant="secondary"
            onClick={cycleResolution}
            className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-full px-3 py-0.5 text-xs font-normal cursor-pointer"
          >
            {currentResolution.w >= 2048 || currentResolution.h >= 2048 ? '2K' : '1K'}
          </Badge>
          <Badge
            variant="secondary"
            className="bg-zinc-800 text-zinc-400 rounded-full px-3 py-0.5 text-xs font-normal cursor-pointer hover:bg-zinc-700 flex items-center gap-1"
            onClick={randomizeSeed}
          >
            Seed: {seed}
            <RefreshCw size={10} className="ml-1" />
          </Badge>
        </div>

        {/* Row 2: Input */}
        <textarea
          ref={textareaRef}
          placeholder={t('flow.inputPlaceholder')}
          value={prompt}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none text-lg py-1 resize-none"
        />

        {/* Row 3: Model & Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 bg-zinc-800/50 rounded-full pl-2 pr-3 py-1.5 border border-zinc-700/50">
            <div className="flex items-center gap-1.5 text-xs text-zinc-300">
              <ImageIcon size={14} className="text-zinc-500" />
              <span className="text-zinc-500 font-medium">{t('flow.imageGenMode')}</span>
              <span className="h-3 w-px bg-zinc-700 mx-1" />
              <Sparkles size={14} className="text-yellow-500" />
              <span>{providerLabel}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={cycleBatchCount}
            className="flex items-center justify-center bg-zinc-800 rounded-full px-3 py-1 text-xs font-medium text-zinc-400 cursor-pointer hover:bg-zinc-700 transition-colors"
          >
            x{batchCount}
          </button>
        </div>
      </div>

      {/* Floating Go Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!prompt.trim()}
        className="h-14 w-14 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <Zap className="text-white fill-white" size={22} />
      </button>
    </div>
  )
}

export default FlowInput
