/**
 * usePromptOptimize Hook
 *
 * Hook for optimizing prompts using LLM providers
 */

import type { LLMProviderType, OptimizeResponse } from '@z-image/shared'
import { useCallback, useState } from 'react'
import { type OptimizeOptions, optimizePrompt } from '@/lib/api'
import { decryptTokenFromStore, type TokenProvider } from '@/lib/crypto'

export interface UsePromptOptimizeOptions {
  /** Callback on successful optimization */
  onSuccess?: (result: OptimizeResponse) => void
  /** Callback on error */
  onError?: (error: string) => void
}

export interface UsePromptOptimizeReturn {
  /** Optimize a prompt */
  optimize: (params: OptimizeParams) => Promise<OptimizeResponse | null>
  /** Whether optimization is in progress */
  isOptimizing: boolean
  /** The optimized prompt result */
  optimizedPrompt: string | null
  /** Error message if optimization failed */
  error: string | null
  /** Reset state */
  reset: () => void
}

export interface OptimizeParams {
  /** The prompt to optimize */
  prompt: string
  /** LLM provider to use (default: pollinations) */
  provider?: LLMProviderType
  /** Output language (default: en) */
  lang?: 'en' | 'zh'
  /** Specific model to use */
  model?: string
  /** Custom system prompt */
  systemPrompt?: string
}

/**
 * Map LLM provider to token provider for auth
 * gitee-llm reuses the gitee image generation token
 * modelscope-llm reuses the modelscope image generation token
 */
function getTokenProvider(llmProvider: LLMProviderType): TokenProvider | null {
  switch (llmProvider) {
    case 'gitee-llm':
      return 'gitee'
    case 'modelscope-llm':
      return 'modelscope'
    case 'huggingface-llm':
      return 'huggingface'
    case 'deepseek':
      return 'deepseek'
    case 'pollinations':
      return null // No auth needed
    default:
      return null
  }
}

/**
 * Hook for optimizing prompts using LLM
 *
 * @example
 * ```tsx
 * const { optimize, isOptimizing, error } = usePromptOptimize({
 *   onSuccess: (result) => setPrompt(result.optimized),
 *   onError: (error) => toast.error(error),
 * })
 *
 * const handleOptimize = () => {
 *   optimize({ prompt, provider: 'pollinations', lang: 'en' })
 * }
 * ```
 */
export function usePromptOptimize(options: UsePromptOptimizeOptions = {}): UsePromptOptimizeReturn {
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const optimize = useCallback(
    async (params: OptimizeParams): Promise<OptimizeResponse | null> => {
      const { prompt, provider = 'pollinations', lang = 'en', model, systemPrompt } = params

      if (!prompt.trim()) {
        const errorMsg = 'Prompt cannot be empty'
        setError(errorMsg)
        options.onError?.(errorMsg)
        return null
      }

      setIsOptimizing(true)
      setError(null)

      try {
        // Get token if provider requires auth
        let token: string | undefined
        const tokenProvider = getTokenProvider(provider)
        if (tokenProvider) {
          token = await decryptTokenFromStore(tokenProvider)
        }

        const optimizeOptions: OptimizeOptions = {
          prompt,
          provider,
          lang,
          model,
          systemPrompt,
        }

        const result = await optimizePrompt(optimizeOptions, token)

        if (!result.success) {
          setError(result.error)
          options.onError?.(result.error)
          return null
        }

        setOptimizedPrompt(result.data.optimized)
        options.onSuccess?.(result.data)
        return result.data
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        options.onError?.(errorMessage)
        return null
      } finally {
        setIsOptimizing(false)
      }
    },
    [options]
  )

  const reset = useCallback(() => {
    setOptimizedPrompt(null)
    setError(null)
  }, [])

  return {
    optimize,
    isOptimizing,
    optimizedPrompt,
    error,
    reset,
  }
}
