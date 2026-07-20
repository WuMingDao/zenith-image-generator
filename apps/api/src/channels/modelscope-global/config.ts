import type { ChannelConfig } from '../../core/types'

export const modelscopeGlobalConfig: ChannelConfig = {
  baseUrl: 'https://api-inference.modelscope.ai/v1',
  auth: { type: 'bearer' },
  endpoints: {
    image: '/images/generations',
    llm: '/chat/completions',
    tasks: '/tasks',
  },
  asyncMode: {
    enabled: true,
    pollIntervalMs: 3000,
    maxPollAttempts: 35,
    headers: {
      'X-ModelScope-Async-Mode': 'true',
    },
  },
}
