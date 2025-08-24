import { z } from 'zod'
import { DataQualityMetaSchema } from './validator'

interface FetchOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  fallbackData?: any
  cache?: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any, ttl?: number) => Promise<void>
  }
  cacheTTL?: number
  validator?: z.ZodSchema
}

interface FetchResult<T> {
  data: T | null
  meta: z.infer<typeof DataQualityMetaSchema>
  error?: string
}

class CircuitBreaker {
  private failures: Map<string, number> = new Map()
  private lastFailTime: Map<string, number> = new Map()
  private state: Map<string, 'closed' | 'open' | 'half-open'> = new Map()
  
  private threshold = 5 // failures before opening
  private timeout = 60000 // 1 minute before trying again
  private halfOpenRequests = 0
  private maxHalfOpenRequests = 3
  
  isOpen(url: string): boolean {
    const state = this.state.get(url) || 'closed'
    
    if (state === 'open') {
      const lastFail = this.lastFailTime.get(url) || 0
      const now = Date.now()
      
      // Check if timeout has passed
      if (now - lastFail > this.timeout) {
        this.state.set(url, 'half-open')
        this.halfOpenRequests = 0
        return false
      }
      return true
    }
    
    return false
  }
  
  recordSuccess(url: string): void {
    this.failures.delete(url)
    this.lastFailTime.delete(url)
    this.state.set(url, 'closed')
    this.halfOpenRequests = 0
  }
  
  recordFailure(url: string): void {
    const failures = (this.failures.get(url) || 0) + 1
    this.failures.set(url, failures)
    this.lastFailTime.set(url, Date.now())
    
    const currentState = this.state.get(url) || 'closed'
    
    if (currentState === 'half-open') {
      this.halfOpenRequests++
      if (this.halfOpenRequests >= this.maxHalfOpenRequests) {
        this.state.set(url, 'open')
      }
    } else if (failures >= this.threshold) {
      this.state.set(url, 'open')
    }
  }
  
  getState(url: string): string {
    return this.state.get(url) || 'closed'
  }
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker()

// Exponential backoff calculator
function calculateBackoff(attempt: number, baseDelay: number = 300): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 10000) // Max 10 seconds
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Main fetch function with retry and fallback
export async function fetchWithQuality<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 300,
    fallbackData = null,
    cache,
    cacheTTL = 300000, // 5 minutes default
    validator
  } = options
  
  const startTime = Date.now()
  const meta: z.infer<typeof DataQualityMetaSchema> = {
    source: url,
    quality: 100,
    completeness: 100,
    latency: 0,
    isCache: false,
    isFallback: false,
    validationErrors: [],
    timestamp: new Date()
  }
  
  // Check circuit breaker
  if (circuitBreaker.isOpen(url)) {
    console.warn(`Circuit breaker OPEN for ${url}`)
    meta.quality = 0
    meta.validationErrors.push('Circuit breaker open - too many failures')
    
    // Try cache
    if (cache) {
      try {
        const cached = await cache.get(url)
        if (cached) {
          meta.isCache = true
          meta.quality = 70
          return { data: cached, meta }
        }
      } catch (e) {
        console.error('Cache retrieval failed:', e)
      }
    }
    
    // Use fallback
    if (fallbackData !== null) {
      meta.isFallback = true
      meta.quality = 50
      return { data: fallbackData, meta }
    }
    
    return { data: null, meta, error: 'Service unavailable' }
  }
  
  // Try fetching with retries
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SpaceWeather-Dashboard/2.0'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Validate if schema provided
      if (validator) {
        try {
          const validated = validator.parse(data)
          meta.quality = 100
          meta.completeness = 100
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            meta.validationErrors = validationError.errors.map(e => 
              `${e.path.join('.')}: ${e.message}`
            )
            meta.quality = 80 // Data received but validation issues
          }
        }
      }
      
      // Cache successful response
      if (cache && meta.quality > 70) {
        try {
          await cache.set(url, data, cacheTTL)
        } catch (e) {
          console.error('Cache storage failed:', e)
        }
      }
      
      // Record success with circuit breaker
      circuitBreaker.recordSuccess(url)
      
      meta.latency = Date.now() - startTime
      return { data, meta }
      
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on client errors (4xx)
      if (error instanceof Error && error.message.includes('HTTP 4')) {
        break
      }
      
      // Wait before retry
      if (attempt < retries) {
        const delay = calculateBackoff(attempt, retryDelay)
        console.warn(`Retry ${attempt + 1}/${retries} for ${url} after ${delay}ms`)
        await sleep(delay)
      }
    }
  }
  
  // Record failure with circuit breaker
  circuitBreaker.recordFailure(url)
  
  // All retries failed, try cache
  if (cache) {
    try {
      const cached = await cache.get(url)
      if (cached) {
        meta.isCache = true
        meta.quality = 60
        meta.validationErrors.push('Using cached data due to fetch failure')
        return { data: cached, meta }
      }
    } catch (e) {
      console.error('Cache retrieval failed:', e)
    }
  }
  
  // Use fallback as last resort
  if (fallbackData !== null) {
    meta.isFallback = true
    meta.quality = 40
    meta.validationErrors.push('Using fallback data due to fetch failure')
    return { data: fallbackData, meta }
  }
  
  // Complete failure
  meta.quality = 0
  meta.completeness = 0
  meta.latency = Date.now() - startTime
  
  return {
    data: null,
    meta,
    error: lastError?.message || 'Unknown error'
  }
}

// Parallel fetch with fallback to best available
export async function fetchMultipleSources<T>(
  sources: Array<{
    url: string
    priority: number
    validator?: z.ZodSchema
    transform?: (data: any) => T
  }>,
  options: Omit<FetchOptions, 'validator'> = {}
): Promise<FetchResult<T>> {
  // Sort by priority
  const sorted = [...sources].sort((a, b) => b.priority - a.priority)
  
  // Fetch all in parallel
  const results = await Promise.all(
    sorted.map(source => 
      fetchWithQuality(source.url, {
        ...options,
        validator: source.validator
      }).then(result => ({
        ...result,
        priority: source.priority,
        transform: source.transform
      }))
    )
  )
  
  // Find best result
  const validResults = results.filter(r => r.data !== null)
  
  if (validResults.length === 0) {
    return {
      data: null,
      meta: {
        source: 'multiple',
        quality: 0,
        completeness: 0,
        latency: 0,
        isCache: false,
        isFallback: false,
        validationErrors: ['All sources failed'],
        timestamp: new Date()
      },
      error: 'All sources failed'
    }
  }
  
  // Sort by quality and priority
  validResults.sort((a, b) => {
    const qualityDiff = b.meta.quality - a.meta.quality
    return qualityDiff !== 0 ? qualityDiff : b.priority - a.priority
  })
  
  const best = validResults[0]
  const data = best.transform ? best.transform(best.data) : best.data
  
  return {
    data,
    meta: {
      ...best.meta,
      source: `${best.meta.source} (best of ${sources.length})`
    }
  }
}

// Health check for endpoints
export async function checkEndpointHealth(url: string): Promise<{
  healthy: boolean
  latency: number
  error?: string
}> {
  const start = Date.now()
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    
    return {
      healthy: response.ok,
      latency: Date.now() - start,
      error: response.ok ? undefined : `HTTP ${response.status}`
    }
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Batch health check
export async function checkMultipleEndpoints(
  urls: string[]
): Promise<Map<string, { healthy: boolean; latency: number }>> {
  const results = new Map()
  
  const checks = await Promise.all(
    urls.map(url => 
      checkEndpointHealth(url).then(result => ({ url, result }))
    )
  )
  
  for (const { url, result } of checks) {
    results.set(url, result)
  }
  
  return results
}

// Export circuit breaker status for monitoring
export function getCircuitBreakerStatus(): Map<string, string> {
  const status = new Map<string, string>()
  
  // This would need to be implemented in the CircuitBreaker class
  // to expose its internal state
  
  return status
}

// Smart retry with different endpoints
export async function fetchWithFallbackChain<T>(
  primaryUrl: string,
  fallbackUrls: string[],
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  // Try primary first
  const primaryResult = await fetchWithQuality<T>(primaryUrl, options)
  
  if (primaryResult.data !== null && primaryResult.meta.quality > 70) {
    return primaryResult
  }
  
  // Try fallbacks in order
  for (const fallbackUrl of fallbackUrls) {
    const fallbackResult = await fetchWithQuality<T>(fallbackUrl, options)
    
    if (fallbackResult.data !== null && fallbackResult.meta.quality > 50) {
      return {
        ...fallbackResult,
        meta: {
          ...fallbackResult.meta,
          source: `${fallbackUrl} (fallback from ${primaryUrl})`
        }
      }
    }
  }
  
  // All failed, return primary result with its error
  return primaryResult
}