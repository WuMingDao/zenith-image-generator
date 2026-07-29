import { createChannel } from '../../core/channel-factory'
import type { Channel } from '../../core/types'
import { minimaxConfig } from './config'
import { minimaxVideo } from './video'

export const minimaxChannel: Channel = createChannel({
  id: 'minimax',
  name: 'MiniMax',
  config: minimaxConfig,
  video: minimaxVideo,
})
