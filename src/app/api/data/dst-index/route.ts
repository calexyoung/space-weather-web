import { NextResponse } from 'next/server'

const NOAA_DST_1H_URL = 'https://services.swpc.noaa.gov/json/geospace/geospace_dst_1_hour.json'
const NOAA_DST_7D_URL = 'https://services.swpc.noaa.gov/json/geospace/geospace_dst_7_day.json'

export interface DstIndexData {
  current: number
  currentLevel: 'Quiet' | 'Unsettled' | 'Minor Storm' | 'Moderate Storm' | 'Strong Storm' | 'Severe Storm' | 'Extreme Storm'
  min24h: number
  max24h: number
  average24h: number
  trend: 'recovering' | 'intensifying' | 'stable'
  history: Array<{
    time: Date
    value: number
  }>
  stormProbability: {
    minor: number    // < -50 nT
    moderate: number // < -100 nT
    strong: number   // < -200 nT
    severe: number   // < -300 nT
  }
}

function getDstLevel(dst: number): DstIndexData['currentLevel'] {
  // DST is negative during storms
  if (dst >= -20) return 'Quiet'
  if (dst >= -50) return 'Unsettled'
  if (dst >= -100) return 'Minor Storm'
  if (dst >= -200) return 'Moderate Storm'
  if (dst >= -300) return 'Strong Storm'
  if (dst >= -400) return 'Severe Storm'
  return 'Extreme Storm'
}

function calculateTrend(values: number[]): DstIndexData['trend'] {
  if (values.length < 3) return 'stable'
  
  const recent = values.slice(-6) // Last 6 hours
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length
  const avgPrevious = values.slice(-12, -6).reduce((a, b) => a + b, 0) / Math.min(6, values.slice(-12, -6).length)
  
  // DST becomes more negative during intensification
  if (avgRecent < avgPrevious - 10) return 'intensifying'
  if (avgRecent > avgPrevious + 10) return 'recovering'
  return 'stable'
}

function calculateStormProbability(currentDst: number, trend: string): DstIndexData['stormProbability'] {
  // Base probabilities on current value and trend
  const base = {
    minor: 0,
    moderate: 0,
    strong: 0,
    severe: 0
  }
  
  if (currentDst < -300) {
    // Already in severe storm
    base.severe = 90
    base.strong = 95
    base.moderate = 100
    base.minor = 100
  } else if (currentDst < -200) {
    // Strong storm
    base.severe = trend === 'intensifying' ? 30 : 10
    base.strong = 90
    base.moderate = 95
    base.minor = 100
  } else if (currentDst < -100) {
    // Moderate storm
    base.severe = trend === 'intensifying' ? 10 : 5
    base.strong = trend === 'intensifying' ? 40 : 20
    base.moderate = 90
    base.minor = 100
  } else if (currentDst < -50) {
    // Minor storm
    base.severe = trend === 'intensifying' ? 5 : 1
    base.strong = trend === 'intensifying' ? 20 : 10
    base.moderate = trend === 'intensifying' ? 50 : 30
    base.minor = 90
  } else if (currentDst < -20) {
    // Unsettled
    base.severe = 1
    base.strong = trend === 'intensifying' ? 10 : 5
    base.moderate = trend === 'intensifying' ? 30 : 15
    base.minor = trend === 'intensifying' ? 60 : 40
  } else {
    // Quiet
    base.severe = 0
    base.strong = trend === 'intensifying' ? 5 : 1
    base.moderate = trend === 'intensifying' ? 15 : 5
    base.minor = trend === 'intensifying' ? 30 : 10
  }
  
  return base
}

export async function GET() {
  try {
    // Fetch both 1-hour and 7-day DST data
    const [hourlyResponse, weeklyResponse] = await Promise.all([
      fetch(NOAA_DST_1H_URL, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 } // Cache for 1 minute
      }).catch(() => null),
      fetch(NOAA_DST_7D_URL, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 } // Cache for 5 minutes
      }).catch(() => null)
    ])
    
    let dstData: any[] = []
    
    // Try to use 1-hour data first (more recent)
    if (hourlyResponse && hourlyResponse.ok) {
      const hourlyData = await hourlyResponse.json()
      if (Array.isArray(hourlyData) && hourlyData.length > 0) {
        dstData = hourlyData
      }
    }
    
    // Fall back to 7-day data if 1-hour is not available
    if (dstData.length === 0 && weeklyResponse && weeklyResponse.ok) {
      const weeklyData = await weeklyResponse.json()
      if (Array.isArray(weeklyData) && weeklyData.length > 0) {
        // Get last 48 hours from weekly data
        dstData = weeklyData.slice(-48)
      }
    }
    
    if (dstData.length === 0) {
      throw new Error('No DST data available')
    }
    
    // Process the data
    const validData = dstData.filter(d => 
      d.dst !== null && 
      d.dst !== undefined &&
      !isNaN(parseFloat(d.dst))
    )
    
    if (validData.length === 0) {
      throw new Error('No valid DST data')
    }
    
    // Get current DST (most recent)
    const current = parseFloat(validData[validData.length - 1].dst)
    
    // Calculate 24h statistics
    const last24h = validData.slice(-24)
    const values24h = last24h.map(d => parseFloat(d.dst))
    const min24h = Math.min(...values24h)
    const max24h = Math.max(...values24h)
    const average24h = values24h.reduce((a, b) => a + b, 0) / values24h.length
    
    // Calculate trend
    const trend = calculateTrend(values24h)
    
    // Create history for sparkline
    const history = validData.slice(-48).map(d => ({
      time: new Date(d.time_tag),
      value: parseFloat(d.dst)
    }))
    
    // Calculate storm probabilities
    const stormProbability = calculateStormProbability(current, trend)
    
    const responseData: DstIndexData = {
      current,
      currentLevel: getDstLevel(current),
      min24h,
      max24h,
      average24h,
      trend,
      history,
      stormProbability
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    })
    
  } catch (error) {
    console.error('Error fetching DST index data:', error)
    
    // Return fallback data
    const fallbackData: DstIndexData = {
      current: -15,
      currentLevel: 'Quiet',
      min24h: -20,
      max24h: -5,
      average24h: -12,
      trend: 'stable',
      history: [],
      stormProbability: {
        minor: 10,
        moderate: 5,
        strong: 1,
        severe: 0
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