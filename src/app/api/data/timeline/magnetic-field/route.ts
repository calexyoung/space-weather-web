import { NextRequest, NextResponse } from 'next/server'
import { fetchHAPIDataWithFallback, SPACE_WEATHER_DATASETS } from '@/lib/hapi/hapi-client'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '24h'
    
    // Calculate time range
    const now = new Date()
    let startTime: Date
    
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

    // Fetch real magnetic field data from HAPI servers
    // Create a mutable copy of the servers config for the function
    const servers = SPACE_WEATHER_DATASETS.magnetic_field.servers.map(server => ({
      server: server.server,
      dataset: server.dataset,
      parameters: [...server.parameters],
      timeParameter: server.timeParameter
    }))
    
    const hapiResult = await fetchHAPIDataWithFallback(
      servers,
      [startTime, now]
    )

    // Transform HAPI data to our timeline format
    const transformedData = hapiResult.datalist
      .map(item => ({
        time: item.time.toISOString(),
        bt: typeof item.bt === 'number' ? Math.max(0, item.bt) : 0,
        bz: typeof item.bz_gsm === 'number' ? item.bz_gsm : 0 // Bz can be negative
      }))
      .filter(item => 
        !isNaN(item.bt) && 
        !isNaN(item.bz)
      )

    if (transformedData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid magnetic field data available in the requested time range',
        data: []
      }, { status: 404 })
    }

    // Downsample for longer time ranges to improve performance
    let sampledData = transformedData
    if (timeRange === '7d' && transformedData.length > 1000) {
      const step = Math.ceil(transformedData.length / 1000)
      sampledData = transformedData.filter((_, index) => index % step === 0)
    } else if (timeRange === '3d' && transformedData.length > 500) {
      const step = Math.ceil(transformedData.length / 500)
      sampledData = transformedData.filter((_, index) => index % step === 0)
    }

    return NextResponse.json({
      success: true,
      data: sampledData,
      metadata: {
        ...hapiResult.metadata,
        timeRange,
        requestedTimeRange: {
          start: startTime.toISOString(),
          end: now.toISOString()
        },
        originalPoints: transformedData.length,
        sampledPoints: sampledData.length
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    })

  } catch (error) {
    console.error('Error fetching magnetic field timeline data:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch magnetic field data',
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