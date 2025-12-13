/**
 * Gradio API Utilities
 */

import { Errors } from '@z-image/shared'

/**
 * Extract complete event data from SSE stream
 */
export function extractCompleteEventData(sseStream: string): unknown {
  const lines = sseStream.split('\n')
  let currentEvent = ''

  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent = line.substring(6).trim()
    } else if (line.startsWith('data:')) {
      const jsonData = line.substring(5).trim()
      if (currentEvent === 'complete') {
        return JSON.parse(jsonData)
      }
      if (currentEvent === 'error') {
        // Parse actual error message from data
        try {
          const errorData = JSON.parse(jsonData)
          const errorMsg =
            errorData?.error || errorData?.message || JSON.stringify(errorData) || 'Unknown error'
          throw Errors.providerError('HuggingFace', errorMsg)
        } catch (e) {
          if (e instanceof SyntaxError) {
            throw Errors.providerError('HuggingFace', jsonData || 'Unknown SSE error')
          }
          throw e
        }
      }
    }
  }
  // No complete/error event found, show raw response for debugging
  throw Errors.providerError(
    'HuggingFace',
    `Unexpected SSE response: ${sseStream.substring(0, 200)}`
  )
}

/**
 * Call Gradio API with queue mechanism
 */
export async function callGradioApi(
  baseUrl: string,
  endpoint: string,
  data: unknown[],
  hfToken?: string
): Promise<unknown[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (hfToken) headers.Authorization = `Bearer ${hfToken}`

  const queue = await fetch(`${baseUrl}/gradio_api/call/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  })

  if (!queue.ok) {
    const errText = await queue.text().catch(() => '')
    throw Errors.providerError(
      'HuggingFace',
      `Queue request failed: ${queue.status} - ${errText.slice(0, 100)}`
    )
  }

  const queueData = (await queue.json()) as { event_id?: string }
  if (!queueData.event_id) {
    throw Errors.providerError('HuggingFace', 'No event_id returned from queue')
  }

  const result = await fetch(`${baseUrl}/gradio_api/call/${endpoint}/${queueData.event_id}`, {
    headers,
  })
  const text = await result.text()

  return extractCompleteEventData(text) as unknown[]
}
