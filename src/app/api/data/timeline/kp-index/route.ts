import { NextRequest, NextResponse } from 'next/server'
import { fetchHAPIDataWithFallback, SPACE_WEATHER_DATASETS } from '@/lib/hapi/hapi-client'
import { format, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange')
    const startDate = url.searchParams.get('start')
    const endDate = url.searchParams.get('end')
    
    // Calculate time range - support both formats
    const now = new Date()
    let startTime: Date
    let endTime: Date = now
    
    if (startDate && endDate) {
      startTime = new Date(startDate)
      endTime = new Date(endDate)
    } else if (timeRange) {
      switch (timeRange) {
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000)
          break
        case '12h':
          startTime = new Date(now.getTime() - 12 * 60 * 60 * 1000)
          break
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '3d':
          startTime = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
          break
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }
    } else {
      // Default to 3 days for Earth tab compatibility
      startTime = subDays(now, 3)
    }

    // Fetch real Kp index data from HAPI servers
    const hapiResult = await fetchHAPIDataWithFallback(
      SPACE_WEATHER_DATASETS.kp_index.servers,
      [startTime, endTime]
    )

    // Transform HAPI data to our timeline format
    const transformedData = hapiResult.datalist
      .map(item => ({
        time: item.time instanceof Date ? item.time.toISOString() : item.time,
        timestamp: item.time instanceof Date ? item.time.getTime() : new Date(item.time as string).getTime(),
        kp: typeof item.Kp === 'number' ? Math.max(0, Math.min(9, item.Kp)) : 0, // Clamp to 0-9 range
        forecast: 0, // HAPI may not include forecast, but keep for compatibility
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

    if (transformedData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid Kp index data available in the requested time range',
        data: []
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: transformedData,
      metadata: {
        ...hapiResult.metadata,
        timeRange: timeRange || `${Math.ceil((endTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000))}d`,
        requestedTimeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString()
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes (Kp updates less frequently)
      },
    })

  } catch (error) {
    console.error('Error fetching Kp index timeline data:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Kp index data',
      data: [],
      details: 'HAPI servers may be temporarily unavailable'
    }, { 
      status: 503, // Service Unavailable
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '300',
      }
    })
  }
}