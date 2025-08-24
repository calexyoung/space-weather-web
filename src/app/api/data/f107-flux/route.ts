import { NextResponse } from 'next/server'

const NOAA_F107_URL = 'https://services.swpc.noaa.gov/json/f107_cm_flux.json'

export interface F107FluxData {
  current: number
  observed: number
  adjusted: number
  monthlyAverage: number
  trend: 'increasing' | 'decreasing' | 'stable'
  solarCyclePhase: 'minimum' | 'rising' | 'maximum' | 'declining'
  history: Array<{
    time: Date
    observed: number
    adjusted: number
  }>
  forecast: Array<{
    time: Date
    predicted: number
    uncertainty: number
  }>
  statistics: {
    min30d: number
    max30d: number
    avg30d: number
    percentile: number // Current value percentile in 30d range
  }
}

function determineSolarCyclePhase(flux: number, avg: number): F107FluxData['solarCyclePhase'] {
  // Solar cycle phase based on F10.7 flux levels
  if (flux < 75) return 'minimum'
  if (flux < 100 && flux > avg) return 'rising'
  if (flux >= 150) return 'maximum'
  if (flux >= 100 && flux < avg) return 'declining'
  return 'rising' // Default
}

function calculateTrend(values: number[]): F107FluxData['trend'] {
  if (values.length < 3) return 'stable'
  
  // Simple linear regression for trend
  const n = values.length
  const indices = Array.from({ length: n }, (_, i) => i)
  
  const sumX = indices.reduce((a, b) => a + b, 0)
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0)
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  
  if (Math.abs(slope) < 0.5) return 'stable'
  return slope > 0 ? 'increasing' : 'decreasing'
}

export async function GET() {
  try {
    const response = await fetch(NOAA_F107_URL, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!response.ok) {
      throw new Error(`NOAA API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid F10.7 data format')
    }
    
    // Sort by time (most recent last)
    const sortedData = data.sort((a, b) => 
      new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime()
    )
    
    // Get the most recent valid entry (field is 'flux' not 'f107')
    let current: number
    const currentEntry = sortedData
      .filter(d => d.flux !== null && d.flux !== undefined && !isNaN(parseFloat(d.flux)))
      .pop()
    
    if (!currentEntry) {
      console.warn('No valid F10.7 data available, checking for alternative field names')
      // Try alternative field names that NOAA might use
      const altEntry = sortedData
        .filter(d => (d.f107 !== null && !isNaN(parseFloat(d.f107))) || 
                     (d.value !== null && !isNaN(parseFloat(d.value))))
        .pop()
      
      if (!altEntry) {
        console.error('F10.7 data format issue - no valid flux field found in:', sortedData[0])
        throw new Error('No valid F10.7 data available')
      }
      
      // Use alternative field
      current = parseFloat(altEntry.f107 || altEntry.value)
    } else {
      current = parseFloat(currentEntry.flux)
    }
    
    // Process historical data (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const last30Days = sortedData.filter(d => {
      const date = new Date(d.time_tag)
      return date >= thirtyDaysAgo && (d.flux !== null || d.f107 !== null || d.value !== null)
    })
    
    // Calculate statistics - handle different field names
    const values30d = last30Days.map(d => parseFloat(d.flux || d.f107 || d.value))
    const min30d = Math.min(...values30d)
    const max30d = Math.max(...values30d)
    const avg30d = values30d.reduce((a, b) => a + b, 0) / values30d.length
    
    // Calculate percentile
    const sortedValues = [...values30d].sort((a, b) => a - b)
    const currentIndex = sortedValues.findIndex(v => v >= current)
    const percentile = Math.round((currentIndex / sortedValues.length) * 100)
    
    // Calculate trend from last 7 days - handle different field names
    const last7Days = last30Days.slice(-7).map(d => parseFloat(d.flux || d.f107 || d.value))
    const trend = calculateTrend(last7Days)
    
    // Determine solar cycle phase
    const solarCyclePhase = determineSolarCyclePhase(current, avg30d)
    
    // Format history for chart - handle different field names
    const history = last30Days.map(d => {
      const value = parseFloat(d.flux || d.f107 || d.value)
      return {
        time: new Date(d.time_tag),
        observed: value,
        adjusted: value * 0.9 // Simplified adjustment
      }
    })
    
    // Generate simple forecast (3 days)
    const forecast: F107FluxData['forecast'] = []
    const lastValue = current
    const trendFactor = trend === 'increasing' ? 1.01 : trend === 'decreasing' ? 0.99 : 1.0
    
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date()
      forecastDate.setDate(forecastDate.getDate() + i)
      const predicted = lastValue * Math.pow(trendFactor, i)
      const uncertainty = 5 + i * 2 // Increasing uncertainty
      
      forecast.push({
        time: forecastDate,
        predicted: Math.round(predicted * 10) / 10,
        uncertainty
      })
    }
    
    // Calculate monthly average - handle different field names
    const monthlyValues = last30Days
      .slice(-30)
      .map(d => parseFloat(d.flux || d.f107 || d.value))
    const monthlyAverage = monthlyValues.length > 0
      ? Math.round(monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length * 10) / 10
      : current
    
    const responseData: F107FluxData = {
      current,
      observed: current,
      adjusted: Math.round(current * 0.9 * 10) / 10, // Simplified adjustment
      monthlyAverage,
      trend,
      solarCyclePhase,
      history,
      forecast,
      statistics: {
        min30d: Math.round(min30d * 10) / 10,
        max30d: Math.round(max30d * 10) / 10,
        avg30d: Math.round(avg30d * 10) / 10,
        percentile
      }
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
    
  } catch (error) {
    console.error('Error fetching F10.7 flux data:', error)
    
    // Return fallback data
    const fallbackData: F107FluxData = {
      current: 120,
      observed: 120,
      adjusted: 108,
      monthlyAverage: 115,
      trend: 'stable',
      solarCyclePhase: 'rising',
      history: [],
      forecast: [],
      statistics: {
        min30d: 105,
        max30d: 135,
        avg30d: 115,
        percentile: 60
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