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

    // Fetch real proton flux data from HAPI servers
    const hapiResult = await fetchHAPIDataWithFallback(
      SPACE_WEATHER_DATASETS.proton_flux.servers,
      [startTime, now]
    )

    // Transform HAPI data to our timeline format
    const transformedData = hapiResult.datalist
      .map(item => ({
        time: item.time.toISOString(),
        flux_10mev: typeof item.proton_flux_10mev === 'number' ? Math.max(item.proton_flux_10mev, 0.01) : 0.01,
        flux_50mev: typeof item.proton_flux_50mev === 'number' ? Math.max(item.proton_flux_50mev, 0.01) : 0.01,
        flux_100mev: typeof item.proton_flux_100mev === 'number' ? Math.max(item.proton_flux_100mev, 0.01) : 0.01
      }))
      .filter(item => 
        !isNaN(item.flux_10mev) && 
        !isNaN(item.flux_50mev) && 
        !isNaN(item.flux_100mev)
      )

    if (transformedData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid proton flux data available in the requested time range',
        data: []
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: transformedData,
      metadata: {
        ...hapiResult.metadata,
        timeRange,
        requestedTimeRange: {
          start: startTime.toISOString(),
          end: now.toISOString()
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    })

  } catch (error) {
    console.error('Error fetching proton flux timeline data:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch proton flux data',
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