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
    
    // Fetch Kp index data from HAPI
    const servers = SPACE_WEATHER_DATASETS.kp_index.servers.map(server => ({
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
    const transformedData = result.datalist
      .map(item => ({
        time: item.time instanceof Date ? item.time.toISOString() : item.time,
        timestamp: item.time instanceof Date ? item.time.getTime() : new Date(item.time as string).getTime(),
        kp: typeof item.Kp === 'number' ? Math.max(0, Math.min(9, item.Kp)) : 0,
        forecast: 0, // HAPI may not include forecast
        displayTime: format(
          item.time instanceof Date ? item.time : new Date(item.time as string),
          'MM/dd HH:mm'
        )
      }))
      .filter(item => 
        !isNaN(item.kp) && 
        item.kp >= 0 && 
        item.kp <= 9
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
    console.error('Error fetching Kp index data:', error)
    
    // Return mock data on error for development
    const mockData = generateMockKpData()
    return NextResponse.json({
      data: mockData,
      metadata: {
        source: 'Mock Data',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}

function generateMockKpData() {
  const now = new Date()
  const data = []
  
  // Kp is typically measured every 3 hours
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3 * 60 * 60 * 1000)
    const kpBase = 2 + Math.sin(i / 4) * 2
    const kpValue = Math.max(0, Math.min(9, kpBase + Math.random() * 2))
    
    data.push({
      time: time.toISOString(),
      timestamp: time.getTime(),
      kp: Math.round(kpValue * 10) / 10, // Round to 1 decimal place
      forecast: 0,
      displayTime: format(time, 'MM/dd HH:mm')
    })
  }
  
  return data
}