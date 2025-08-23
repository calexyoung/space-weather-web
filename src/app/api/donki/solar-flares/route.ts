import { NextRequest, NextResponse } from 'next/server'
import { fetchHEKFlares, normalizeHEKFlare, mergeFlareData } from '@/lib/sources/hek-client'

const DONKI_API_KEY = process.env.NASA_API_KEY?.replace(/"/g, '') || 'DEMO_KEY'
const DONKI_BASE_URL = 'https://api.nasa.gov/DONKI'

// Cache for storing API responses
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface SolarFlare {
  flrID: string
  beginTime: string
  peakTime: string | null
  endTime: string | null
  classType: string
  sourceLocation: string
  activeRegionNum: number | null
  linkedEvents: Array<{
    activityID: string
  }>
  instruments?: Array<{
    displayName: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateRange = searchParams.get('dateRange') || '24h'
    
    // Check cache first
    const cacheKey = `flares-${dateRange}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data)
    }
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    
    switch(dateRange) {
      case '24h':
        startDate.setDate(startDate.getDate() - 1)
        break
      case '3d':
        startDate.setDate(startDate.getDate() - 3)
        break
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      default:
        startDate.setDate(startDate.getDate() - 1)
    }
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    // Fetch FLR (Solar Flare) events from DONKI
    const url = `${DONKI_BASE_URL}/FLR?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${DONKI_API_KEY}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    })
    
    if (!response.ok) {
      // If rate limited or error, return sample data
      if (response.status === 429 || response.status === 403) {
        console.warn('NASA DONKI API rate limited, returning sample data')
        return NextResponse.json(getSampleFlareData(dateRange))
      }
      throw new Error(`DONKI API error: ${response.status}`)
    }
    
    const donkiData: SolarFlare[] = await response.json()
    
    // Format DONKI flares
    const formattedDonkiFlares = donkiData.map(flare => ({
      id: flare.flrID,
      classType: flare.classType,
      beginTime: flare.beginTime,
      peakTime: flare.peakTime,
      endTime: flare.endTime,
      duration: flare.endTime && flare.beginTime ? 
        (new Date(flare.endTime).getTime() - new Date(flare.beginTime).getTime()) / (1000 * 60) : null, // duration in minutes
      sourceLocation: flare.sourceLocation || 'N/A',
      activeRegionNum: flare.activeRegionNum,
      linkedEvents: flare.linkedEvents || [],
      instruments: flare.instruments || [],
      // Determine flare intensity
      intensity: getFlareIntensity(flare.classType),
      // Add impact assessment
      potentialImpact: assessFlareImpact(flare.classType)
    }))
    
    // Fetch HEK flares for the same time period
    let hekFlares: any[] = []
    try {
      const hekEvents = await fetchHEKFlares({
        startDate: startDate,
        endDate: endDate,
        eventType: 'FL',
        pageSize: 200
      })
      
      // Normalize HEK flares to match our format
      hekFlares = hekEvents.map(normalizeHEKFlare)
    } catch (hekError) {
      console.warn('Failed to fetch HEK flares, continuing with DONKI data only:', hekError)
    }
    
    // Merge DONKI and HEK flares, removing duplicates
    const mergedFlares = mergeFlareData(formattedDonkiFlares, hekFlares)
    
    const responseData = {
      success: true,
      data: mergedFlares,
      count: mergedFlares.length,
      dateRange: {
        start: startDateStr,
        end: endDateStr
      },
      sources: {
        donki: formattedDonkiFlares.length,
        hek: hekFlares.length,
        total: mergedFlares.length
      }
    }
    
    // Cache the response
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() })
    
    return NextResponse.json(responseData)
    
  } catch (error) {
    console.error('Error fetching solar flares:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch solar flares'
      },
      { status: 500 }
    )
  }
}

function getFlareIntensity(classType: string): string {
  if (!classType) return 'Unknown'
  
  const firstChar = classType[0].toUpperCase()
  const magnitude = parseFloat(classType.substring(1))
  
  if (firstChar === 'X') {
    if (magnitude >= 10) return 'Extreme'
    if (magnitude >= 5) return 'Very Severe'
    return 'Severe'
  }
  if (firstChar === 'M') {
    if (magnitude >= 5) return 'Strong'
    return 'Moderate'
  }
  if (firstChar === 'C') return 'Common'
  if (firstChar === 'B') return 'Minor'
  return 'Minimal'
}

function assessFlareImpact(classType: string): string {
  if (!classType) return 'No significant impact expected'
  
  const firstChar = classType[0].toUpperCase()
  const magnitude = parseFloat(classType.substring(1))
  
  if (firstChar === 'X') {
    if (magnitude >= 10) {
      return 'Extreme: Complete HF blackout on sunlit side, major satellite damage possible'
    }
    if (magnitude >= 5) {
      return 'Very Severe: Extended HF blackout, satellite operations disrupted'
    }
    return 'Severe: Wide area HF blackout, satellite navigation degraded'
  }
  if (firstChar === 'M') {
    if (magnitude >= 5) {
      return 'Strong: Limited HF blackout on sunlit side, minor satellite effects'
    }
    return 'Moderate: Brief HF radio blackouts on sunlit side'
  }
  if (firstChar === 'C') {
    return 'Common: Minor impact on HF radio in polar regions'
  }
  return 'Minimal: No significant impact expected'
}

function getSampleFlareData(dateRange: string) {
  const now = new Date()
  const sampleFlares = []
  
  // Generate sample flares based on date range
  const numFlares = dateRange === '24h' ? 3 : dateRange === '3d' ? 8 : dateRange === '7d' ? 15 : 30
  
  for (let i = 0; i < numFlares; i++) {
    const hoursAgo = Math.random() * (dateRange === '24h' ? 24 : dateRange === '3d' ? 72 : dateRange === '7d' ? 168 : 720)
    const beginTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    const peakTime = new Date(beginTime.getTime() + Math.random() * 30 * 60 * 1000) // Peak within 30 minutes
    const endTime = new Date(peakTime.getTime() + Math.random() * 60 * 60 * 1000) // End within 1 hour of peak
    
    const classes = ['X1.2', 'M5.4', 'M2.1', 'C8.9', 'C5.3', 'C2.1', 'B9.8']
    const classType = classes[Math.floor(Math.random() * classes.length)]
    const source = Math.random() > 0.5 ? 'DONKI' : 'HEK'
    
    sampleFlares.push({
      id: source === 'DONKI' ? `FL${beginTime.getTime()}` : `HEK_${beginTime.getTime()}`,
      classType,
      beginTime: beginTime.toISOString(),
      peakTime: peakTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: (endTime.getTime() - beginTime.getTime()) / (1000 * 60),
      sourceLocation: `N${Math.floor(Math.random() * 30)}${Math.random() > 0.5 ? 'E' : 'W'}${Math.floor(Math.random() * 90)}`,
      activeRegionNum: Math.random() > 0.3 ? 13500 + Math.floor(Math.random() * 100) : null,
      intensity: getFlareIntensity(classType),
      potentialImpact: assessFlareImpact(classType),
      linkedEvents: [],
      instruments: source === 'DONKI' ? [{ displayName: 'GOES-16' }] : [],
      source: source
    })
  }
  
  // Sort by begin time (most recent first)
  sampleFlares.sort((a, b) => 
    new Date(b.beginTime).getTime() - new Date(a.beginTime).getTime()
  )
  
  const donkiCount = sampleFlares.filter(f => f.source === 'DONKI').length
  const hekCount = sampleFlares.filter(f => f.source === 'HEK').length
  
  return {
    success: true,
    data: sampleFlares,
    count: sampleFlares.length,
    dateRange: {
      start: new Date(now.getTime() - (dateRange === '24h' ? 24 : dateRange === '3d' ? 72 : dateRange === '7d' ? 168 : 720) * 60 * 60 * 1000).toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    },
    sources: {
      donki: donkiCount,
      hek: hekCount,
      total: sampleFlares.length
    },
    note: 'Sample data - NASA DONKI API temporarily unavailable'
  }
}