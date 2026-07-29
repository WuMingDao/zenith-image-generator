import { registerChannel } from '../core/channel-registry'
import type { EnvLike } from '../core/types'
import { a4fChannel } from './a4f'
import { createDeepseekChannel, loadCustomChannels } from './custom'
import { giteeChannel } from './gitee'
import { huggingfaceChannel } from './huggingface'
import { minimaxChannel } from './minimax'
import { modelscopeChannel } from './modelscope'

const builtinChannels = [
  a4fChannel,
  modelscopeChannel,
  giteeChannel,
  huggingfaceChannel,
  minimaxChannel,
  createDeepseekChannel(),
]

for (const channel of builtinChannels) {
  registerChannel(channel)
}

let customInitialized = false

function getProcessEnv(): EnvLike | undefined {
  try {
    if (typeof process !== 'undefined' && process.env) return process.env as EnvLike
  } catch {
    // ignore
  }
  return undefined
}

export function ensureCustomChannelsInitialized(env?: EnvLike): void {
  if (customInitialized) return
  const source = env || getProcessEnv()
  if (!source) return

  const custom = loadCustomChannels(source)
  for (const channel of custom) registerChannel(channel)
  customInitialized = true
}

// Best-effort auto-init for runtimes with process.env (Node/Vercel/Netlify).
ensureCustomChannelsInitialized()

export * from '../core/channel-registry'
export * from './a4f'
export * from './custom'
export * from './gitee'
export * from './huggingface'
export * from './minimax'
export * from './modelscope'
