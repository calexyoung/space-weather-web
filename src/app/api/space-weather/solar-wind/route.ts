import { NextRequest, NextResponse } from 'next/server'
import { fetchHAPIDataWithFallback, SPACE_WEATHER_DATASETS } from '@/lib/hapi/hapi-client'
import { format, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    
    // Default to last 3 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : subDays(end, 3)
    
    // Fetch solar wind data from HAPI
    const result = await fetchHAPIDataWithFallback(
      SPACE_WEATHER_DATASETS.solar_wind.servers,
      [start, end]
    )
    
    // Transform data for Recharts format
    const transformedData = result.datalist.map(item => ({
      time: item.time instanceof Date ? item.time.toISOString() : item.time,
      timestamp: item.time instanceof Date ? item.time.getTime() : new Date(item.time as string).getTime(),
      speed: typeof item.bulk_speed === 'number' ? item.bulk_speed : null,
      density: typeof item.proton_density === 'number' ? item.proton_density : null,
      temperature: typeof item.proton_temperature === 'number' ? item.proton_temperature : null,
      displayTime: format(
        item.time instanceof Date ? item.time : new Date(item.time as string),
        'MM/dd HH:mm'
      )
    })).filter(item => item.speed !== null || item.density !== null)
    
    return NextResponse.json({
      data: transformedData,
      metadata: result.metadata,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching solar wind data:', error)
    
    // Try NOAA backup source
    try {
      const noaaData = await fetchNOAASolarWind(start, end)
      return NextResponse.json({
        data: noaaData,
        metadata: {
          source: 'NOAA SWPC',
          server: 'https://services.swpc.noaa.gov'
        },
        timeRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      })
    } catch (noaaError) {
      console.error('NOAA backup also failed:', noaaError)
      
      // Return mock data on error for development
      const mockData = generateMockSolarWindData()
      return NextResponse.json({
        data: mockData,
        metadata: {
          source: 'Mock Data',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }
}

async function fetchNOAASolarWind(start: Date, end: Date) {
  const response = await fetch(
    'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json',
    { signal: AbortSignal.timeout(30000) }
  )
  
  if (!response.ok) {
    throw new Error(`NOAA API error: ${response.status}`)
  }
  
  const data = await response.json()
  
  // Skip header row and transform data
  return data.slice(1)
    .map((row: any[]) => {
      const time = new Date(row[0])
      return {
        time: time.toISOString(),
        timestamp: time.getTime(),
        speed: parseFloat(row[2]) || null,
        density: parseFloat(row[1]) || null,
        temperature: parseFloat(row[3]) || null,
        displayTime: format(time, 'MM/dd HH:mm')
      }
    })
    .filter((item: any) => {
      const itemTime = new Date(item.time)
      return itemTime >= start && itemTime <= end
    })
}

function generateMockSolarWindData() {
  const now = new Date()
  const data = []
  
  for (let i = 72; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      time: time.toISOString(),
      timestamp: time.getTime(),
      speed: 400 + Math.sin(i / 10) * 150 + Math.random() * 50,
      density: 5 + Math.sin(i / 8) * 3 + Math.random() * 2,
      temperature: 50000 + Math.sin(i / 12) * 20000,
      displayTime: format(time, 'MM/dd HH:mm')
    })
  }
  
  return data
}