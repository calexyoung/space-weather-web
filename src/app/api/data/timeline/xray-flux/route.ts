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

    // Fetch real X-ray flux data from HAPI servers
    // Create a mutable copy of the servers config for the function
    const servers = SPACE_WEATHER_DATASETS.xray_flux.servers.map(server => ({
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
        flux_long: typeof item.xray_flux_long === 'number' ? item.xray_flux_long : 0,
        flux_short: typeof item.xray_flux_short === 'number' ? item.xray_flux_short : 0
      }))
      .filter(item => 
        item.flux_long > 0 && 
        item.flux_short > 0 && 
        !isNaN(item.flux_long) && 
        !isNaN(item.flux_short)
      )

    if (transformedData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid X-ray flux data available in the requested time range',
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
    console.error('Error fetching X-ray flux timeline data:', error)
    
    // Return error with indication that HAPI servers are unavailable
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch X-ray flux data',
      data: [],
      details: 'HAPI servers may be temporarily unavailable'
    }, { 
      status: 503, // Service Unavailable
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '300', // Suggest retry after 5 minutes
      }
    })
  }
}