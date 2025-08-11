import { NextResponse } from 'next/server'
import { fetchSingleSource } from '@/lib/sources/aggregator'
import { createApiResponse, createApiError } from '@/lib/validators'
import { z } from 'zod'

const QuerySchema = z.object({
  save: z.string().transform(val => val === 'true').default('false'),
  format: z.enum(['json', 'raw']).default('json'),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = QuerySchema.parse({
      save: url.searchParams.get('save') || 'false',
      format: url.searchParams.get('format') || 'json',
    })

    const result = await fetchSingleSource('HELIO_UCLES', query.save)

    if (!result.success || !result.data) {
      return NextResponse.json(
        createApiError(result.error || 'Failed to fetch HELIO data'),
        { status: 500 }
      )
    }

    if (query.format === 'raw' && result.data.rawPayload) {
      return NextResponse.json({
        success: true,
        data: result.data.rawPayload,
        responseTime: result.responseTime,
        timestamp: new Date(),
      })
    }

    return NextResponse.json(createApiResponse(true, {
      report: result.data,
      responseTime: result.responseTime,
    }))

  } catch (error) {
    console.error('HELIO API error:', error)
    return NextResponse.json(
      createApiError('Internal server error'),
      { status: 500 }
    )
  }
}