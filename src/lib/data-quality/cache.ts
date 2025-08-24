// Simple in-memory cache implementation
// In production, this should be replaced with Redis

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private maxSize = 1000
  private defaultTTL = 5 * 60 * 1000 // 5 minutes
  
  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0
  }
  
  constructor(options?: { maxSize?: number; defaultTTL?: number }) {
    if (options?.maxSize) this.maxSize = options.maxSize
    if (options?.defaultTTL) this.defaultTTL = options.defaultTTL
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000)
  }
  
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }
    
    // Update hit count
    entry.hits++
    this.stats.hits++
    
    return entry.data as T
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Check size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }
    
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0
    })
    
    this.stats.sets++
  }
  
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }
  
  async clear(): Promise<void> {
    this.cache.clear()
  }
  
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }
  
  // Get cache statistics
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    }
  }
  
  // Evict least recently used entry
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      const lastAccess = entry.timestamp + (entry.hits * 1000) // Factor in hits
      if (lastAccess < oldestTime) {
        oldestTime = lastAccess
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
    }
  }
  
  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        keysToDelete.push(key)
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key)
    }
  }
  
  // Get all keys
  keys(): string[] {
    return Array.from(this.cache.keys())
  }
  
  // Get cache size
  size(): number {
    return this.cache.size
  }
}

// Create cache instances for different data types
export const dataCache = new InMemoryCache({
  maxSize: 500,
  defaultTTL: 60 * 1000 // 1 minute for real-time data
})

export const analysisCache = new InMemoryCache({
  maxSize: 200,
  defaultTTL: 5 * 60 * 1000 // 5 minutes for analysis results
})

export const staticCache = new InMemoryCache({
  maxSize: 100,
  defaultTTL: 60 * 60 * 1000 // 1 hour for static data
})

// Cache key generators
export function generateCacheKey(endpoint: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint
  }
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  return `${endpoint}?${sortedParams}`
}

// Cache wrapper for fetch operations
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: {
    ttl?: number
    cache?: InMemoryCache
    force?: boolean
  }
): Promise<{ data: T; cached: boolean }> {
  const cache = options?.cache || dataCache
  
  // Check cache first unless forced refresh
  if (!options?.force) {
    const cached = await cache.get<T>(key)
    if (cached !== null) {
      return { data: cached, cached: true }
    }
  }
  
  // Fetch fresh data
  try {
    const data = await fetchFn()
    
    // Cache the result
    await cache.set(key, data, options?.ttl)
    
    return { data, cached: false }
  } catch (error) {
    // Try cache as fallback on error
    const cached = await cache.get<T>(key)
    if (cached !== null) {
      console.warn(`Using cached data for ${key} due to fetch error:`, error)
      return { data: cached, cached: true }
    }
    
    throw error
  }
}

// Batch cache operations
export async function batchGet<T>(
  keys: string[],
  cache: InMemoryCache = dataCache
): Promise<Map<string, T | null>> {
  const results = new Map<string, T | null>()
  
  for (const key of keys) {
    results.set(key, await cache.get<T>(key))
  }
  
  return results
}

export async function batchSet<T>(
  entries: Array<{ key: string; value: T; ttl?: number }>,
  cache: InMemoryCache = dataCache
): Promise<void> {
  for (const entry of entries) {
    await cache.set(entry.key, entry.value, entry.ttl)
  }
}

// Cache warming utility
export async function warmCache(
  endpoints: Array<{
    key: string
    fetchFn: () => Promise<any>
    ttl?: number
  }>
): Promise<{ successful: number; failed: number }> {
  let successful = 0
  let failed = 0
  
  await Promise.all(
    endpoints.map(async ({ key, fetchFn, ttl }) => {
      try {
        const data = await fetchFn()
        await dataCache.set(key, data, ttl)
        successful++
      } catch (error) {
        console.error(`Failed to warm cache for ${key}:`, error)
        failed++
      }
    })
  )
  
  return { successful, failed }
}

// Cache invalidation patterns
export async function invalidatePattern(
  pattern: string | RegExp,
  cache: InMemoryCache = dataCache
): Promise<number> {
  const keys = cache.keys()
  let invalidated = 0
  
  for (const key of keys) {
    const matches = typeof pattern === 'string' 
      ? key.includes(pattern)
      : pattern.test(key)
    
    if (matches) {
      await cache.delete(key)
      invalidated++
    }
  }
  
  return invalidated
}

// Export cache statistics for monitoring
export function getAllCacheStats() {
  return {
    data: dataCache.getStats(),
    analysis: analysisCache.getStats(),
    static: staticCache.getStats(),
    total: {
      size: dataCache.size() + analysisCache.size() + staticCache.size(),
      hits: dataCache.getStats().hits + analysisCache.getStats().hits + staticCache.getStats().hits,
      misses: dataCache.getStats().misses + analysisCache.getStats().misses + staticCache.getStats().misses
    }
  }
}