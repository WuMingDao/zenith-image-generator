import type { ChannelConfig } from '../../core/types'

export const minimaxConfig: ChannelConfig = {
  baseUrl: 'https://api.minimax.io/v1',
  auth: { type: 'bearer' },
  videoModels: [
    { id: 'MiniMax-Hailuo-2.3', name: 'MiniMax Hailuo 2.3' },
    { id: 'MiniMax-Hailuo-2.3-Fast', name: 'MiniMax Hailuo 2.3 Fast' },
    { id: 'MiniMax-Hailuo-02', name: 'MiniMax Hailuo 02' },
    { id: 'I2V-01-Director', name: 'MiniMax I2V-01 Director' },
    { id: 'I2V-01-live', name: 'MiniMax I2V-01 Live' },
    { id: 'I2V-01', name: 'MiniMax I2V-01' },
  ],
}
