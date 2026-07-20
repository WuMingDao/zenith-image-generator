import { createChannel } from '../../core/channel-factory'
import type { Channel } from '../../core/types'
import { modelscopeGlobalConfig } from './config'
import { modelscopeGlobalImage } from './image'
import { modelscopeGlobalLLM } from './llm'

export const modelscopeGlobalChannel: Channel = createChannel({
  id: 'modelscope-global',
  name: 'ModelScope Global',
  config: modelscopeGlobalConfig,
  image: modelscopeGlobalImage,
  llm: modelscopeGlobalLLM,
})
