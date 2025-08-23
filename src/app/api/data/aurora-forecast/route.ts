import { NextResponse } from 'next/server'
import { AuroraForecastSchema, type AuroraForecast } from '@/lib/widgets/widget-types'

// Helper function to convert Kp index to activity level
function kpToActivity(kp: number): AuroraForecast['currentActivity'] {
  if (kp < 2) return 'Quiet'
  if (kp < 3) return 'Unsettled'
  if (kp < 4) return 'Minor'
  if (kp < 5) return 'Moderate'
  if (kp < 6) return 'Strong'
  if (kp < 8) return 'Severe'
  return 'Extreme'
}

// Helper function to determine visibility locations based on latitude
function getVisibleLocations(latitude: number, hemisphere: 'northern' | 'southern'): string[] {
  const locations: string[] = []
  
  if (hemisphere === 'northern') {
    // Always visible in far north
    if (latitude <= 70) locations.push('Tromsø', 'Fairbanks', 'Yellowknife', 'Svalbard')
    if (latitude <= 65) locations.push('Reykjavik', 'Anchorage', 'Whitehorse')
    if (latitude <= 60) locations.push('Oslo', 'Helsinki', 'Stockholm', 'Juneau')
    if (latitude <= 55) locations.push('Edinburgh', 'Copenhagen', 'Moscow', 'Edmonton')
    if (latitude <= 50) locations.push('London', 'Berlin', 'Warsaw', 'Calgary', 'Winnipeg')
    if (latitude <= 45) locations.push('Paris', 'Seattle', 'Minneapolis', 'Montreal', 'Boston')
    if (latitude <= 40) locations.push('New York', 'Chicago', 'Denver', 'Madrid')
  } else {
    // Southern hemisphere locations
    if (latitude >= -70) locations.push('Antarctic Stations')
    if (latitude >= -65) locations.push('South Georgia')
    if (latitude >= -60) locations.push('Ushuaia', 'Punta Arenas')
    if (latitude >= -55) locations.push('Invercargill', 'Hobart')
    if (latitude >= -50) locations.push('Christchurch', 'Tasmania')
    if (latitude >= -45) locations.push('Dunedin', 'Wellington')
    if (latitude >= -40) locations.push('Melbourne', 'Auckland')
  }
  
  return locations
}

// Calculate aurora visibility probability based on Kp and hemisphere
function calculateVisibilityProbability(kp: number, hemisphere: 'northern' | 'southern'): number {
  // Base probability calculation
  let probability = 0
  
  if (kp >= 9) probability = 95
  else if (kp >= 8) probability = 85
  else if (kp >= 7) probability = 75
  else if (kp >= 6) probability = 65
  else if (kp >= 5) probability = 50
  else if (kp >= 4) probability = 35
  else if (kp >= 3) probability = 20
  else if (kp >= 2) probability = 10
  else probability = 5
  
  // Southern hemisphere typically has slightly lower visibility
  if (hemisphere === 'southern') {
    probability *= 0.85
  }
  
  return Math.min(100, Math.max(0, probability))
}

// Calculate latitude threshold based on Kp index
function calculateLatitudeThreshold(kp: number, hemisphere: 'northern' | 'southern'): number {
  // Base latitude for aurora oval
  const baseLatitude = hemisphere === 'northern' ? 67 : -67
  
  // Expansion based on Kp (roughly 2-3 degrees per Kp unit above 3)
  const expansion = Math.max(0, (kp - 3) * 2.5)
  
  if (hemisphere === 'northern') {
    return baseLatitude - expansion // Lower latitude means further south
  } else {
    return baseLatitude + expansion // Higher latitude means further north
  }
}

export async function GET() {
  try {
    // Fetch real aurora data from NOAA SWPC
    const [ovationResponse, kpResponse, kpForecastResponse] = await Promise.all([
      fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null),
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null),
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null)
    ])
    
    // Parse responses
    const ovationData = ovationResponse ? await ovationResponse.json().catch(() => null) : null
    const kpData = kpResponse ? await kpResponse.json().catch(() => []) : []
    const kpForecastData = kpForecastResponse ? await kpForecastResponse.json().catch(() => []) : []
    
    // Get current Kp value
    let currentKp = 2.0 // Default to quiet conditions
    if (kpData && kpData.length > 1) {
      const validKp = kpData.slice(1).filter((row: unknown[]) => 
        row && row.length >= 2 && row[1] !== null && row[1] !== ''
      )
      if (validKp.length > 0) {
        currentKp = parseFloat(validKp[validKp.length - 1][1]) || 2.0
      }
    }
    
    // Process OVATION data for aurora visibility
    let northernProbability = calculateVisibilityProbability(currentKp, 'northern')
    let southernProbability = calculateVisibilityProbability(currentKp, 'southern')
    const northernLatitude = calculateLatitudeThreshold(currentKp, 'northern')
    const southernLatitude = calculateLatitudeThreshold(currentKp, 'southern')
    
    // If we have OVATION data, use it to refine our estimates
    if (ovationData && ovationData.coordinates) {
      // OVATION provides aurora power data on a grid
      // We can use this to get more accurate visibility estimates
      try {
        const coords = ovationData.coordinates
        let maxNorthPower = 0
        let maxSouthPower = 0
        
        // Find maximum aurora power in each hemisphere
        for (let i = 0; i < coords.length; i++) {
          const lat = coords[i][1]
          const power = coords[i][2] || 0
          
          if (lat > 0 && power > maxNorthPower) {
            maxNorthPower = power
          } else if (lat < 0 && power > maxSouthPower) {
            maxSouthPower = power
          }
        }
        
        // Adjust probabilities based on actual aurora power
        if (maxNorthPower > 0) {
          northernProbability = Math.min(100, northernProbability * (1 + maxNorthPower / 100))
        }
        if (maxSouthPower > 0) {
          southernProbability = Math.min(100, southernProbability * (1 + maxSouthPower / 100))
        }
      } catch (e) {
        console.warn('Failed to process OVATION data:', e)
      }
    }
    
    // Generate 24-hour forecast based on Kp predictions
    const forecast24h: Array<{
      time: Date
      activity: string
      visibility: {
        northern: number
        southern: number
      }
    }> = []
    
    let peakKp = currentKp
    let peakTime = new Date()
    
    if (kpForecastData && kpForecastData.length > 1) {
      // Process forecast data (skip header row)
      const forecasts = kpForecastData.slice(1).filter((row: unknown[]) =>
        row && row.length >= 2 && row[0] && row[1] !== null
      )
      
      // Generate hourly forecast for next 24 hours
      for (let hour = 0; hour < 24; hour++) {
        const forecastTime = new Date(Date.now() + hour * 60 * 60 * 1000)
        
        // Find nearest forecast value (forecasts are typically 3-hour intervals)
        const forecastIndex = Math.floor(hour / 3)
        let forecastKp = currentKp
        
        if (forecastIndex < forecasts.length) {
          forecastKp = parseFloat(forecasts[forecastIndex][1]) || currentKp
        }
        
        // Track peak activity
        if (forecastKp > peakKp) {
          peakKp = forecastKp
          peakTime = forecastTime
        }
        
        forecast24h.push({
          time: forecastTime,
          activity: kpToActivity(forecastKp),
          visibility: {
            northern: calculateVisibilityProbability(forecastKp, 'northern'),
            southern: calculateVisibilityProbability(forecastKp, 'southern')
          }
        })
      }
    } else {
      // No forecast available, use current conditions
      for (let hour = 0; hour < 24; hour++) {
        forecast24h.push({
          time: new Date(Date.now() + hour * 60 * 60 * 1000),
          activity: kpToActivity(currentKp),
          visibility: {
            northern: northernProbability,
            southern: southernProbability
          }
        })
      }
    }
    
    // Determine confidence level based on data availability
    let confidence: 'Low' | 'Medium' | 'High' = 'Medium'
    if (ovationData && kpForecastData && kpForecastData.length > 1) {
      confidence = 'High'
    } else if (!ovationData && !kpForecastData) {
      confidence = 'Low'
    }
    
    const auroraForecast: AuroraForecast = {
      currentActivity: kpToActivity(currentKp),
      visibility: {
        northern: {
          latitudeThreshold: Math.round(northernLatitude * 10) / 10,
          probability: Math.round(northernProbability * 10) / 10,
          locations: getVisibleLocations(northernLatitude, 'northern')
        },
        southern: {
          latitudeThreshold: Math.round(southernLatitude * 10) / 10,
          probability: Math.round(southernProbability * 10) / 10,
          locations: getVisibleLocations(southernLatitude, 'southern')
        }
      },
      forecast24h: forecast24h.map(f => ({
        ...f,
        visibility: {
          northern: Math.round(f.visibility.northern * 10) / 10,
          southern: Math.round(f.visibility.southern * 10) / 10
        }
      })),
      peakTime: peakKp > currentKp ? peakTime : undefined,
      confidence
    }
    
    // Validate the data structure
    const validatedData = AuroraForecastSchema.parse(auroraForecast)
    
    return NextResponse.json(validatedData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    })
  } catch (error) {
    console.error('Error fetching aurora forecast data:', error)
    
    // Return safe fallback data
    const fallbackData: AuroraForecast = {
      currentActivity: 'Quiet',
      visibility: {
        northern: {
          latitudeThreshold: 67.0,
          probability: 5.0,
          locations: []
        },
        southern: {
          latitudeThreshold: -67.0,
          probability: 5.0,
          locations: []
        }
      },
      forecast24h: Array.from({ length: 24 }, (_, i) => ({
        time: new Date(Date.now() + i * 60 * 60 * 1000),
        activity: 'Quiet',
        visibility: {
          northern: 5.0,
          southern: 5.0
        }
      })),
      confidence: 'Low'
    }
    
    return NextResponse.json(fallbackData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}