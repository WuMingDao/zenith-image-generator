/**
 * usePromptTranslate Hook
 *
 * Hook for translating prompts from Chinese to English
 * Uses Pollinations AI with openai-fast model (free, no auth required)
 */

import type { TranslateResponse } from '@z-image/shared'
import { useCallback, useState } from 'react'
import { translatePrompt } from '@/lib/api'

export interface UsePromptTranslateOptions {
  /** Callback on successful translation */
  onSuccess?: (result: TranslateResponse) => void
  /** Callback on error */
  onError?: (error: string) => void
}

export interface UsePromptTranslateReturn {
  /** Translate a prompt */
  translate: (prompt: string) => Promise<TranslateResponse | null>
  /** Whether translation is in progress */
  isTranslating: boolean
  /** The translated prompt result */
  translatedPrompt: string | null
  /** Error message if translation failed */
  error: string | null
  /** Reset state */
  reset: () => void
}

/**
 * Hook for translating prompts from Chinese to English
 *
 * @example
 * ```tsx
 * const { translate, isTranslating, error } = usePromptTranslate({
 *   onSuccess: (result) => setPrompt(result.translated),
 *   onError: (error) => toast.error(error),
 * })
 *
 * const handleTranslate = () => {
 *   translate(prompt)
 * }
 * ```
 */
export function usePromptTranslate(
  options: UsePromptTranslateOptions = {}
): UsePromptTranslateReturn {
  const [isTranslating, setIsTranslating] = useState(false)
  const [translatedPrompt, setTranslatedPrompt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const translate = useCallback(
    async (prompt: string): Promise<TranslateResponse | null> => {
      if (!prompt.trim()) {
        const errorMsg = 'Prompt cannot be empty'
        setError(errorMsg)
        options.onError?.(errorMsg)
        return null
      }

      setIsTranslating(true)
      setError(null)

      try {
        const result = await translatePrompt(prompt)

        if (!result.success) {
          setError(result.error)
          options.onError?.(result.error)
          return null
        }

        setTranslatedPrompt(result.data.translated)
        options.onSuccess?.(result.data)
        return result.data
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        options.onError?.(errorMessage)
        return null
      } finally {
        setIsTranslating(false)
      }
    },
    [options]
  )

  const reset = useCallback(() => {
    setTranslatedPrompt(null)
    setError(null)
  }, [])

  return {
    translate,
    isTranslating,
    translatedPrompt,
    error,
    reset,
  }
}
