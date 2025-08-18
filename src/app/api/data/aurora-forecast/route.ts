import { NextResponse } from 'next/server'
import { AuroraForecastSchema, type AuroraForecast } from '@/lib/widgets/widget-types'

export async function GET() {
  try {
    // TODO: Replace with real aurora forecast data from NOAA/SWPC
    // For now, return mock data that simulates realistic aurora conditions
    
    const currentActivity = ['Quiet', 'Unsettled', 'Minor', 'Moderate', 'Strong'][Math.floor(Math.random() * 5)]
    
    // Base visibility probabilities on activity level
    const activityMultiplier = {
      'Quiet': 0.1,
      'Unsettled': 0.3,
      'Minor': 0.5,
      'Moderate': 0.7,
      'Strong': 0.9,
    }[currentActivity] || 0.1
    
    const northernProb = Math.min(100, Math.random() * 100 * activityMultiplier + 5)
    const southernProb = Math.min(100, Math.random() * 100 * activityMultiplier * 0.8 + 5) // Southern typically slightly lower
    
    // Generate latitude thresholds based on activity
    const baseNorthLat = 65 // Normal aurora oval
    const baseSouthLat = -65
    const latitudeExpansion = activityMultiplier * 15 // Up to 15 degrees expansion during strong activity
    
    const northernLatitude = baseNorthLat - latitudeExpansion
    const southernLatitude = baseSouthLat + latitudeExpansion
    
    // Generate visible locations based on latitude thresholds
    const northernLocations = []
    const southernLocations = []
    
    if (northernLatitude <= 60) northernLocations.push('Anchorage', 'Fairbanks', 'Yellowknife', 'Tromsø')
    if (northernLatitude <= 55) northernLocations.push('Edmonton', 'Whitehorse', 'Reykjavik')
    if (northernLatitude <= 50) northernLocations.push('Calgary', 'Minneapolis', 'Stockholm')
    if (northernLatitude <= 45) northernLocations.push('Seattle', 'Chicago', 'Boston', 'London')
    
    if (southernLatitude >= -60) southernLocations.push('Ushuaia', 'Hobart', 'Invercargill')
    if (southernLatitude >= -55) southernLocations.push('Punta Arenas', 'Christchurch')
    if (southernLatitude >= -50) southernLocations.push('Melbourne', 'Auckland')
    
    // Generate 24-hour forecast
    const forecast24h = Array.from({ length: 24 }, (_, i) => {
      const time = new Date(Date.now() + i * 60 * 60 * 1000)
      const hourlyActivity = ['Quiet', 'Unsettled', 'Minor', 'Moderate', 'Strong'][Math.floor(Math.random() * 5)]
      const hourlyMultiplier = activityMultiplier * (0.5 + Math.random() * 1.0) // Vary around base activity
      
      return {
        time,
        activity: hourlyActivity,
        visibility: {
          northern: Math.min(100, Math.max(0, northernProb * hourlyMultiplier)),
          southern: Math.min(100, Math.max(0, southernProb * hourlyMultiplier)),
        },
      }
    })
    
    // Find peak time (highest combined visibility)
    const peakForecast = forecast24h.reduce((prev, current) => 
      (prev.visibility.northern + prev.visibility.southern) > 
      (current.visibility.northern + current.visibility.southern) ? prev : current
    )
    
    const mockData: AuroraForecast = {
      currentActivity: currentActivity as 'Quiet' | 'Unsettled' | 'Minor' | 'Moderate' | 'Strong',
      visibility: {
        northern: {
          latitudeThreshold: Math.round(northernLatitude * 10) / 10, // Round to 1 decimal place
          probability: Math.round(northernProb * 10) / 10, // Round to 1 decimal place
          locations: northernLocations,
        },
        southern: {
          latitudeThreshold: Math.round(southernLatitude * 10) / 10, // Round to 1 decimal place
          probability: Math.round(southernProb * 10) / 10, // Round to 1 decimal place
          locations: southernLocations,
        },
      },
      forecast24h: forecast24h.map(f => ({
        ...f,
        visibility: {
          northern: Math.round(f.visibility.northern * 10) / 10, // Round to 1 decimal place
          southern: Math.round(f.visibility.southern * 10) / 10, // Round to 1 decimal place
        }
      })),
      peakTime: peakForecast.time,
      confidence: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)] as 'Low' | 'Medium' | 'High',
    }

    // Validate the data structure
    const validatedData = AuroraForecastSchema.parse(mockData)

    return NextResponse.json(validatedData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error fetching aurora forecast data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch aurora forecast data' },
      { status: 500 }
    )
  }
}

// Real implementation would look like this:
/*
async function fetchRealAuroraData(): Promise<AuroraForecast> {
  try {
    // Fetch from NOAA SWPC aurora forecast
    const response = await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json')
    const data = await response.json()
    
    // Fetch Kp forecast for activity level
    const kpResponse = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json')
    const kpData = await kpResponse.json()
    
    // Calculate visibility based on current Kp and forecast
    const currentKp = parseFloat(kpData[kpData.length - 1][1])
    
    return {
      currentActivity: kpToActivity(currentKp),
      visibility: calculateVisibility(data, currentKp),
      forecast24h: generateForecast(kpData),
      peakTime: findPeakTime(kpData),
      confidence: assessConfidence(kpData),
    }
  } catch (error) {
    throw new Error('Failed to fetch real aurora data')
  }
}

function kpToActivity(kp: number): string {
  if (kp <= 2) return 'Quiet'
  if (kp <= 3) return 'Unsettled'  
  if (kp <= 4) return 'Minor'
  if (kp <= 6) return 'Moderate'
  if (kp <= 8) return 'Strong'
  return 'Extreme'
}
*/