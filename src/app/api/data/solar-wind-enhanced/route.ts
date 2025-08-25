import { NextResponse } from 'next/server'
import { z } from 'zod'
import { 
  SolarWindSchema, 
  MagneticFieldSchema,
  NOAAPlasmaResponseSchema,
  NOAAMagResponseSchema,
  validateData,
  sanitizeNumericValue,
  crossValidateData
} from '@/lib/data-quality/validator'
import { fetchWithQuality, fetchMultipleSources } from '@/lib/data-quality/fetcher'
import { dataQualityMonitor } from '@/lib/data-quality/monitor'
import { fetchWithCache, generateCacheKey, dataCache } from '@/lib/data-quality/cache'

const NOAA_BASE_URL = 'https://services.swpc.noaa.gov'

// Response schema for this endpoint
const SolarWindResponseSchema = z.object({
  data: z.object({
    current: z.object({
      speed: z.number(),
      density: z.number(),
      temperature: z.number(),
      magneticField: z.object({
        bt: z.number(),
        bz: z.number(),
        by: z.number(),
        bx: z.number()
      }),
      timestamp: z.string()
    }),
    trend: z.object({
      speed: z.enum(['increasing', 'decreasing', 'stable']),
      density: z.enum(['increasing', 'decreasing', 'stable']),
      bz: z.enum(['northward', 'southward', 'variable'])
    }),
    quality: z.object({
      overall: z.number(),
      sources: z.array(z.object({
        name: z.string(),
        status: z.string(),
        quality: z.number()
      }))
    }),
    forecast: z.object({
      nextHour: z.object({
        speed: z.number(),
        confidence: z.number()
      })
    }),
    alerts: z.array(z.object({
      type: z.string(),
      severity: z.string(),
      message: z.string()
    }))
  }),
  meta: z.object({
    timestamp: z.string(),
    sources: z.array(z.string()),
    quality: z.number(),
    cached: z.boolean(),
    latency: z.number()
  })
})

type SolarWindResponse = z.infer<typeof SolarWindResponseSchema>

export async function GET(request: Request) {
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const forceRefresh = searchParams.get('refresh') === 'true'
  
  try {
    // Generate cache key
    const cacheKey = generateCacheKey('solar-wind-enhanced', { 
      timestamp: Math.floor(Date.now() / 60000) // 1-minute cache buckets
    })
    
    // Try to get from cache first
    if (!forceRefresh) {
      const cached = await dataCache.get<SolarWindResponse>(cacheKey)
      if (cached) {
        // Record cache hit in monitor
        dataQualityMonitor.recordMetric({
          endpoint: 'solar-wind-enhanced',
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          success: true,
          dataQuality: cached.meta.quality,
          completeness: 100,
          validationErrors: [],
          isCache: true,
          isFallback: false
        })
        
        return NextResponse.json(cached)
      }
    }
    
    // Fetch from multiple sources in parallel
    const [plasmaResult, magResult, aceResult, dscovrResult] = await Promise.all([
      // Primary: NOAA 7-day plasma
      fetchWithQuality(`${NOAA_BASE_URL}/products/solar-wind/plasma-7-day.json`, {
        timeout: 5000,
        retries: 2,
        validator: NOAAPlasmaResponseSchema
      }),
      
      // Primary: NOAA 7-day mag
      fetchWithQuality(`${NOAA_BASE_URL}/products/solar-wind/mag-7-day.json`, {
        timeout: 5000,
        retries: 2,
        validator: NOAAMagResponseSchema
      }),
      
      // Backup: ACE real-time
      fetchWithQuality(`${NOAA_BASE_URL}/json/ace/swepam/ace_swepam_1h.json`, {
        timeout: 5000,
        retries: 1
      }),
      
      // Backup: DSCOVR
      fetchWithQuality(`${NOAA_BASE_URL}/json/rtsw/rtsw_wind_1m.json`, {
        timeout: 5000,
        retries: 1
      })
    ])
    
    // Process and validate primary data
    let solarWindData = null
    let magneticData = null
    
    if (plasmaResult.data && plasmaResult.meta.quality > 50) {
      const parsed = NOAAPlasmaResponseSchema.parse(plasmaResult.data)
      if (parsed.length > 0) {
        const latest = parsed[parsed.length - 1]
        solarWindData = {
          speed: sanitizeNumericValue(latest.speed, 200, 3000, 400),
          density: sanitizeNumericValue(latest.density, 0, 200, 5),
          temperature: sanitizeNumericValue(latest.temperature, 1000, 10000000, 100000),
          timestamp: latest.timestamp
        }
      }
    }
    
    if (magResult.data && magResult.meta.quality > 50) {
      const parsed = NOAAMagResponseSchema.parse(magResult.data)
      if (parsed.length > 0) {
        const latest = parsed[parsed.length - 1]
        magneticData = {
          bt: sanitizeNumericValue(latest.bt, 0, 100, 5),
          bz: sanitizeNumericValue(latest.bz, -50, 50, 0),
          by: sanitizeNumericValue(latest.by, -50, 50, 0),
          bx: sanitizeNumericValue(latest.bx, -50, 50, 0),
          timestamp: latest.timestamp
        }
      }
    }
    
    // Cross-validate with backup sources if primary failed
    const sources = []
    
    if (solarWindData && magneticData) {
      sources.push({
        name: 'NOAA Primary',
        data: { solarWind: solarWindData, magnetic: magneticData },
        quality: Math.min(plasmaResult.meta.quality, magResult.meta.quality)
      })
    }
    
    if (aceResult.data && aceResult.meta.quality > 40) {
      sources.push({
        name: 'ACE Satellite',
        data: processACEData(aceResult.data),
        quality: aceResult.meta.quality
      })
    }
    
    if (dscovrResult.data && dscovrResult.meta.quality > 40) {
      sources.push({
        name: 'DSCOVR',
        data: processDSCOVRData(dscovrResult.data),
        quality: dscovrResult.meta.quality
      })
    }
    
    // Get consensus data
    const consensus = crossValidateData(sources)
    
    if (!consensus.consensus) {
      throw new Error('No valid solar wind data available from any source')
    }
    
    const finalData = consensus.consensus
    
    // Calculate trends
    const trends = calculateTrends(plasmaResult.data || [], magResult.data || [])
    
    // Generate alerts
    const alerts = generateAlerts(finalData)
    
    // Simple forecast (placeholder - could use ML model)
    const forecast = {
      nextHour: {
        speed: finalData.solarWind.speed ?? 400,
        confidence: consensus.confidence
      }
    }
    
    // Build response
    const response: SolarWindResponse = {
      data: {
        current: {
          speed: finalData.solarWind.speed ?? 400,
          density: finalData.solarWind.density ?? 5,
          temperature: finalData.solarWind.temperature ?? 100000,
          magneticField: {
            bt: finalData.magnetic.bt ?? 5,
            bz: finalData.magnetic.bz ?? 0,
            by: finalData.magnetic.by ?? 0,
            bx: finalData.magnetic.bx ?? 0
          },
          timestamp: new Date().toISOString()
        },
        trend: trends,
        quality: {
          overall: consensus.confidence,
          sources: sources.map(s => ({
            name: s.name,
            status: s.quality > 70 ? 'healthy' : s.quality > 40 ? 'degraded' : 'poor',
            quality: s.quality
          }))
        },
        forecast,
        alerts
      },
      meta: {
        timestamp: new Date().toISOString(),
        sources: sources.map(s => s.name),
        quality: consensus.confidence,
        cached: false,
        latency: Date.now() - startTime
      }
    }
    
    // Validate response
    const validation = validateData(SolarWindResponseSchema, response, {
      checkCompleteness: true
    })
    
    if (!validation.isValid) {
      console.error('Response validation failed:', validation.errors)
    }
    
    // Cache the response
    await dataCache.set(cacheKey, response, 60000) // 1 minute TTL
    
    // Record success metric
    dataQualityMonitor.recordMetric({
      endpoint: 'solar-wind-enhanced',
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
      success: true,
      dataQuality: consensus.confidence,
      completeness: validation.completeness,
      validationErrors: validation.errors,
      isCache: false,
      isFallback: consensus.outliers.length > 0
    })
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Solar wind API error:', error)
    
    // Record failure metric
    dataQualityMonitor.recordMetric({
      endpoint: 'solar-wind-enhanced',
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
      success: false,
      dataQuality: 0,
      completeness: 0,
      validationErrors: [error instanceof Error ? error.message : 'Unknown error'],
      isCache: false,
      isFallback: false
    })
    
    // Try to return cached data as fallback
    const cacheKey = generateCacheKey('solar-wind-enhanced', {})
    const fallback = await dataCache.get<SolarWindResponse>(cacheKey)
    
    if (fallback) {
      return NextResponse.json({
        ...fallback,
        meta: {
          ...fallback.meta,
          cached: true,
          quality: 30,
          latency: Date.now() - startTime
        }
      })
    }
    
    return NextResponse.json({
      error: 'Failed to fetch solar wind data',
      message: error instanceof Error ? error.message : 'Unknown error',
      fallback: 'No cached data available'
    }, { status: 500 })
  }
}

// Helper functions
function processACEData(data: any) {
  // Process ACE satellite data format
  if (!Array.isArray(data) || data.length === 0) {
    return null
  }
  
  const latest = data[data.length - 1]
  return {
    solarWind: {
      speed: sanitizeNumericValue(latest.proton_speed, 200, 3000, 400),
      density: sanitizeNumericValue(latest.proton_density, 0, 200, 5),
      temperature: sanitizeNumericValue(latest.proton_temperature, 1000, 10000000, 100000),
      timestamp: latest.time_tag
    },
    magnetic: {
      bt: 5, // ACE doesn't provide this directly
      bz: 0,
      by: 0,
      bx: 0,
      timestamp: latest.time_tag
    }
  }
}

function processDSCOVRData(data: any) {
  // Process DSCOVR data format
  if (!Array.isArray(data) || data.length === 0) {
    return null
  }
  
  const latest = data[data.length - 1]
  return {
    solarWind: {
      speed: sanitizeNumericValue(latest[2], 200, 3000, 400),
      density: sanitizeNumericValue(latest[1], 0, 200, 5),
      temperature: 100000, // DSCOVR doesn't provide temperature
      timestamp: latest[0]
    },
    magnetic: {
      bt: sanitizeNumericValue(latest[3], 0, 100, 5),
      bz: sanitizeNumericValue(latest[4], -50, 50, 0),
      by: 0,
      bx: 0,
      timestamp: latest[0]
    }
  }
}

function calculateTrends(plasmaHistory: any[], magHistory: any[]): any {
  // Simple trend calculation based on recent history
  const trends = {
    speed: 'stable' as 'stable' | 'increasing' | 'decreasing',
    density: 'stable' as 'stable' | 'increasing' | 'decreasing',
    bz: 'variable' as 'variable' | 'southward' | 'northward'
  }
  
  if (plasmaHistory.length > 10) {
    const recent = plasmaHistory.slice(-10)
    const speeds = recent.map((d: any) => d[2]).filter((v: any) => v !== null)
    
    if (speeds.length > 2) {
      const firstHalf = speeds.slice(0, Math.floor(speeds.length / 2))
      const secondHalf = speeds.slice(Math.floor(speeds.length / 2))
      const firstAvg = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length
      
      if (secondAvg > firstAvg * 1.1) trends.speed = 'increasing'
      else if (secondAvg < firstAvg * 0.9) trends.speed = 'decreasing'
    }
  }
  
  if (magHistory.length > 5) {
    const recent = magHistory.slice(-5)
    const bzValues = recent.map((d: any) => d[3]).filter((v: any) => v !== null)
    
    if (bzValues.length > 0) {
      const avgBz = bzValues.reduce((a: number, b: number) => a + b, 0) / bzValues.length
      if (avgBz < -5) trends.bz = 'southward'
      else if (avgBz > 5) trends.bz = 'northward'
    }
  }
  
  return trends
}

function generateAlerts(data: any): any[] {
  const alerts = []
  
  // High speed solar wind
  if (data.solarWind.speed > 600) {
    alerts.push({
      type: 'solar_wind',
      severity: data.solarWind.speed > 800 ? 'high' : 'medium',
      message: `High speed solar wind detected: ${data.solarWind.speed} km/s`
    })
  }
  
  // Southward Bz (geomagnetic storm potential)
  if (data.magnetic.bz < -10) {
    alerts.push({
      type: 'magnetic',
      severity: data.magnetic.bz < -20 ? 'high' : 'medium',
      message: `Strong southward Bz: ${data.magnetic.bz} nT - Geomagnetic storm likely`
    })
  }
  
  // High density
  if (data.solarWind.density > 20) {
    alerts.push({
      type: 'density',
      severity: 'low',
      message: `Elevated solar wind density: ${data.solarWind.density} p/cm³`
    })
  }
  
  return alerts
}