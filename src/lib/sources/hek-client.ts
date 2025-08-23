/**
 * HEK (Heliophysics Events Knowledgebase) API Client
 * Documentation: http://solar.stanford.edu/hekwiki/ApplicationProgrammingInterface
 */

import { fetchWithTimeout } from '../http-client'

const HEK_BASE_URL = 'https://www.lmsal.com/hek/her'

export interface HEKFlareEvent {
  event_id: string
  kb_archivid: string
  event_type: string
  event_starttime: string
  event_endtime: string | null
  event_peaktime: string | null
  fl_goescls?: string // GOES class (e.g., X1.2, M5.4, C3.2)
  fl_peakflux?: number
  fl_peakfluxunit?: string
  ar_noaanum?: number // Active region number
  hpc_x?: number // Heliocentric position X
  hpc_y?: number // Heliocentric position Y
  hgs_x?: number // Stonyhurst longitude
  hgs_y?: number // Stonyhurst latitude
  frm_name?: string // Feature recognition method
  obs_observatory?: string
  obs_instrument?: string
  obs_channelid?: string
  refs?: string[]
  comment?: string
}

export interface HEKQueryParams {
  startDate: Date
  endDate: Date
  eventType?: string
  pageSize?: number
  page?: number
}

export interface HEKFlareData {
  id: string
  classType: string
  beginTime: string
  peakTime: string | null
  endTime: string | null
  duration: number | null
  sourceLocation: string
  activeRegionNum: number | null
  intensity: string
  potentialImpact: string
  source: 'HEK'
  observatory?: string
  instrument?: string
}

/**
 * Fetch solar flare events from HEK
 */
export async function fetchHEKFlares(params: HEKQueryParams): Promise<HEKFlareEvent[]> {
  const {
    startDate,
    endDate,
    eventType = 'FL', // FL for flares
    pageSize = 200,
    page = 1
  } = params

  // Format dates as required by HEK API (YYYY-MM-DDTHH:MM:SS)
  // Note: HEK API requires dates without milliseconds and without Z
  const startTime = startDate.toISOString().slice(0, 19)
  const endTime = endDate.toISOString().slice(0, 19)

  // Build query parameters - HEK expects specific format
  const queryParams = new URLSearchParams({
    cosec: '2', // Return JSON format
    cmd: 'search',
    type: 'column',
    event_type: eventType,
    event_starttime: startTime,
    event_endtime: endTime
  })

  const url = `${HEK_BASE_URL}?${queryParams}`

  try {
    const response = await fetchWithTimeout(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      console.error(`HEK API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json()
    
    // HEK returns data in result property
    if (data && data.result && Array.isArray(data.result)) {
      // If empty, generate sample data for demonstration
      if (data.result.length === 0 && process.env.NODE_ENV === 'development') {
        console.log('HEK API returned empty results, generating sample data for demonstration')
        return generateSampleHEKFlares(startDate, endDate)
      }
      return data.result
    }

    // Generate sample data in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('HEK API response invalid, generating sample data for demonstration')
      return generateSampleHEKFlares(startDate, endDate)
    }

    return []
  } catch (error) {
    console.error('Error fetching HEK flares:', error)
    return []
  }
}

/**
 * Convert HEK flare event to normalized format
 */
export function normalizeHEKFlare(hekFlare: HEKFlareEvent): HEKFlareData {
  // Extract GOES class or estimate from peak flux
  let classType = hekFlare.fl_goescls || estimateGOESClass(hekFlare.fl_peakflux)
  
  // Format location
  let sourceLocation = 'N/A'
  if (hekFlare.hgs_x !== undefined && hekFlare.hgs_y !== undefined) {
    const lat = hekFlare.hgs_y
    const lon = hekFlare.hgs_x
    sourceLocation = `${lat >= 0 ? 'N' : 'S'}${Math.abs(Math.round(lat))}${lon >= 0 ? 'E' : 'W'}${Math.abs(Math.round(lon))}`
  } else if (hekFlare.hpc_x !== undefined && hekFlare.hpc_y !== undefined) {
    sourceLocation = `X:${Math.round(hekFlare.hpc_x)} Y:${Math.round(hekFlare.hpc_y)}`
  }

  // Calculate duration
  let duration: number | null = null
  if (hekFlare.event_endtime && hekFlare.event_starttime) {
    const start = new Date(hekFlare.event_starttime)
    const end = new Date(hekFlare.event_endtime)
    duration = (end.getTime() - start.getTime()) / (1000 * 60) // in minutes
  }

  return {
    id: `HEK_${hekFlare.event_id || hekFlare.kb_archivid}`,
    classType,
    beginTime: hekFlare.event_starttime,
    peakTime: hekFlare.event_peaktime,
    endTime: hekFlare.event_endtime,
    duration,
    sourceLocation,
    activeRegionNum: hekFlare.ar_noaanum || null,
    intensity: getFlareIntensity(classType),
    potentialImpact: assessFlareImpact(classType),
    source: 'HEK',
    observatory: hekFlare.obs_observatory,
    instrument: hekFlare.obs_instrument
  }
}

/**
 * Estimate GOES class from peak flux if not provided
 */
function estimateGOESClass(peakFlux?: number): string {
  if (!peakFlux) return 'Unknown'
  
  // GOES flux thresholds (W/m²)
  if (peakFlux >= 1e-3) return `X${(peakFlux * 1e4).toFixed(1)}`
  if (peakFlux >= 1e-4) return `M${(peakFlux * 1e5).toFixed(1)}`
  if (peakFlux >= 1e-5) return `C${(peakFlux * 1e6).toFixed(1)}`
  if (peakFlux >= 1e-6) return `B${(peakFlux * 1e7).toFixed(1)}`
  return `A${(peakFlux * 1e8).toFixed(1)}`
}

/**
 * Determine flare intensity category
 */
function getFlareIntensity(classType: string): string {
  if (!classType || classType === 'Unknown') return 'Unknown'
  
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
  if (firstChar === 'A') return 'Minimal'
  return 'Minimal'
}

/**
 * Assess potential impact of flare
 */
function assessFlareImpact(classType: string): string {
  if (!classType || classType === 'Unknown') return 'No significant impact expected'
  
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

/**
 * Generate sample HEK flares for demonstration purposes
 */
function generateSampleHEKFlares(startDate: Date, endDate: Date): HEKFlareEvent[] {
  const samples: HEKFlareEvent[] = []
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  const numFlares = Math.min(Math.floor(daysDiff * 2), 10) // 2 flares per day, max 10
  
  for (let i = 0; i < numFlares; i++) {
    const randomTime = new Date(
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    )
    const peakTime = new Date(randomTime.getTime() + 15 * 60 * 1000) // 15 min later
    const endTime = new Date(peakTime.getTime() + 30 * 60 * 1000) // 30 min after peak
    
    // Generate different class types
    const classes = ['M2.3', 'C5.8', 'C3.2', 'M1.1', 'X1.0', 'C7.9', 'M4.5']
    const classType = classes[Math.floor(Math.random() * classes.length)]
    
    samples.push({
      event_id: `HEK_SAMPLE_${i}`,
      kb_archivid: `SAMPLE_${randomTime.getTime()}`,
      event_type: 'FL',
      event_starttime: randomTime.toISOString(),
      event_peaktime: peakTime.toISOString(),
      event_endtime: endTime.toISOString(),
      fl_goescls: classType,
      fl_peakflux: parseFloat(classType.substring(1)) * (classType[0] === 'X' ? 1e-4 : classType[0] === 'M' ? 1e-5 : 1e-6),
      ar_noaanum: Math.random() > 0.3 ? 13600 + Math.floor(Math.random() * 50) : undefined,
      hgs_x: Math.random() * 180 - 90,
      hgs_y: Math.random() * 60 - 30,
      obs_observatory: 'SDO',
      obs_instrument: 'AIA',
      frm_name: 'HEK Sample Generator'
    })
  }
  
  return samples.sort((a, b) => 
    new Date(b.event_starttime).getTime() - new Date(a.event_starttime).getTime()
  )
}

/**
 * Merge HEK flares with DONKI flares, avoiding duplicates
 */
export function mergeFlareData(donkiFlares: any[], hekFlares: HEKFlareData[]): any[] {
  // Create a map to track unique flares by time and class
  const flareMap = new Map<string, any>()
  
  // Add DONKI flares first (they take priority)
  donkiFlares.forEach(flare => {
    // Create a key based on start time (rounded to nearest minute) and class
    const startTime = new Date(flare.beginTime)
    const timeKey = Math.floor(startTime.getTime() / 60000) * 60000 // Round to minute
    const key = `${timeKey}_${flare.classType}`
    flareMap.set(key, { ...flare, source: 'DONKI' })
  })
  
  // Add HEK flares that don't duplicate DONKI data
  hekFlares.forEach(hekFlare => {
    const startTime = new Date(hekFlare.beginTime)
    const timeKey = Math.floor(startTime.getTime() / 60000) * 60000
    const key = `${timeKey}_${hekFlare.classType}`
    
    // Check for close matches (within 5 minutes)
    let isDuplicate = false
    for (let offset = -5; offset <= 5; offset++) {
      const checkKey = `${timeKey + offset * 60000}_${hekFlare.classType}`
      if (flareMap.has(checkKey)) {
        isDuplicate = true
        break
      }
    }
    
    // Only add if not a duplicate
    if (!isDuplicate) {
      flareMap.set(key, hekFlare)
    }
  })
  
  // Convert map back to array and sort by time
  const mergedFlares = Array.from(flareMap.values())
  mergedFlares.sort((a, b) => 
    new Date(b.beginTime).getTime() - new Date(a.beginTime).getTime()
  )
  
  return mergedFlares
}