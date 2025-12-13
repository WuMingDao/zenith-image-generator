/**
 * Formatting Utilities
 */

/**
 * Calculate GCD (Greatest Common Divisor)
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * Format dimensions with aspect ratio
 * @example formatDimensions(1024, 768) => "1024 x 768 (4:3)"
 */
export function formatDimensions(width: number, height: number): string {
  const divisor = gcd(width, height)
  const ratioW = width / divisor
  const ratioH = height / divisor
  return `${width} x ${height} (${ratioW}:${ratioH})`
}

/**
 * Format duration in human-readable format
 * @example formatDuration(8500) => "8.5s"
 * @example formatDuration(500) => "500ms"
 */
export function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}
