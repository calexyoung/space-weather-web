import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple rate limiter for Edge Runtime
 * Uses a Map to track request counts per IP
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Rate limit configuration tiers
 */
export const RATE_LIMITS = {
  AUTH: { window: 15 * 60 * 1000, max: 5 },           // 5 attempts per 15 min
  API_WRITE: { window: 60 * 1000, max: 30 },          // 30 writes per minute  
  API_READ: { window: 60 * 1000, max: 100 },          // 100 reads per minute
  REPORT_GENERATION: { window: 5 * 60 * 1000, max: 3 }, // 3 reports per 5 min
  PUBLIC: { window: 60 * 1000, max: 200 },            // 200 requests per minute
  HEALTH: { window: 60 * 1000, max: 1000 },           // 1000 requests per minute
}

/**
 * Get key for rate limiting (IP + path based)
 */
function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const pathname = new URL(request.url).pathname
  
  // Simple string concatenation for Edge compatibility
  return `${ip}:${pathname}`
}

/**
 * Check rate limit
 */
export function checkRateLimit(
  request: NextRequest,
  tier: keyof typeof RATE_LIMITS
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = getRateLimitKey(request)
  const now = Date.now()
  const config = RATE_LIMITS[tier]
  
  // Get or create entry
  let entry = rateLimitStore.get(key)
  
  // Clean old entries periodically
  if (rateLimitStore.size > 10000) {
    // Remove expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }
  }
  
  if (!entry || entry.resetTime < now) {
    // Create new window
    entry = {
      count: 1,
      resetTime: now + config.window
    }
    rateLimitStore.set(key, entry)
    
    return {
      allowed: true,
      remaining: config.max - 1,
      resetTime: entry.resetTime
    }
  }
  
  // Increment counter
  entry.count++
  rateLimitStore.set(key, entry)
  
  const allowed = entry.count <= config.max
  const remaining = Math.max(0, config.max - entry.count)
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime
  }
}

/**
 * Apply rate limiting middleware
 */
export async function applyRateLimit(
  request: NextRequest,
  tier: keyof typeof RATE_LIMITS
): Promise<NextResponse | null> {
  const result = checkRateLimit(request, tier)
  
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
        resetTime: new Date(result.resetTime).toISOString()
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': RATE_LIMITS[tier].max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          'Retry-After': retryAfter.toString()
        }
      }
    )
  }
  
  return null
}

/**
 * Get rate limit headers
 */
export function getRateLimitHeaders(
  request: NextRequest,
  tier: keyof typeof RATE_LIMITS
): Record<string, string> {
  const result = checkRateLimit(request, tier)
  const config = RATE_LIMITS[tier]
  
  return {
    'X-RateLimit-Limit': config.max.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    'X-RateLimit-Window': `${config.window / 1000}s`
  }
}