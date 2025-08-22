import { NextResponse } from 'next/server'
import { fetchAllSources, getLatestReportsBySource } from '@/lib/sources/aggregator'
import { createApiResponse, createApiError } from '@/lib/validators'
import { SourceType } from '@/lib/types/space-weather'
import { z } from 'zod'

const QuerySchema = z.object({
  sources: z.string().optional().transform(val => 
    val ? val.split(',').filter(s => SourceType.safeParse(s).success) as ("NOAA_SWPC" | "UK_MET_OFFICE" | "BOM_SWS" | "SIDC_BELGIUM" | "OTHER")[] : undefined
  ),
  save: z.string().transform(val => val === 'true').default('false'),
  cached: z.string().transform(val => val === 'true').default('false'),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = QuerySchema.parse({
      sources: url.searchParams.get('sources'),
      save: url.searchParams.get('save') || 'false',
      cached: url.searchParams.get('cached') || 'false',
    })

    // If cached data requested, try to get from database first
    if (query.cached) {
      const cachedReports = await getLatestReportsBySource(query.sources)
      if (cachedReports.length > 0) {
        return NextResponse.json(createApiResponse(true, {
          sources: cachedReports.map(report => ({
            source: report.source,
            success: true,
            data: report,
            cached: true,
          })),
          successfulSources: cachedReports,
          errors: [],
          totalResponseTime: 0,
          cached: true,
        }))
      }
    }

    // Fetch fresh data
    const result = await fetchAllSources(query.sources, query.save)

    return NextResponse.json(createApiResponse(true, {
      ...result,
      cached: false,
    }))

  } catch (error) {
    console.error('All sources API error:', error)
    return NextResponse.json(
      createApiError('Internal server error'),
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const RequestSchema = z.object({
      sources: z.array(SourceType).optional(),
      save: z.boolean().default(true),
    })

    const { sources, save } = RequestSchema.parse(body)

    const result = await fetchAllSources(sources, save)

    if (result.errors.length > 0 && result.successfulSources.length === 0) {
      return NextResponse.json(
        createApiError(`All sources failed: ${result.errors.join('; ')}`),
        { status: 500 }
      )
    }

    return NextResponse.json(createApiResponse(true, result))

  } catch (error) {
    console.error('All sources POST error:', error)
    return NextResponse.json(
      createApiError('Internal server error'),
      { status: 500 }
    )
  }
}