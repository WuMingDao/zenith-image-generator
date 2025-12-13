/**
 * Input Validation Utilities
 */

/** Validation result */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/** Validate prompt */
export function validatePrompt(prompt: string): ValidationResult {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt is required and must be a string' }
  }
  if (prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' }
  }
  if (prompt.length > 4000) {
    return { valid: false, error: 'Prompt exceeds maximum length of 4000 characters' }
  }
  return { valid: true }
}

/** Validate image dimensions */
export function validateDimensions(width: number, height: number): ValidationResult {
  if (typeof width !== 'number' || typeof height !== 'number') {
    return { valid: false, error: 'Width and height must be numbers' }
  }
  if (width < 256 || width > 2048) {
    return { valid: false, error: 'Width must be between 256 and 2048' }
  }
  if (height < 256 || height > 2048) {
    return { valid: false, error: 'Height must be between 256 and 2048' }
  }
  return { valid: true }
}

/** Validate inference steps */
export function validateSteps(steps: number, min = 1, max = 50): ValidationResult {
  if (typeof steps !== 'number') {
    return { valid: false, error: 'Steps must be a number' }
  }
  if (steps < min || steps > max) {
    return { valid: false, error: `Steps must be between ${min} and ${max}` }
  }
  return { valid: true }
}

/** Validate upscale factor */
export function validateScale(scale: number): ValidationResult {
  if (typeof scale !== 'number') {
    return { valid: false, error: 'Scale must be a number' }
  }
  if (scale < 1 || scale > 4) {
    return { valid: false, error: 'Scale must be between 1 and 4' }
  }
  return { valid: true }
}

/** Allowed image host whitelist */
const ALLOWED_IMAGE_HOSTS = [
  'luca115-z-image-turbo.hf.space',
  'mcp-tools-qwen-image-fast.hf.space',
  'tuan2308-upscaler.hf.space',
]

/** Check if image URL is in whitelist */
export function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ALLOWED_IMAGE_HOSTS.some((host) => parsed.hostname.endsWith(host))
  } catch {
    return false
  }
}

/** Generate unique ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
