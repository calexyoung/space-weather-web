import { NormalizedReport, SourceTypeEnum } from '../types/space-weather'
import { normalizeNoaaData } from './noaa-scraper'
import { normalizeUkmoData } from './ukmo-scraper'
import { normalizeHelioData } from './helio-scraper'
import { db } from '../db'
import { getErrorMessage } from '../http-client'

export interface SourceFetchResult {
  source: SourceTypeEnum
  success: boolean
  data?: NormalizedReport
  error?: string
  responseTime?: number
}

export interface AggregatedData {
  sources: SourceFetchResult[]
  successfulSources: NormalizedReport[]
  errors: string[]
  totalResponseTime: number
}

export async function fetchSingleSource(
  source: SourceTypeEnum,
  saveToDb: boolean = false
): Promise<SourceFetchResult> {
  const startTime = Date.now()
  
  try {
    let data: NormalizedReport

    switch (source) {
      case 'NOAA_SWPC':
        data = await normalizeNoaaData()
        break
      case 'UK_MET_OFFICE':
        data = await normalizeUkmoData()
        break
      case 'HELIO_UCLES':
        data = await normalizeHelioData()
        break
      default:
        throw new Error(`Unsupported source: ${source}`)
    }

    const responseTime = Date.now() - startTime

    // Save to database if requested
    if (saveToDb) {
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

        // Log successful fetch
        await db.fetchLog.create({
          data: {
            source: data.source,
            url: data.sourceUrl,
            success: true,
            responseTime,
            dataPoints: 1,
          }
        })
      } catch (dbError) {
        console.error(`Failed to save ${source} data to database:`, dbError)
        // Don't fail the entire operation for database errors
      }
    }

    return {
      source,
      success: true,
      data,
      responseTime,
    }

  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = getErrorMessage(error)

    // Log failed fetch
    if (saveToDb) {
      try {
        await db.fetchLog.create({
          data: {
            source,
            success: false,
            responseTime,
            errorMessage,
          }
        })
      } catch (dbError) {
        console.error('Failed to log fetch error:', dbError)
      }
    }

    return {
      source,
      success: false,
      error: errorMessage,
      responseTime,
    }
  }
}

export async function fetchAllSources(
  sources: SourceTypeEnum[] = ['NOAA_SWPC', 'UK_MET_OFFICE', 'HELIO_UCLES'],
  saveToDb: boolean = false
): Promise<AggregatedData> {
  const startTime = Date.now()

  // Fetch all sources in parallel
  const fetchPromises = sources.map(source => fetchSingleSource(source, saveToDb))
  const results = await Promise.all(fetchPromises)

  const totalResponseTime = Date.now() - startTime
  const successfulSources = results
    .filter(result => result.success && result.data)
    .map(result => result.data!)

  const errors = results
    .filter(result => !result.success && result.error)
    .map(result => `${result.source}: ${result.error}`)

  return {
    sources: results,
    successfulSources,
    errors,
    totalResponseTime,
  }
}

export async function getLatestReportsBySource(
  sources?: SourceTypeEnum[]
): Promise<NormalizedReport[]> {
  try {
    const whereClause = sources ? { source: { in: sources } } : {}
    
    const reports = await db.normalizedReport.findMany({
      where: whereClause,
      orderBy: { fetchedAt: 'desc' },
      take: sources ? sources.length : 10, // One per source if specified
    })

    // Convert Prisma results to our type
    return reports.map(report => ({
      id: report.id,
      source: report.source as SourceTypeEnum,
      sourceUrl: report.sourceUrl || undefined,
      issuedAt: report.issuedAt,
      fetchedAt: report.fetchedAt,
      headline: report.headline,
      summary: report.summary,
      details: report.details,
      confidence: report.confidence || undefined,
      validStart: report.validStart || undefined,
      validEnd: report.validEnd || undefined,
      geomagneticLevel: report.geomagneticLevel || undefined,
      geomagneticText: report.geomagneticText || undefined,
      radioBlackoutLevel: report.radioBlackoutLevel || undefined,
      radioBlackoutText: report.radioBlackoutText || undefined,
      radiationStormLevel: report.radiationStormLevel || undefined,
      radiationStormText: report.radiationStormText || undefined,
      rawPayload: report.rawPayload,
      processingErrors: report.processingErrors,
      qualityScore: report.qualityScore || undefined,
    }))
  } catch (error) {
    console.error('Failed to fetch reports from database:', error)
    return []
  }
}

export async function getRecentFetchLogs(
  hours: number = 24
): Promise<any[]> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    return await db.fetchLog.findMany({
      where: {
        createdAt: { gte: since }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  } catch (error) {
    console.error('Failed to fetch logs from database:', error)
    return []
  }
}