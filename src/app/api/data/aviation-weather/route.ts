import { NextResponse } from 'next/server'

const NOAA_RADIATION_URL = 'https://services.swpc.noaa.gov/json/aviation/radiation.json'
const NOAA_SOLAR_RADIATION_URL = 'https://services.swpc.noaa.gov/json/aviation/solar_radiation_storm.json'
const NOAA_HF_ABSORPTION_URL = 'https://services.swpc.noaa.gov/json/d_region_absorption.json'

export interface AviationWeatherData {
  radiationLevel: {
    current: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5'
    description: string
    flightRestrictions: string
    dose: number // μSv/hr at cruise altitude
  }
  hfCommunication: {
    status: 'Normal' | 'Minor' | 'Moderate' | 'Severe' | 'Extreme'
    polarCap: {
      affected: boolean
      severity: number // 0-5
      recovery: string // Time estimate
    }
    midLatitude: {
      affected: boolean
      severity: number // 0-5
    }
    frequency: string // Affected frequency range
  }
  gnssNavigation: {
    status: 'Operational' | 'Degraded' | 'Unreliable'
    accuracy: number // meters
    availability: number // percentage
    polarRegions: string
    midLatitudes: string
  }
  flightRoutes: {
    polar: {
      status: 'Open' | 'Caution' | 'Avoid' | 'Closed'
      minAltitude: number // feet
      maxLatitude: number // degrees
    }
    highLatitude: {
      status: 'Normal' | 'Monitor' | 'Caution'
      restrictions: string[]
    }
    equatorial: {
      status: 'Normal'
      restrictions: string[]
    }
  }
  recommendations: string[]
  lastUpdate: Date
}

function getRadiationLevel(protonFlux: number): AviationWeatherData['radiationLevel'] {
  // Based on NOAA Space Weather Scale for Solar Radiation Storms
  if (protonFlux >= 1e5) {
    return {
      current: 'S5',
      description: 'Extreme radiation storm',
      flightRestrictions: 'High-latitude and polar flights prohibited',
      dose: 5000
    }
  }
  if (protonFlux >= 1e4) {
    return {
      current: 'S4',
      description: 'Severe radiation storm',
      flightRestrictions: 'Polar flights strongly discouraged, high-latitude caution',
      dose: 1000
    }
  }
  if (protonFlux >= 1e3) {
    return {
      current: 'S3',
      description: 'Strong radiation storm',
      flightRestrictions: 'Polar routes require monitoring, possible rerouting',
      dose: 200
    }
  }
  if (protonFlux >= 1e2) {
    return {
      current: 'S2',
      description: 'Moderate radiation storm',
      flightRestrictions: 'Polar flights monitor radiation levels',
      dose: 50
    }
  }
  if (protonFlux >= 10) {
    return {
      current: 'S1',
      description: 'Minor radiation storm',
      flightRestrictions: 'No restrictions, monitor polar routes',
      dose: 20
    }
  }
  return {
    current: 'S0',
    description: 'No radiation storm',
    flightRestrictions: 'No restrictions',
    dose: 5
  }
}

function assessHFStatus(absorption: number): AviationWeatherData['hfCommunication']['status'] {
  if (absorption >= 20) return 'Extreme'
  if (absorption >= 10) return 'Severe'
  if (absorption >= 5) return 'Moderate'
  if (absorption >= 2) return 'Minor'
  return 'Normal'
}

function determineFlightRouteStatus(radiationLevel: string, hfStatus: string): AviationWeatherData['flightRoutes'] {
  const polar: AviationWeatherData['flightRoutes']['polar'] = {
    status: 'Open',
    minAltitude: 28000,
    maxLatitude: 82
  }
  
  if (radiationLevel === 'S5' || hfStatus === 'Extreme') {
    polar.status = 'Closed'
    polar.minAltitude = 0
    polar.maxLatitude = 60
  } else if (radiationLevel === 'S4' || hfStatus === 'Severe') {
    polar.status = 'Avoid'
    polar.minAltitude = 35000
    polar.maxLatitude = 70
  } else if (radiationLevel === 'S3' || hfStatus === 'Moderate') {
    polar.status = 'Caution'
    polar.minAltitude = 32000
    polar.maxLatitude = 75
  }
  
  const highLatitude: AviationWeatherData['flightRoutes']['highLatitude'] = {
    status: 'Normal',
    restrictions: []
  }
  
  if (radiationLevel >= 'S3' || hfStatus === 'Severe') {
    highLatitude.status = 'Caution'
    highLatitude.restrictions.push('Monitor radiation levels')
  }
  if (hfStatus === 'Moderate' || hfStatus === 'Severe') {
    highLatitude.restrictions.push('HF communication may be degraded')
  }
  
  return {
    polar,
    highLatitude,
    equatorial: {
      status: 'Normal',
      restrictions: []
    }
  }
}

function generateRecommendations(
  radiationLevel: string,
  hfStatus: string,
  gnssStatus: string
): string[] {
  const recommendations: string[] = []
  
  // Radiation recommendations
  if (radiationLevel >= 'S3') {
    recommendations.push('Consider lower altitude routes for polar flights')
    recommendations.push('Monitor crew radiation exposure')
  }
  if (radiationLevel >= 'S2') {
    recommendations.push('Review polar route contingency plans')
  }
  
  // HF communication recommendations
  if (hfStatus === 'Severe' || hfStatus === 'Extreme') {
    recommendations.push('Use satellite communication as primary')
    recommendations.push('Establish HF relay procedures')
  } else if (hfStatus === 'Moderate') {
    recommendations.push('Have backup communication ready')
  }
  
  // GNSS recommendations
  if (gnssStatus === 'Unreliable') {
    recommendations.push('Verify navigation with ground-based aids')
    recommendations.push('Increase separation between aircraft')
  } else if (gnssStatus === 'Degraded') {
    recommendations.push('Monitor GNSS accuracy closely')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Normal operations - continue monitoring space weather')
  }
  
  return recommendations
}

export async function GET() {
  try {
    // Fetch aviation-related space weather data
    const [radiationResponse, absorptionResponse] = await Promise.all([
      fetch(NOAA_RADIATION_URL, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 } // 5 minutes
      }).catch(() => null),
      fetch(NOAA_HF_ABSORPTION_URL, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 }
      }).catch(() => null)
    ])
    
    // Process radiation data
    let protonFlux = 0.1 // Default low value
    if (radiationResponse && radiationResponse.ok) {
      const data = await radiationResponse.json()
      if (data && typeof data.ProtonFlux !== 'undefined') {
        protonFlux = parseFloat(data.ProtonFlux) || 0.1
      }
    }
    
    // Process D-region absorption (HF communication impact)
    let absorption = 0
    let polarCapAffected = false
    if (absorptionResponse && absorptionResponse.ok) {
      const data = await absorptionResponse.json()
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[data.length - 1]
        absorption = parseFloat(latest.absorption) || 0
        polarCapAffected = absorption > 2
      }
    }
    
    // Determine statuses
    const radiationLevel = getRadiationLevel(protonFlux)
    const hfStatus = assessHFStatus(absorption)
    
    // HF Communication assessment
    const hfCommunication: AviationWeatherData['hfCommunication'] = {
      status: hfStatus,
      polarCap: {
        affected: polarCapAffected,
        severity: Math.min(Math.floor(absorption / 4), 5),
        recovery: absorption > 10 ? '6-12 hours' : absorption > 5 ? '2-6 hours' : '< 2 hours'
      },
      midLatitude: {
        affected: absorption > 10,
        severity: Math.max(0, Math.floor((absorption - 10) / 5))
      },
      frequency: absorption > 5 ? '3-30 MHz affected' : 'Minor impact < 10 MHz'
    }
    
    // GNSS Navigation assessment
    let gnssStatus: AviationWeatherData['gnssNavigation']['status'] = 'Operational'
    let accuracy = 5 // meters
    let availability = 100 // percentage
    
    if (absorption > 15 || protonFlux > 1e4) {
      gnssStatus = 'Unreliable'
      accuracy = 50
      availability = 70
    } else if (absorption > 5 || protonFlux > 1e3) {
      gnssStatus = 'Degraded'
      accuracy = 15
      availability = 90
    }
    
    const gnssNavigation: AviationWeatherData['gnssNavigation'] = {
      status: gnssStatus,
      accuracy,
      availability,
      polarRegions: gnssStatus === 'Unreliable' ? 'Severe degradation' : 
                    gnssStatus === 'Degraded' ? 'Moderate impact' : 'Normal',
      midLatitudes: gnssStatus === 'Unreliable' ? 'Possible disruptions' : 'Normal'
    }
    
    // Flight route assessment
    const flightRoutes = determineFlightRouteStatus(radiationLevel.current, hfStatus)
    
    // Generate recommendations
    const recommendations = generateRecommendations(
      radiationLevel.current,
      hfStatus,
      gnssStatus
    )
    
    const responseData: AviationWeatherData = {
      radiationLevel,
      hfCommunication,
      gnssNavigation,
      flightRoutes,
      recommendations,
      lastUpdate: new Date()
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    })
    
  } catch (error) {
    console.error('Error fetching aviation weather data:', error)
    
    // Return safe fallback data
    const fallbackData: AviationWeatherData = {
      radiationLevel: {
        current: 'S0',
        description: 'No radiation storm',
        flightRestrictions: 'No restrictions',
        dose: 5
      },
      hfCommunication: {
        status: 'Normal',
        polarCap: {
          affected: false,
          severity: 0,
          recovery: 'N/A'
        },
        midLatitude: {
          affected: false,
          severity: 0
        },
        frequency: 'No impact'
      },
      gnssNavigation: {
        status: 'Operational',
        accuracy: 5,
        availability: 100,
        polarRegions: 'Normal',
        midLatitudes: 'Normal'
      },
      flightRoutes: {
        polar: {
          status: 'Open',
          minAltitude: 28000,
          maxLatitude: 82
        },
        highLatitude: {
          status: 'Normal',
          restrictions: []
        },
        equatorial: {
          status: 'Normal',
          restrictions: []
        }
      },
      recommendations: ['Normal operations - continue monitoring space weather'],
      lastUpdate: new Date()
    }
    
    return NextResponse.json(fallbackData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  }
}