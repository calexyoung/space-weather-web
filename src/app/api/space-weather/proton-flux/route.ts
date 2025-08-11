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
    
    // Fetch proton flux data from HAPI
    const result = await fetchHAPIDataWithFallback(
      SPACE_WEATHER_DATASETS.proton_flux.servers,
      [start, end]
    )
    
    // Transform data for Recharts format
    const transformedData = result.datalist.map(item => ({
      time: item.time instanceof Date ? item.time.toISOString() : item.time,
      timestamp: item.time instanceof Date ? item.time.getTime() : new Date(item.time as string).getTime(),
      proton_1MeV: typeof item.proton_flux_1MeV === 'number' ? item.proton_flux_1MeV : null,
      proton_5MeV: typeof item.proton_flux_5MeV === 'number' ? item.proton_flux_5MeV : null,
      proton_10MeV: typeof item.proton_flux_10MeV === 'number' ? item.proton_flux_10MeV : null,
      proton_30MeV: typeof item.proton_flux_30MeV === 'number' ? item.proton_flux_30MeV : null,
      proton_50MeV: typeof item.proton_flux_50MeV === 'number' ? item.proton_flux_50MeV : null,
      proton_100MeV: typeof item.proton_flux_100MeV === 'number' ? item.proton_flux_100MeV : null,
      displayTime: format(
        item.time instanceof Date ? item.time : new Date(item.time as string),
        'MM/dd HH:mm'
      )
    })).filter(item => 
      item.proton_10MeV !== null || 
      item.proton_50MeV !== null || 
      item.proton_100MeV !== null
    )
    
    return NextResponse.json({
      data: transformedData,
      metadata: result.metadata,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching proton flux data:', error)
    
    // Return mock data on error for development
    const mockData = generateMockProtonData()
    return NextResponse.json({
      data: mockData,
      metadata: {
        source: 'Mock Data',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}

function generateMockProtonData() {
  const now = new Date()
  const data = []
  
  for (let i = 72; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      time: time.toISOString(),
      timestamp: time.getTime(),
      proton_1MeV: 1e2 * Math.exp(Math.sin(i / 12) * 1.5),
      proton_5MeV: 1e1 * Math.exp(Math.sin(i / 10) * 1.5),
      proton_10MeV: 1e0 * Math.exp(Math.sin(i / 8) * 1.5),
      proton_30MeV: 1e-1 * Math.exp(Math.sin(i / 6) * 1.5),
      proton_50MeV: 1e-2 * Math.exp(Math.sin(i / 5) * 1.5),
      proton_100MeV: 1e-3 * Math.exp(Math.sin(i / 4) * 1.5),
      displayTime: format(time, 'MM/dd HH:mm')
    })
  }
  
  return data
}