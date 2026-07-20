/**
 * Zod Validation Schemas
 *
 * Centralized request/response schemas for API validation.
 * These schemas provide runtime validation and TypeScript type inference.
 */

import { z } from 'zod'
import { PROMPT_LIMITS } from '../constants'

// ============================================================================
// Common Schemas
// ============================================================================

/** Provider type enum */
export const ProviderSchema = z.enum(['gitee', 'huggingface', 'modelscope', 'modelscope-global'])

/** LLM Provider type enum */
export const LLMProviderSchema = z.enum([
  'pollinations',
  'huggingface',
  'gitee',
  'modelscope',
  'modelscope-global',
  'deepseek',
])

/** Language enum */
export const LangSchema = z.enum(['en', 'zh'])

// ============================================================================
// Generate Endpoint Schemas
// ============================================================================

/** Image generation request schema */
export const GenerateRequestSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(4000, 'Prompt must be less than 4000 characters'),
  provider: ProviderSchema.optional().default('gitee'),
  model: z.string().optional(),
  width: z.number().int().min(256).max(2048).optional().default(1024),
  height: z.number().int().min(256).max(2048).optional().default(1024),
  steps: z.number().int().min(1).max(50).optional().default(9),
  seed: z.number().int().optional(),
  negativePrompt: z.string().optional(),
  negative_prompt: z.string().optional(), // Legacy field
  num_inference_steps: z.number().int().optional(), // Legacy field
  guidanceScale: z.number().min(0).max(20).optional(),
})

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>

/** Image details response schema */
export const ImageDetailsSchema = z.object({
  url: z.string().url(),
  provider: z.string(),
  model: z.string(),
  dimensions: z.string(),
  duration: z.string(),
  seed: z.number(),
  steps: z.number(),
  prompt: z.string(),
  negativePrompt: z.string(),
})

/** Generate success response schema */
export const GenerateResponseSchema = z.object({
  imageDetails: ImageDetailsSchema,
})

// ============================================================================
// Optimize Endpoint Schemas
// ============================================================================

/** Prompt optimization request schema */
export const OptimizeRequestSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(PROMPT_LIMITS.OPTIMIZE, `Prompt must be less than ${PROMPT_LIMITS.OPTIMIZE} characters`),
  provider: LLMProviderSchema.optional().default('pollinations'),
  lang: LangSchema.optional().default('en'),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
})

export type OptimizeRequest = z.infer<typeof OptimizeRequestSchema>

/** Optimize response schema */
export const OptimizeResponseSchema = z.object({
  optimized: z.string(),
  provider: LLMProviderSchema,
  model: z.string(),
})

// ============================================================================
// Translate Endpoint Schemas
// ============================================================================

/** Translation request schema */
export const TranslateRequestSchema = z.object({
  prompt: z
    .string()
    .min(1, 'Prompt is required')
    .max(PROMPT_LIMITS.TRANSLATE, `Prompt must be less than ${PROMPT_LIMITS.TRANSLATE} characters`),
})

export type TranslateRequest = z.infer<typeof TranslateRequestSchema>

/** Translate response schema */
export const TranslateResponseSchema = z.object({
  translated: z.string(),
  model: z.string(),
})

// ============================================================================
// Upscale Endpoint Schemas
// ============================================================================

/** Upscale request schema */
export const UpscaleRequestSchema = z.object({
  url: z.string().url('Invalid URL'),
  scale: z.number().int().min(2).max(4).optional().default(4),
})

export type UpscaleRequest = z.infer<typeof UpscaleRequestSchema>

/** Upscale response schema */
export const UpscaleResponseSchema = z.object({
  url: z.string().url(),
})

// ============================================================================
// Video Endpoint Schemas
// ============================================================================

/** Video generation request schema */
export const VideoGenerateRequestSchema = z.object({
  provider: z.literal('gitee'),
  imageUrl: z.string().url('Invalid image URL'),
  prompt: z.string().min(1, 'Prompt is required'),
  width: z.number().int().min(256).max(2048),
  height: z.number().int().min(256).max(2048),
})

export type VideoGenerateRequest = z.infer<typeof VideoGenerateRequestSchema>

/** Video task response schema */
export const VideoTaskResponseSchema = z.object({
  taskId: z.string(),
  status: z.enum(['pending', 'processing', 'success', 'failed']),
})

/** Video status response schema */
export const VideoStatusResponseSchema = z.object({
  status: z.enum(['pending', 'processing', 'success', 'failed']),
  videoUrl: z.string().url().optional(),
  error: z.string().optional(),
})

// ============================================================================
// Error Response Schema
// ============================================================================

/** API error response schema */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
})
