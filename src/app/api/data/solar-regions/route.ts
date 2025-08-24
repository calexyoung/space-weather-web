import { NextResponse } from 'next/server'

const NOAA_REGIONS_URL = 'https://services.swpc.noaa.gov/json/solar_regions.json'
const NOAA_SUNSPOT_URL = 'https://services.swpc.noaa.gov/json/sunspot_report.json'

export interface SolarRegionData {
  activeRegions: Array<{
    number: number
    location: string
    latitude: number
    longitude: number
    area: number
    spotClass: string
    magneticClass: string
    numSunspots: number
    flareActivity: {
      last24h: {
        c: number
        m: number
        x: number
      }
      potential: string // 'Low' | 'Moderate' | 'High'
    }
    history: string // 'New' | 'Growing' | 'Stable' | 'Decaying'
    threat: string // 'None' | 'Low' | 'Moderate' | 'High'
  }>
  statistics: {
    totalRegions: number
    totalSunspots: number
    earthFacingRegions: number
    activeRegions: number // Regions with recent flares
    complexRegions: number // Beta-gamma or more complex
    newRegions: number // Emerged in last 24h
  }
  riskAssessment: {
    overallThreat: 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Extreme'
    mClassProbability: number
    xClassProbability: number
    protonEventProbability: number
    earthDirectedRisk: number
  }
  sunspotNumber: {
    current: number
    monthly: number
    smoothed: number
  }
}

function assessMagneticComplexity(magClass: string): number {
  // Complexity score for risk assessment
  const complexityMap: Record<string, number> = {
    'Alpha': 1,
    'Beta': 2,
    'Beta-Gamma': 5,
    'Beta-Gamma-Delta': 10,
    'Beta-Delta': 8,
    'Gamma': 4,
    'Delta': 7
  }
  return complexityMap[magClass] || 0
}

function determineFlarePotential(magClass: string, area: number): string {
  const complexity = assessMagneticComplexity(magClass)
  
  if (complexity >= 7 || area > 500) return 'High'
  if (complexity >= 4 || area > 300) return 'Moderate'
  return 'Low'
}

function assessRegionThreat(region: any): string {
  const complexity = assessMagneticComplexity(region.magneticClass || '')
  const area = region.area || 0
  
  if (complexity >= 8 && area > 400) return 'High'
  if (complexity >= 5 || area > 300) return 'Moderate'
  if (complexity >= 2 || area > 100) return 'Low'
  return 'None'
}

function calculateFlareProbabilities(regions: any[]): { mClass: number, xClass: number } {
  let mClassProb = 0
  let xClassProb = 0
  
  regions.forEach(region => {
    const complexity = assessMagneticComplexity(region.magneticClass || '')
    const area = region.area || 0
    
    // M-class probability
    if (complexity >= 5) mClassProb += 30
    else if (complexity >= 3) mClassProb += 15
    else if (complexity >= 2) mClassProb += 5
    
    if (area > 500) mClassProb += 20
    else if (area > 300) mClassProb += 10
    
    // X-class probability
    if (complexity >= 8) xClassProb += 15
    else if (complexity >= 5) xClassProb += 5
    else if (complexity >= 3) xClassProb += 2
    
    if (area > 700) xClassProb += 10
    else if (area > 500) xClassProb += 5
  })
  
  // Cap probabilities at reasonable levels
  return {
    mClass: Math.min(mClassProb, 80),
    xClass: Math.min(xClassProb, 30)
  }
}

function determineRegionHistory(region: any): string {
  // Use the status field from NOAA data when available
  const status = region.status || ''
  const area = region.area || 0
  
  // NOAA status codes: n=new, l=growing, s=stable, d=decaying, f=fading
  if (status === 'n') return 'New'
  if (status === 'l' || area > 400) return 'Growing'
  if (status === 'd' || status === 'f' || area < 100) return 'Decaying'
  return 'Stable'
}

export async function GET() {
  try {
    // Fetch both solar regions and sunspot data
    const [regionsResponse, sunspotResponse] = await Promise.all([
      fetch(NOAA_REGIONS_URL, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 } // Cache for 1 hour
      }).catch(() => null),
      fetch(NOAA_SUNSPOT_URL, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 }
      }).catch(() => null)
    ])
    
    let regionsData: any[] = []
    let sunspotData: any = null
    
    if (regionsResponse && regionsResponse.ok) {
      const data = await regionsResponse.json()
      if (Array.isArray(data)) {
        regionsData = data
      }
    }
    
    if (sunspotResponse && sunspotResponse.ok) {
      const data = await sunspotResponse.json()
      if (Array.isArray(data) && data.length > 0) {
        sunspotData = data[data.length - 1] // Most recent
      }
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]
    
    // Process regions - filter for today's date and valid regions with area, spot_class, and mag_class
    // These are the visible spots for the current date
    const validRegions = regionsData.filter(region => 
      region.observed_date && 
      region.observed_date.startsWith(today) &&
      region.area !== null && 
      region.area !== undefined &&
      region.spot_class !== null && 
      region.spot_class !== undefined &&
      region.mag_class !== null &&
      region.mag_class !== undefined
    )
    
    // Get the latest observation for each unique region number
    const latestRegions = new Map<number, any>()
    validRegions.forEach(region => {
      const regionNum = region.region
      if (!latestRegions.has(regionNum) || 
          new Date(region.observed_date) > new Date(latestRegions.get(regionNum).observed_date)) {
        latestRegions.set(regionNum, region)
      }
    })
    
    const activeRegions = Array.from(latestRegions.values()).map(region => {
      const lat = region.latitude || 0
      const lon = region.longitude || 0
      const area = region.area || 0
      const spotClass = region.spot_class || 'Unknown'
      const magneticClass = region.mag_class || 'Unknown'
      const numSunspots = region.number_spots || 0
      
      // Determine if earth-facing (within ±60 degrees of center)
      const isEarthFacing = Math.abs(lon) <= 60
      
      // Use actual flare counts from NOAA data
      const cFlares = region.c_xray_events || 0
      const mFlares = region.m_xray_events || 0
      const xFlares = region.x_xray_events || 0
      const complexity = assessMagneticComplexity(magneticClass)
      
      return {
        number: region.region || 0,
        location: region.location || `${lat >= 0 ? 'N' : 'S'}${Math.abs(Math.round(lat))}${lon >= 0 ? 'E' : 'W'}${Math.abs(Math.round(lon))}`,
        latitude: lat,
        longitude: lon,
        area,
        spotClass,
        magneticClass,
        numSunspots,
        flareActivity: {
          last24h: {
            c: cFlares,
            m: mFlares,
            x: xFlares
          },
          potential: determineFlarePotential(magneticClass, area)
        },
        history: determineRegionHistory(region),
        threat: assessRegionThreat(region),
        isEarthFacing
      }
    })
    
    // Calculate statistics
    const earthFacingRegions = activeRegions.filter(r => r.isEarthFacing).length
    const activeRegionCount = activeRegions.filter(r => 
      r.flareActivity.last24h.c > 0 || 
      r.flareActivity.last24h.m > 0 || 
      r.flareActivity.last24h.x > 0
    ).length
    // Complex regions are those with magnetic class more complex than A or B (e.g., BG, BGD, etc.)
    const complexRegions = activeRegions.filter(r => {
      const magClass = (r.magneticClass || '').toUpperCase()
      // Complex if it contains G or D (like BG, BGD, GD, etc.) or is more than single letter
      return magClass.length > 1 && (magClass.includes('G') || magClass.includes('D'))
    }).length
    const newRegions = activeRegions.filter(r => r.history === 'New').length
    
    // Calculate probabilities
    const probs = calculateFlareProbabilities(activeRegions)
    
    // Determine overall threat level
    let overallThreat: SolarRegionData['riskAssessment']['overallThreat'] = 'Low'
    if (probs.xClass > 20 || complexRegions > 3) overallThreat = 'Extreme'
    else if (probs.xClass > 10 || probs.mClass > 60) overallThreat = 'High'
    else if (probs.mClass > 40 || complexRegions > 1) overallThreat = 'Elevated'
    else if (probs.mClass > 20 || activeRegionCount > 2) overallThreat = 'Moderate'
    
    // Earth-directed risk based on earth-facing complex regions
    const earthDirectedComplexRegions = activeRegions.filter(r => 
      r.isEarthFacing && assessMagneticComplexity(r.magneticClass) >= 4
    ).length
    const earthDirectedRisk = Math.min(earthDirectedComplexRegions * 25, 100)
    
    // Proton event probability (from large flares in western hemisphere)
    const westernComplexRegions = activeRegions.filter(r => 
      r.longitude > 0 && r.longitude < 60 && assessMagneticComplexity(r.magneticClass) >= 5
    ).length
    const protonEventProbability = Math.min(westernComplexRegions * 20, 60)
    
    // Get sunspot numbers
    const currentSunspotNumber = sunspotData?.SunspotNumber || activeRegions.reduce((sum, r) => sum + r.numSunspots, 0)
    const monthlySunspotNumber = sunspotData?.MonthlySunspotNumber || currentSunspotNumber
    const smoothedSunspotNumber = sunspotData?.SmoothedSunspotNumber || monthlySunspotNumber
    
    const responseData: SolarRegionData = {
      activeRegions: activeRegions.filter(r => r.number > 0), // Only numbered regions
      statistics: {
        totalRegions: activeRegions.length,
        totalSunspots: activeRegions.reduce((sum, r) => sum + r.numSunspots, 0),
        earthFacingRegions,
        activeRegions: activeRegionCount,
        complexRegions,
        newRegions
      },
      riskAssessment: {
        overallThreat,
        mClassProbability: probs.mClass,
        xClassProbability: probs.xClass,
        protonEventProbability,
        earthDirectedRisk
      },
      sunspotNumber: {
        current: currentSunspotNumber,
        monthly: monthlySunspotNumber,
        smoothed: smoothedSunspotNumber
      }
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
    
  } catch (error) {
    console.error('Error fetching solar regions data:', error)
    
    // Return fallback data
    const fallbackData: SolarRegionData = {
      activeRegions: [],
      statistics: {
        totalRegions: 0,
        totalSunspots: 0,
        earthFacingRegions: 0,
        activeRegions: 0,
        complexRegions: 0,
        newRegions: 0
      },
      riskAssessment: {
        overallThreat: 'Low',
        mClassProbability: 10,
        xClassProbability: 1,
        protonEventProbability: 5,
        earthDirectedRisk: 10
      },
      sunspotNumber: {
        current: 50,
        monthly: 55,
        smoothed: 52
      }
    }
    
    return NextResponse.json(fallbackData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  }
}