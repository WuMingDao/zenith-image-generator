/**
 * Unified API Error Types
 */

/** Error codes for API responses */
export enum ApiErrorCode {
  // Authentication errors (401)
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',

  // Rate limit / Quota errors (429)
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Validation errors (400)
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_PROVIDER = 'INVALID_PROVIDER',
  INVALID_MODEL = 'INVALID_MODEL',
  INVALID_PROMPT = 'INVALID_PROMPT',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  INVALID_PARAMS = 'INVALID_PARAMS',

  // Service errors (500+)
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  GENERATION_FAILED = 'GENERATION_FAILED',
  UPSTREAM_ERROR = 'UPSTREAM_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/** HTTP status codes for error types */
export const ErrorCodeToStatus: Record<ApiErrorCode, number> = {
  [ApiErrorCode.AUTH_REQUIRED]: 401,
  [ApiErrorCode.AUTH_INVALID]: 401,
  [ApiErrorCode.AUTH_EXPIRED]: 401,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.QUOTA_EXCEEDED]: 429,
  [ApiErrorCode.INVALID_REQUEST]: 400,
  [ApiErrorCode.INVALID_PROVIDER]: 400,
  [ApiErrorCode.INVALID_MODEL]: 400,
  [ApiErrorCode.INVALID_PROMPT]: 400,
  [ApiErrorCode.INVALID_DIMENSIONS]: 400,
  [ApiErrorCode.INVALID_PARAMS]: 400,
  [ApiErrorCode.PROVIDER_ERROR]: 502,
  [ApiErrorCode.GENERATION_FAILED]: 500,
  [ApiErrorCode.UPSTREAM_ERROR]: 502,
  [ApiErrorCode.TIMEOUT]: 504,
  [ApiErrorCode.UNKNOWN]: 500,
}

/** Unified error response structure */
export interface ApiErrorResponse {
  /** Human-readable error message */
  error: string
  /** Machine-readable error code */
  code: ApiErrorCode
  /** Additional error details (optional) */
  details?: {
    /** Provider that caused the error */
    provider?: string
    /** Original error message from upstream */
    upstream?: string
    /** Field that caused validation error */
    field?: string
    /** Retry after seconds (for rate limiting) */
    retryAfter?: number
  }
}

/** Custom API Error class */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly statusCode: number
  readonly details?: ApiErrorResponse['details']

  constructor(message: string, code: ApiErrorCode, details?: ApiErrorResponse['details']) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = ErrorCodeToStatus[code]
    this.details = details
  }

  toResponse(): ApiErrorResponse {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    }
  }
}

/** Helper to create common errors */
export const Errors = {
  authRequired: (provider: string) =>
    new ApiError(`API token is required for ${provider}`, ApiErrorCode.AUTH_REQUIRED, { provider }),

  authInvalid: (provider: string, upstream?: string) =>
    new ApiError(`Invalid API token for ${provider}`, ApiErrorCode.AUTH_INVALID, {
      provider,
      upstream,
    }),

  authExpired: (provider: string) =>
    new ApiError(`API token has expired for ${provider}`, ApiErrorCode.AUTH_EXPIRED, { provider }),

  rateLimited: (provider: string, retryAfter?: number) =>
    new ApiError(
      `Rate limited by ${provider}. Please try again later.`,
      ApiErrorCode.RATE_LIMITED,
      {
        provider,
        retryAfter,
      }
    ),

  quotaExceeded: (provider: string) =>
    new ApiError(`API quota exceeded for ${provider}`, ApiErrorCode.QUOTA_EXCEEDED, { provider }),

  invalidProvider: (provider: string) =>
    new ApiError(`Invalid provider: ${provider}`, ApiErrorCode.INVALID_PROVIDER),

  invalidModel: (model: string, provider: string) =>
    new ApiError(`Invalid model: ${model} for provider ${provider}`, ApiErrorCode.INVALID_MODEL, {
      provider,
    }),

  invalidPrompt: (reason: string) =>
    new ApiError(reason, ApiErrorCode.INVALID_PROMPT, { field: 'prompt' }),

  invalidDimensions: (reason: string) =>
    new ApiError(reason, ApiErrorCode.INVALID_DIMENSIONS, { field: 'dimensions' }),

  invalidParams: (field: string, reason: string) =>
    new ApiError(reason, ApiErrorCode.INVALID_PARAMS, { field }),

  providerError: (provider: string, upstream: string) =>
    new ApiError(`${provider} error: ${upstream}`, ApiErrorCode.PROVIDER_ERROR, {
      provider,
      upstream,
    }),

  generationFailed: (provider: string, reason?: string) =>
    new ApiError(
      reason || `Image generation failed on ${provider}`,
      ApiErrorCode.GENERATION_FAILED,
      { provider }
    ),

  timeout: (provider: string) =>
    new ApiError(`Request to ${provider} timed out`, ApiErrorCode.TIMEOUT, { provider }),

  unknown: (message?: string) =>
    new ApiError(message || 'An unknown error occurred', ApiErrorCode.UNKNOWN),
}
