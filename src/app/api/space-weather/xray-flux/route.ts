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
    
    // Fetch X-ray flux data from HAPI
    const servers = SPACE_WEATHER_DATASETS.xray_flux.servers.map(server => ({
      server: server.server,
      dataset: server.dataset,
      parameters: [...server.parameters],
      timeParameter: server.timeParameter
    }))
    const result = await fetchHAPIDataWithFallback(
      servers,
      [start, end]
    )
    
    // Transform data for Recharts format
    const transformedData = result.datalist.map(item => ({
      time: item.time instanceof Date ? item.time.toISOString() : item.time,
      timestamp: item.time instanceof Date ? item.time.getTime() : new Date(item.time as string).getTime(),
      xray_flux_long: typeof item.xray_flux_long === 'number' ? item.xray_flux_long : null,
      xray_flux_short: typeof item.xray_flux_short === 'number' ? item.xray_flux_short : null,
      displayTime: format(
        item.time instanceof Date ? item.time : new Date(item.time as string),
        'MM/dd HH:mm'
      )
    })).filter(item => item.xray_flux_long !== null || item.xray_flux_short !== null)
    
    return NextResponse.json({
      data: transformedData,
      metadata: result.metadata,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching X-ray flux data:', error)
    
    // Return mock data on error for development
    const mockData = generateMockXrayData()
    return NextResponse.json({
      data: mockData,
      metadata: {
        source: 'Mock Data',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}

function generateMockXrayData() {
  const now = new Date()
  const data = []
  
  for (let i = 72; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      time: time.toISOString(),
      timestamp: time.getTime(),
      xray_flux_long: 1e-7 * Math.exp(Math.sin(i / 10) * 2),
      xray_flux_short: 1e-8 * Math.exp(Math.sin(i / 8) * 2),
      displayTime: format(time, 'MM/dd HH:mm')
    })
  }
  
  return data
}