import type { ProviderType } from './constants'

/** Token provider type (extends ProviderType with DeepSeek for LLM) */
export type TokenProvider = ProviderType | 'deepseek'

const TOKEN_STORAGE_KEYS: Record<TokenProvider, string> = {
  gitee: 'giteeToken',
  huggingface: 'hfToken',
  modelscope: 'msToken',
  deepseek: 'deepseekToken',
}

async function getKey(): Promise<CryptoKey> {
  const fingerprint = [navigator.userAgent, navigator.language, screen.width, screen.height].join(
    '|'
  )
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(fingerprint),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('z-image-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptAndStoreToken(provider: TokenProvider, token: string): Promise<void> {
  const storageKey = TOKEN_STORAGE_KEYS[provider]
  if (!token) {
    localStorage.removeItem(storageKey)
    return
  }
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token)
  )
  const data = JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  })
  localStorage.setItem(storageKey, data)
}

export async function decryptTokenFromStore(provider: TokenProvider): Promise<string> {
  const storageKey = TOKEN_STORAGE_KEYS[provider]
  const stored = localStorage.getItem(storageKey)
  if (!stored) return ''
  try {
    const { iv, data } = JSON.parse(stored)
    const key = await getKey()
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data)
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    localStorage.removeItem(storageKey)
    return ''
  }
}

export async function loadAllTokens(): Promise<Record<TokenProvider, string>> {
  const tokens: Record<TokenProvider, string> = {
    gitee: '',
    huggingface: '',
    modelscope: '',
    deepseek: '',
  }
  for (const provider of Object.keys(TOKEN_STORAGE_KEYS) as TokenProvider[]) {
    tokens[provider] = await decryptTokenFromStore(provider)
  }
  return tokens
}
