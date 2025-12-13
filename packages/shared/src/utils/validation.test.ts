/**
 * Validation Utilities Tests
 */

import { describe, expect, it } from 'vitest'
import {
  generateId,
  isAllowedImageUrl,
  validateDimensions,
  validatePrompt,
  validateScale,
  validateSteps,
} from './validation'

describe('validatePrompt', () => {
  it('should return valid for normal prompt', () => {
    const result = validatePrompt('A beautiful sunset over the ocean')
    expect(result.valid).toBe(true)
  })

  it('should return invalid for empty prompt', () => {
    const result = validatePrompt('')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should return invalid for whitespace-only prompt', () => {
    const result = validatePrompt('   ')
    expect(result.valid).toBe(false)
  })

  it('should return invalid for prompt exceeding max length', () => {
    const longPrompt = 'a'.repeat(4001)
    const result = validatePrompt(longPrompt)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('4000')
  })
})

describe('validateDimensions', () => {
  it('should return valid for dimensions within range', () => {
    const result = validateDimensions(1024, 1024)
    expect(result.valid).toBe(true)
  })

  it('should return invalid for width below minimum', () => {
    const result = validateDimensions(200, 1024)
    expect(result.valid).toBe(false)
  })

  it('should return invalid for height above maximum', () => {
    const result = validateDimensions(1024, 3000)
    expect(result.valid).toBe(false)
  })
})

describe('validateSteps', () => {
  it('should return valid for steps within default range', () => {
    const result = validateSteps(20)
    expect(result.valid).toBe(true)
  })

  it('should return invalid for steps below minimum', () => {
    const result = validateSteps(0)
    expect(result.valid).toBe(false)
  })

  it('should return valid for custom range', () => {
    const result = validateSteps(15, 10, 20)
    expect(result.valid).toBe(true)
  })
})

describe('validateScale', () => {
  it('should return valid for scale within range', () => {
    const result = validateScale(4)
    expect(result.valid).toBe(true)
  })

  it('should return invalid for scale above maximum', () => {
    const result = validateScale(5)
    expect(result.valid).toBe(false)
  })
})

describe('isAllowedImageUrl', () => {
  it('should return true for allowed HuggingFace URL', () => {
    const result = isAllowedImageUrl('https://luca115-z-image-turbo.hf.space/image.png')
    expect(result).toBe(true)
  })

  it('should return false for non-allowed URL', () => {
    const result = isAllowedImageUrl('https://example.com/image.png')
    expect(result).toBe(false)
  })

  it('should return false for invalid URL', () => {
    const result = isAllowedImageUrl('not-a-url')
    expect(result).toBe(false)
  })
})

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })

  it('should include timestamp', () => {
    const id = generateId()
    const timestamp = id.split('-')[0]
    expect(Number(timestamp)).toBeGreaterThan(0)
  })
})
