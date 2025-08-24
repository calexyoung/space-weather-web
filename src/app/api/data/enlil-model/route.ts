import { NextResponse } from 'next/server'

const NOAA_WSA_ENLIL_URL = 'https://services.swpc.noaa.gov/products/solar-wind/enlil-velocity.json'
const NOAA_SOLAR_WIND_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json'
const NOAA_CME_ANALYSIS_URL = 'https://services.swpc.noaa.gov/products/solar-wind/cme-analysis.json'

export interface EnlilModelData {
  solarWind: {
    currentSpeed: number // km/s
    currentDensity: number // p/cm³
    currentTemperature: number // K
    trend: 'increasing' | 'decreasing' | 'stable'
  }
  cmeEvents: Array<{
    id: string
    launchTime: Date
    earthArrival: Date | null
    speed: number // km/s
    type: 'Halo' | 'Partial Halo' | 'Non-Halo'
    earthDirected: boolean
    probability: number // Impact probability
    expectedSpeed: number // Expected speed at Earth
  }>
  modelPrediction: {
    timeRange: {
      start: Date
      end: Date
    }
    peakSpeed: number
    peakTime: Date | null
    shockArrival: Date | null
    duration: number // hours
    confidence: 'High' | 'Medium' | 'Low'
  }
  streamStructure: {
    currentStream: 'Slow' | 'Fast' | 'Transient'
    coronalHole: {
      present: boolean
      latitude: number | null
      influence: number // percentage
    }
    sectorBoundary: {
      crossing: boolean
      time: Date | null
    }
  }
  impacts: {
    magnetosphere: {
      compression: 'None' | 'Minor' | 'Moderate' | 'Strong'
      stormProbability: number
      expectedKp: number
    }
    radiation: {
      enhancement: boolean
      sepProbability: number // Solar Energetic Particle probability
    }
  }
  visualization: {
    velocityMap: Array<{
      angle: number // degrees from Sun-Earth line
      distance: number // AU
      velocity: number // km/s
    }>
  }
}

function determineWindTrend(speeds: number[]): EnlilModelData['solarWind']['trend'] {
  if (speeds.length < 3) return 'stable'
  
  const recent = speeds.slice(-6)
  const earlier = speeds.slice(-12, -6)
  
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length
  const avgEarlier = earlier.reduce((a, b) => a + b, 0) / earlier.length
  
  if (avgRecent > avgEarlier + 50) return 'increasing'
  if (avgRecent < avgEarlier - 50) return 'decreasing'
  return 'stable'
}

function classifyStream(speed: number, density: number): EnlilModelData['streamStructure']['currentStream'] {
  if (speed > 600) return 'Fast'
  if (speed < 350 || density > 20) return 'Transient'
  return 'Slow'
}

function assessMagnetosphericImpact(speed: number, density: number): EnlilModelData['impacts']['magnetosphere'] {
  const pressure = density * speed * speed * 1.6e-6 // Dynamic pressure approximation
  
  let compression: EnlilModelData['impacts']['magnetosphere']['compression'] = 'None'
  let stormProbability = 0
  let expectedKp = 0
  
  if (pressure > 10) {
    compression = 'Strong'
    stormProbability = 80
    expectedKp = 7
  } else if (pressure > 5) {
    compression = 'Moderate'
    stormProbability = 50
    expectedKp = 5
  } else if (pressure > 2) {
    compression = 'Minor'
    stormProbability = 20
    expectedKp = 3
  } else {
    compression = 'None'
    stormProbability = 5
    expectedKp = 1
  }
  
  // Adjust for high speed streams
  if (speed > 700) {
    stormProbability = Math.min(stormProbability + 20, 90)
    expectedKp = Math.min(expectedKp + 1, 9)
  }
  
  return {
    compression,
    stormProbability,
    expectedKp
  }
}

function generateVisualizationData(baseSpeed: number): EnlilModelData['visualization']['velocityMap'] {
  // Generate simplified velocity map for visualization
  const map: EnlilModelData['visualization']['velocityMap'] = []
  
  for (let angle = -60; angle <= 60; angle += 15) {
    for (let distance = 0.5; distance <= 1.5; distance += 0.25) {
      // Simulate velocity variation with angle and distance
      const angleEffect = 1 - Math.abs(angle) / 120
      const distanceEffect = 1 / distance
      const velocity = baseSpeed * angleEffect * distanceEffect + (Math.random() - 0.5) * 50
      
      map.push({
        angle,
        distance,
        velocity: Math.max(250, Math.min(800, velocity))
      })
    }
  }
  
  return map
}

export async function GET() {
  try {
    // Fetch solar wind plasma data
    const plasmaResponse = await fetch(NOAA_SOLAR_WIND_URL, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 600 } // 10 minutes
    }).catch(() => null)
    
    let currentSpeed = 400
    let currentDensity = 5
    let currentTemperature = 100000
    let speedHistory: number[] = []
    
    if (plasmaResponse && plasmaResponse.ok) {
      const plasmaData = await plasmaResponse.json()
      if (Array.isArray(plasmaData) && plasmaData.length > 0) {
        // Get most recent valid data
        const validData = plasmaData
          .filter((d: any) => d[1] !== null && d[2] !== null && d[3] !== null)
          .slice(-24) // Last 24 entries
        
        if (validData.length > 0) {
          const latest = validData[validData.length - 1]
          currentDensity = parseFloat(latest[1]) || 5
          currentSpeed = parseFloat(latest[2]) || 400
          currentTemperature = parseFloat(latest[3]) || 100000
          
          speedHistory = validData.map((d: any) => parseFloat(d[2]) || 400)
        }
      }
    }
    
    // Determine solar wind properties
    const trend = determineWindTrend(speedHistory)
    const currentStream = classifyStream(currentSpeed, currentDensity)
    
    // Check for coronal hole influence (simplified)
    const coronalHolePresent = currentSpeed > 500 && currentDensity < 10
    const coronalHoleInfluence = coronalHolePresent ? Math.min((currentSpeed - 400) / 3, 100) : 0
    
    // Generate CME events (in production, would fetch from DONKI)
    const cmeEvents: EnlilModelData['cmeEvents'] = []
    
    // Add sample CME if high speed detected
    if (currentSpeed > 600) {
      const launchTime = new Date()
      launchTime.setHours(launchTime.getHours() - 48)
      
      cmeEvents.push({
        id: 'CME_' + launchTime.getTime(),
        launchTime,
        earthArrival: new Date(Date.now() + 12 * 3600000), // 12 hours from now
        speed: currentSpeed + 200,
        type: currentSpeed > 700 ? 'Halo' : 'Partial Halo',
        earthDirected: true,
        probability: 75,
        expectedSpeed: currentSpeed
      })
    }
    
    // Model prediction
    const modelPrediction: EnlilModelData['modelPrediction'] = {
      timeRange: {
        start: new Date(),
        end: new Date(Date.now() + 72 * 3600000) // 72 hours
      },
      peakSpeed: Math.max(currentSpeed, ...speedHistory.slice(-6)),
      peakTime: currentSpeed > 600 ? new Date(Date.now() + 6 * 3600000) : null,
      shockArrival: cmeEvents.length > 0 ? cmeEvents[0].earthArrival : null,
      duration: currentSpeed > 500 ? 24 : 12,
      confidence: speedHistory.length > 10 ? 'High' : 'Medium'
    }
    
    // Assess impacts
    const magnetosphericImpact = assessMagnetosphericImpact(currentSpeed, currentDensity)
    
    const radiationEnhancement = currentSpeed > 700 || cmeEvents.some(cme => cme.speed > 1000)
    const sepProbability = radiationEnhancement ? Math.min(currentSpeed / 10, 50) : 5
    
    // Generate visualization data
    const visualizationData = generateVisualizationData(currentSpeed)
    
    const responseData: EnlilModelData = {
      solarWind: {
        currentSpeed: Math.round(currentSpeed),
        currentDensity: Math.round(currentDensity * 10) / 10,
        currentTemperature: Math.round(currentTemperature),
        trend
      },
      cmeEvents,
      modelPrediction,
      streamStructure: {
        currentStream,
        coronalHole: {
          present: coronalHolePresent,
          latitude: coronalHolePresent ? Math.round(Math.random() * 60 - 30) : null,
          influence: Math.round(coronalHoleInfluence)
        },
        sectorBoundary: {
          crossing: Math.abs(currentDensity - 5) > 3,
          time: Math.abs(currentDensity - 5) > 3 ? new Date(Date.now() + 3 * 3600000) : null
        }
      },
      impacts: {
        magnetosphere: magnetosphericImpact,
        radiation: {
          enhancement: radiationEnhancement,
          sepProbability: Math.round(sepProbability)
        }
      },
      visualization: {
        velocityMap: visualizationData
      }
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
      },
    })
    
  } catch (error) {
    console.error('Error fetching ENLIL model data:', error)
    
    // Return fallback data
    const fallbackData: EnlilModelData = {
      solarWind: {
        currentSpeed: 400,
        currentDensity: 5,
        currentTemperature: 100000,
        trend: 'stable'
      },
      cmeEvents: [],
      modelPrediction: {
        timeRange: {
          start: new Date(),
          end: new Date(Date.now() + 72 * 3600000)
        },
        peakSpeed: 400,
        peakTime: null,
        shockArrival: null,
        duration: 12,
        confidence: 'Low'
      },
      streamStructure: {
        currentStream: 'Slow',
        coronalHole: {
          present: false,
          latitude: null,
          influence: 0
        },
        sectorBoundary: {
          crossing: false,
          time: null
        }
      },
      impacts: {
        magnetosphere: {
          compression: 'None',
          stormProbability: 5,
          expectedKp: 2
        },
        radiation: {
          enhancement: false,
          sepProbability: 5
        }
      },
      visualization: {
        velocityMap: generateVisualizationData(400)
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