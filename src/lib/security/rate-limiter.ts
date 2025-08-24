import { NextRequest, NextResponse } from 'next/server'
import { LRUCache } from 'lru-cache'
import crypto from 'crypto'

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  windowMs?: number           // Time window in milliseconds
  maxRequests?: number         // Max requests per window
  keyGenerator?: (req: NextRequest) => string  // Custom key generator
  skipSuccessfulRequests?: boolean  // Don't count successful requests
  skipFailedRequests?: boolean      // Don't count failed requests
  message?: string                   // Custom error message
  standardHeaders?: boolean          // Return rate limit info in headers
  legacyHeaders?: boolean           // Return legacy X-RateLimit headers
}

/**
 * Rate limit tiers for different operations
 */
export const RATE_LIMIT_TIERS = {
  // Authentication endpoints - strict limits
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,            // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later'
  },
  
  // API read operations - moderate limits
  API_READ: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 100,           // 100 requests per minute
    message: 'Too many requests, please slow down'
  },
  
  // API write operations - stricter limits
  API_WRITE: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 30,            // 30 requests per minute
    message: 'Too many write operations, please slow down'
  },
  
  // Report generation - very strict
  REPORT_GENERATION: {
    windowMs: 5 * 60 * 1000,   // 5 minutes
    maxRequests: 3,             // 3 reports per 5 minutes
    message: 'Report generation limit reached, please wait before generating more reports'
  },
  
  // Public endpoints - relaxed limits
  PUBLIC: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 200,           // 200 requests per minute
    message: 'Rate limit exceeded'
  },
  
  // Health check - very relaxed
  HEALTH: {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 1000,          // 1000 requests per minute
    message: 'Health check rate limit exceeded'
  }
}

/**
 * Rate limit store
 */
interface RateLimitEntry {
  count: number
  resetTime: number
}

/**
 * Create rate limiter instance
 */
export class RateLimiter {
  private cache: LRUCache<string, RateLimitEntry>
  private config: Required<RateLimitConfig>
  
  constructor(config: RateLimitConfig = {}) {
    this.config = {
      windowMs: config.windowMs || 60 * 1000,
      maxRequests: config.maxRequests || 100,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      message: config.message || 'Too many requests, please try again later',
      standardHeaders: config.standardHeaders !== false,
      legacyHeaders: config.legacyHeaders !== false,
    }
    
    // Initialize LRU cache
    this.cache = new LRUCache<string, RateLimitEntry>({
      max: 10000, // Max 10,000 unique clients
      ttl: this.config.windowMs,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    })
  }
  
  /**
   * Default key generator (IP + User ID if authenticated)
   */
  private defaultKeyGenerator(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    const userId = req.headers.get('x-user-id') || 'anonymous'
    const path = new URL(req.url).pathname
    
    // Combine IP, user ID, and path for rate limiting key
    return crypto
      .createHash('sha256')
      .update(`${ip}:${userId}:${path}`)
      .digest('hex')
      .substring(0, 32)
  }
  
  /**
   * Check if request should be rate limited
   */
  async check(req: NextRequest): Promise<{
    allowed: boolean
    limit: number
    remaining: number
    resetTime: Date
    retryAfter?: number
  }> {
    const key = this.config.keyGenerator(req)
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    
    // Get or create entry
    let entry = this.cache.get(key)
    
    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + this.config.windowMs
      }
      this.cache.set(key, entry)
      
      return {
        allowed: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: new Date(entry.resetTime)
      }
    }
    
    // Increment count
    entry.count++
    this.cache.set(key, entry)
    
    // Check if limit exceeded
    const allowed = entry.count <= this.config.maxRequests
    const remaining = Math.max(0, this.config.maxRequests - entry.count)
    const retryAfter = allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000)
    
    return {
      allowed,
      limit: this.config.maxRequests,
      remaining,
      resetTime: new Date(entry.resetTime),
      retryAfter
    }
  }
  
  /**
   * Reset rate limit for a specific key
   */
  reset(req: NextRequest): void {
    const key = this.config.keyGenerator(req)
    this.cache.delete(key)
  }
  
  /**
   * Clear all rate limit entries
   */
  clear(): void {
    this.cache.clear()
  }
  
  /**
   * Get rate limit headers
   */
  getHeaders(result: {
    limit: number
    remaining: number
    resetTime: Date
    retryAfter?: number
  }): Record<string, string> {
    const headers: Record<string, string> = {}
    
    if (this.config.standardHeaders) {
      headers['RateLimit-Limit'] = result.limit.toString()
      headers['RateLimit-Remaining'] = result.remaining.toString()
      headers['RateLimit-Reset'] = Math.floor(result.resetTime.getTime() / 1000).toString()
    }
    
    if (this.config.legacyHeaders) {
      headers['X-RateLimit-Limit'] = result.limit.toString()
      headers['X-RateLimit-Remaining'] = result.remaining.toString()
      headers['X-RateLimit-Reset'] = result.resetTime.toISOString()
    }
    
    if (result.retryAfter !== undefined) {
      headers['Retry-After'] = result.retryAfter.toString()
    }
    
    return headers
  }
}

/**
 * Global rate limiters for different endpoint types
 */
const rateLimiters = new Map<string, RateLimiter>()

/**
 * Get or create rate limiter for a specific tier
 */
export function getRateLimiter(tier: keyof typeof RATE_LIMIT_TIERS): RateLimiter {
  if (!rateLimiters.has(tier)) {
    rateLimiters.set(tier, new RateLimiter(RATE_LIMIT_TIERS[tier]))
  }
  return rateLimiters.get(tier)!
}

/**
 * Rate limit middleware
 */
export async function rateLimit(
  request: NextRequest,
  tier: keyof typeof RATE_LIMIT_TIERS = 'API_READ'
): Promise<NextResponse | null> {
  const limiter = getRateLimiter(tier)
  const result = await limiter.check(request)
  
  if (!result.allowed) {
    const headers = limiter.getHeaders(result)
    
    return NextResponse.json(
      {
        success: false,
        error: RATE_LIMIT_TIERS[tier].message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.retryAfter,
        resetTime: result.resetTime.toISOString()
      },
      {
        status: 429,
        headers
      }
    )
  }
  
  // Add rate limit headers to successful responses
  // This will be done in the middleware
  return null
}

/**
 * Apply rate limiting to a handler
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  tier: keyof typeof RATE_LIMIT_TIERS = 'API_READ'
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const rateLimitResponse = await rateLimit(request, tier)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    const response = await handler(request)
    
    // Add rate limit headers to successful response
    const limiter = getRateLimiter(tier)
    const result = await limiter.check(request)
    const headers = limiter.getHeaders(result)
    
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}

/**
 * IP-based rate limiter for DDoS protection
 */
export class IPRateLimiter {
  private cache: LRUCache<string, number>
  
  constructor(
    private maxRequestsPerIP: number = 1000,
    private windowMs: number = 60 * 1000
  ) {
    this.cache = new LRUCache<string, number>({
      max: 100000, // Track up to 100k IPs
      ttl: windowMs,
      updateAgeOnGet: false,
    })
  }
  
  check(ip: string): boolean {
    const count = (this.cache.get(ip) || 0) + 1
    this.cache.set(ip, count)
    return count <= this.maxRequestsPerIP
  }
}

// Global IP rate limiter
export const ipRateLimiter = new IPRateLimiter()