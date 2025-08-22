import { NextRequest, NextResponse } from 'next/server'

const DONKI_API_KEY = process.env.NASA_API_KEY?.replace(/"/g, '') || 'DEMO_KEY'
const DONKI_BASE_URL = 'https://api.nasa.gov/DONKI'

// Cache for storing API responses
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

interface CMEAnalysis {
  time21_5: string
  latitude: number
  longitude: number
  halfAngle: number
  speed: number
  type: string
  isMostAccurate: boolean
  levelOfData: number
  note?: string
}

interface WSAEnlilSimulation {
  simulationID: string
  modelCompletionTime: string
  au: number
  estimatedShockArrivalTime: string | null
  estimatedDuration: number | null
  rmin_re: number | null
  kp_18: number | null
  kp_90: number | null
  kp_135: number | null
  kp_180: number | null
  isEarthGB: boolean
  impactList?: {
    isGlancingBlow: boolean
    location: string
    arrivalTime: string
  }[]
  cmeInputs?: Array<{
    cmeStartTime: string
    latitude: number
    longitude: number
    speed: number
    halfAngle: number
  }>
}

interface CME {
  activityID: string
  startTime: string
  sourceLocation: string | null
  activeRegionNum: number | null
  instruments: Array<{
    displayName: string
  }>
  cmeAnalyses: CMEAnalysis[]
  linkedEvents: Array<{
    activityID: string
  }>
  note?: string
  catalog?: string
  link?: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateRange = searchParams.get('dateRange') || '24h'
    
    // Check cache first
    const cacheKey = `cmes-${dateRange}`
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
    
    // Fetch CME events from DONKI
    const url = `${DONKI_BASE_URL}/CME?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${DONKI_API_KEY}`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    })
    
    if (!response.ok) {
      // If rate limited or error, return sample data
      if (response.status === 429 || response.status === 403) {
        console.warn('NASA DONKI API rate limited, returning sample CME data')
        return NextResponse.json(getSampleCMEData(dateRange))
      }
      throw new Error(`DONKI API error: ${response.status}`)
    }
    
    const data: CME[] = await response.json()
    
    // Fetch WSA-ENLIL simulations for the same date range
    const wsaEnlilUrl = `${DONKI_BASE_URL}/WSAEnlilSimulations?startDate=${startDateStr}&endDate=${endDateStr}&api_key=${DONKI_API_KEY}`
    const wsaEnlilResponse = await fetch(wsaEnlilUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }
    })
    
    let wsaEnlilData: WSAEnlilSimulation[] = []
    if (wsaEnlilResponse.ok) {
      wsaEnlilData = await wsaEnlilResponse.json()
    }
    
    // Format and enrich the data
    const formattedCMEs = data.map(cme => {
      // Get the most accurate analysis
      const mostAccurateAnalysis = cme.cmeAnalyses?.find(a => a.isMostAccurate) || cme.cmeAnalyses?.[0]
      
      // Find related WSA-ENLIL simulations for this CME
      const relatedSimulations = wsaEnlilData.filter(sim => {
        // Match by time proximity (within 12 hours of CME start)
        const cmeTime = new Date(cme.startTime).getTime()
        const simInputs = sim.cmeInputs || []
        return simInputs.some(input => {
          const inputTime = new Date(input.cmeStartTime).getTime()
          return Math.abs(cmeTime - inputTime) < 12 * 60 * 60 * 1000
        })
      })
      
      // Extract spacecraft/planet impacts from WSA-ENLIL simulations
      const wsaEnlilTargets: Array<{location: string, arrivalTime: string}> = []
      relatedSimulations.forEach(sim => {
        if (sim.impactList) {
          sim.impactList.forEach(impact => {
            // Filter out Earth impacts as they're handled separately
            if (!impact.location.toLowerCase().includes('earth')) {
              wsaEnlilTargets.push({
                location: impact.location,
                arrivalTime: impact.arrivalTime
              })
            }
          })
        }
      })
      
      return {
        id: cme.activityID,
        startTime: cme.startTime,
        sourceLocation: cme.sourceLocation || 'N/A',
        activeRegionNum: cme.activeRegionNum,
        instruments: cme.instruments || [],
        linkedEvents: cme.linkedEvents || [],
        catalog: cme.catalog || 'N/A',
        note: cme.note,
        link: cme.link || `https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/CME/${cme.activityID}/-1`,
        // Most accurate analysis data
        speed: mostAccurateAnalysis?.speed || null,
        longitude: mostAccurateAnalysis?.longitude || null,
        latitude: mostAccurateAnalysis?.latitude || null,
        halfAngle: mostAccurateAnalysis?.halfAngle || null,
        width: mostAccurateAnalysis ? mostAccurateAnalysis.halfAngle * 2 : null,
        analysisType: mostAccurateAnalysis?.type || 'N/A',
        time21_5: mostAccurateAnalysis?.time21_5 || null,
        // Classification and impact
        classification: classifyCME(mostAccurateAnalysis?.speed, mostAccurateAnalysis?.halfAngle),
        estimatedArrival: calculateEarthArrival(cme.startTime, mostAccurateAnalysis?.speed, mostAccurateAnalysis?.longitude),
        potentialImpact: assessCMEImpact(
          mostAccurateAnalysis?.speed, 
          mostAccurateAnalysis?.halfAngle,
          mostAccurateAnalysis?.longitude,
          mostAccurateAnalysis?.latitude
        ),
        // WSA-ENLIL spacecraft/planet arrivals
        wsaEnlilTargets: wsaEnlilTargets,
        // All analyses for detailed view
        analyses: cme.cmeAnalyses || []
      }
    })
    
    // Sort by start time (most recent first)
    formattedCMEs.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )
    
    const responseData = {
      success: true,
      data: formattedCMEs,
      count: formattedCMEs.length,
      dateRange: {
        start: startDateStr,
        end: endDateStr
      }
    }
    
    // Cache the response
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() })
    
    return NextResponse.json(responseData)
    
  } catch (error) {
    console.error('Error fetching CMEs:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch CMEs'
      },
      { status: 500 }
    )
  }
}

function classifyCME(speed: number | null, halfAngle: number | null): string {
  if (!speed) return 'Unknown'
  
  // Classification based on speed
  if (speed >= 2000) return 'Extreme'
  if (speed >= 1500) return 'Fast'
  if (speed >= 1000) return 'Moderate-Fast'
  if (speed >= 500) return 'Moderate'
  return 'Slow'
}

function calculateEarthArrival(startTime: string, speed: number | null, longitude: number | null): {
  arrivalTime: string | null
  transitTime: number | null
  probability: string
} {
  if (!speed) {
    return {
      arrivalTime: null,
      transitTime: null,
      probability: 'Unknown'
    }
  }
  
  // Simple estimation - actual calculation is much more complex
  const AU_IN_KM = 149597870.7 // 1 AU in kilometers
  const transitTimeHours = AU_IN_KM / (speed * 3600) // Convert km/s to km/h
  
  const arrivalDate = new Date(startTime)
  arrivalDate.setHours(arrivalDate.getHours() + transitTimeHours)
  
  // Estimate Earth-directed probability based on longitude
  let probability = 'Low'
  if (longitude !== null) {
    const absLongitude = Math.abs(longitude)
    if (absLongitude <= 15) {
      probability = 'High'
    } else if (absLongitude <= 30) {
      probability = 'Moderate'
    } else if (absLongitude <= 45) {
      probability = 'Low'
    } else {
      probability = 'Very Low'
    }
  }
  
  return {
    arrivalTime: arrivalDate.toISOString(),
    transitTime: transitTimeHours,
    probability
  }
}

function assessCMEImpact(
  speed: number | null, 
  halfAngle: number | null,
  longitude: number | null,
  latitude: number | null
): {
  earthImpact: string
  otherTargets: string[]
  severity: string
} {
  const targets: string[] = []
  let earthImpact = 'No direct impact expected'
  let severity = 'Minimal'
  
  if (!speed || !halfAngle) {
    return {
      earthImpact: 'Unknown',
      otherTargets: [],
      severity: 'Unknown'
    }
  }
  
  // Assess Earth impact
  if (longitude !== null && latitude !== null) {
    const absLongitude = Math.abs(longitude)
    const absLatitude = Math.abs(latitude)
    
    if (absLongitude <= 30 && absLatitude <= 30) {
      if (halfAngle >= 30) {
        earthImpact = 'Direct Earth impact likely'
        targets.push('Earth')
        
        // Assess severity based on speed
        if (speed >= 2000) {
          severity = 'Extreme'
        } else if (speed >= 1500) {
          severity = 'Severe'
        } else if (speed >= 1000) {
          severity = 'Strong'
        } else if (speed >= 700) {
          severity = 'Moderate'
        } else {
          severity = 'Minor'
        }
      } else if (halfAngle >= 20) {
        earthImpact = 'Glancing blow possible'
        targets.push('Earth (glancing)')
        severity = 'Minor to Moderate'
      }
    } else if (absLongitude <= 60 && halfAngle >= 45) {
      earthImpact = 'Flanking passage possible'
      targets.push('Earth (flanking)')
      severity = 'Minor'
    }
  }
  
  // Assess other potential targets based on longitude
  if (longitude !== null) {
    // Simplified assessment - actual planetary positions would need ephemeris data
    if (longitude >= -30 && longitude <= 30) {
      targets.push('STEREO-A')
    }
    if (longitude >= 150 || longitude <= -150) {
      targets.push('STEREO-B region')
    }
    if (Math.abs(longitude - 45) <= 30) {
      targets.push('Mars region')
    }
    if (Math.abs(longitude + 45) <= 30) {
      targets.push('Venus region')
    }
  }
  
  // Add spacecraft in L1
  if (targets.includes('Earth') || targets.includes('Earth (glancing)')) {
    targets.push('ACE/DSCOVR')
  }
  
  return {
    earthImpact,
    otherTargets: targets.filter(t => !t.startsWith('Earth')),
    severity
  }
}

function getSampleCMEData(dateRange: string) {
  const now = new Date()
  const sampleCMEs = []
  
  // Generate sample CMEs based on date range
  const numCMEs = dateRange === '24h' ? 2 : dateRange === '3d' ? 5 : dateRange === '7d' ? 10 : 20
  
  for (let i = 0; i < numCMEs; i++) {
    const hoursAgo = Math.random() * (dateRange === '24h' ? 24 : dateRange === '3d' ? 72 : dateRange === '7d' ? 168 : 720)
    const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    
    const speed = 300 + Math.random() * 2000 // 300-2300 km/s
    const longitude = (Math.random() - 0.5) * 180 // -90 to +90
    const latitude = (Math.random() - 0.5) * 60 // -30 to +30
    const halfAngle = 15 + Math.random() * 45 // 15-60 degrees
    
    const classification = classifyCME(speed, halfAngle)
    const estimatedArrival = calculateEarthArrival(startTime.toISOString(), speed, longitude)
    const potentialImpact = assessCMEImpact(speed, halfAngle, longitude, latitude)
    
    sampleCMEs.push({
      id: `CME-${startTime.getTime()}`,
      startTime: startTime.toISOString(),
      sourceLocation: `N${Math.floor(Math.abs(latitude))}${longitude > 0 ? 'E' : 'W'}${Math.floor(Math.abs(longitude))}`,
      activeRegionNum: Math.random() > 0.5 ? 13500 + Math.floor(Math.random() * 100) : null,
      instruments: [{ displayName: 'LASCO C2' }, { displayName: 'LASCO C3' }],
      linkedEvents: [],
      catalog: 'LASCO',
      note: 'Sample data',
      speed: Math.round(speed),
      longitude: Math.round(longitude),
      latitude: Math.round(latitude),
      halfAngle: Math.round(halfAngle),
      width: Math.round(halfAngle * 2),
      analysisType: 'SWPC_CAT',
      time21_5: new Date(startTime.getTime() + 60 * 60 * 1000).toISOString(),
      classification,
      estimatedArrival,
      potentialImpact,
      analyses: [{
        time21_5: new Date(startTime.getTime() + 60 * 60 * 1000).toISOString(),
        latitude,
        longitude,
        halfAngle,
        speed,
        type: 'SWPC_CAT',
        isMostAccurate: true,
        levelOfData: 0
      }]
    })
  }
  
  // Sort by start time (most recent first)
  sampleCMEs.sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )
  
  return {
    success: true,
    data: sampleCMEs,
    count: sampleCMEs.length,
    dateRange: {
      start: new Date(now.getTime() - (dateRange === '24h' ? 24 : dateRange === '3d' ? 72 : dateRange === '7d' ? 168 : 720) * 60 * 60 * 1000).toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    },
    note: 'Sample data - NASA DONKI API temporarily unavailable'
  }
}