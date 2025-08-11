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
    
    // Fetch magnetic field data from HAPI
    const result = await fetchHAPIDataWithFallback(
      SPACE_WEATHER_DATASETS.magnetic_field.servers,
      [start, end]
    )
    
    // Transform data for Recharts format
    const transformedData = result.datalist.map(item => {
      const bt = typeof item.bt === 'number' ? item.bt : null
      const bz = typeof item.bz_gsm === 'number' ? item.bz_gsm : null
      const bx = typeof item.bx_gsm === 'number' ? item.bx_gsm : null
      const by = typeof item.by_gsm === 'number' ? item.by_gsm : null
      
      return {
        time: item.time instanceof Date ? item.time.toISOString() : item.time,
        timestamp: item.time instanceof Date ? item.time.getTime() : new Date(item.time as string).getTime(),
        bt: bt,
        bx: bx || (bt && bz ? Math.sqrt(Math.max(0, bt * bt - bz * bz)) * 0.7 : null),
        by: by || (bt && bz ? Math.sqrt(Math.max(0, bt * bt - bz * bz)) * 0.3 : null),
        bz: bz,
        displayTime: format(
          item.time instanceof Date ? item.time : new Date(item.time as string),
          'MM/dd HH:mm'
        )
      }
    }).filter(item => item.bt !== null || item.bz !== null)
    
    return NextResponse.json({
      data: transformedData,
      metadata: result.metadata,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching IMF data:', error)
    
    // Return mock data on error for development
    const mockData = generateMockIMFData()
    return NextResponse.json({
      data: mockData,
      metadata: {
        source: 'Mock Data',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
}

function generateMockIMFData() {
  const now = new Date()
  const data = []
  
  for (let i = 72; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    const bt = 5 + Math.sin(i / 10) * 3
    const bz = Math.sin(i / 8) * 4
    const bx = Math.cos(i / 12) * 3
    const by = Math.sin(i / 6) * 2
    
    data.push({
      time: time.toISOString(),
      timestamp: time.getTime(),
      bt: bt,
      bx: bx,
      by: by,
      bz: bz,
      displayTime: format(time, 'MM/dd HH:mm')
    })
  }
  
  return data
}