import { NextResponse } from 'next/server'
import { normalizeSidcData } from '@/lib/sources/sidc-scraper'
import { createApiResponse, createApiError } from '@/lib/validators'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Fetch fresh data from SIDC
    const data = await normalizeSidcData()
    
    // Save to database for historical tracking
    try {
      await db.normalizedReport.create({
        data: {
          source: data.source,
          sourceUrl: data.sourceUrl,
          issuedAt: data.issuedAt,
          fetchedAt: data.fetchedAt || new Date(),
          headline: data.headline,
          summary: data.summary,
          details: data.details,
          confidence: data.confidence,
          validStart: data.validStart,
          validEnd: data.validEnd,
          geomagneticLevel: data.geomagneticLevel,
          geomagneticText: data.geomagneticText,
          radioBlackoutLevel: data.radioBlackoutLevel,
          radioBlackoutText: data.radioBlackoutText,
          radiationStormLevel: data.radiationStormLevel,
          radiationStormText: data.radiationStormText,
          rawPayload: data.rawPayload,
          processingErrors: data.processingErrors,
          qualityScore: data.qualityScore,
        }
      })
    } catch (dbError) {
      console.error('Failed to save SIDC data to database:', dbError)
      // Continue without saving - don't fail the request
    }
    
    return NextResponse.json(createApiResponse(true, data))
  } catch (error) {
    console.error('SIDC API error:', error)
    return NextResponse.json(
      createApiError(
        error instanceof Error ? error.message : 'Failed to fetch SIDC data',
        'FETCH_ERROR'
      ),
      { status: 500 }
    )
  }
}

export async function POST() {
  // Force refresh endpoint
  try {
    const data = await normalizeSidcData()
    
    // Always save to database on POST (force refresh)
    await db.normalizedReport.create({
      data: {
        source: data.source,
        sourceUrl: data.sourceUrl,
        issuedAt: data.issuedAt,
        fetchedAt: data.fetchedAt || new Date(),
        headline: data.headline,
        summary: data.summary,
        details: data.details,
        confidence: data.confidence,
        validStart: data.validStart,
        validEnd: data.validEnd,
        geomagneticLevel: data.geomagneticLevel,
        geomagneticText: data.geomagneticText,
        radioBlackoutLevel: data.radioBlackoutLevel,
        radioBlackoutText: data.radioBlackoutText,
        radiationStormLevel: data.radiationStormLevel,
        radiationStormText: data.radiationStormText,
        rawPayload: data.rawPayload,
        processingErrors: data.processingErrors,
        qualityScore: data.qualityScore,
      }
    })
    
    return NextResponse.json(createApiResponse(true, data))
  } catch (error) {
    console.error('SIDC force refresh error:', error)
    return NextResponse.json(
      createApiError(
        error instanceof Error ? error.message : 'Failed to refresh SIDC data',
        'REFRESH_ERROR'
      ),
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}