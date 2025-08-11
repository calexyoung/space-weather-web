import { spaceWeatherClient, getErrorMessage } from '../http-client'
import { NormalizedReport, SourceTypeEnum } from '../types/space-weather'
import { validateDataQuality } from '../validators'

export interface UkmoForecast {
  raw: string
  headline?: string
  summary?: string
  forecast?: string
  issueTime?: Date
}

export async function fetchUkmoForecast(): Promise<string> {
  try {
    const url = 'https://weather.metoffice.gov.uk/specialist-forecasts/space-weather'
    const data = await spaceWeatherClient.get<string>(url)
    return data
  } catch (error) {
    throw new Error(`Failed to fetch UK Met Office forecast: ${getErrorMessage(error)}`)
  }
}

export function parseUkmoHtml(html: string): UkmoForecast {
  const result: UkmoForecast = { raw: html }

  try {
    // Extract title/headline
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) {
      result.headline = titleMatch[1].replace(/\s+/g, ' ').trim()
    }

    // Extract main content paragraphs
    const paragraphMatches = html.matchAll(/<p[^>]*>([^<]+)<\/p>/gi)
    const paragraphs = Array.from(paragraphMatches).map(match => 
      match[1].replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim()
    ).filter(p => p.length > 20) // Filter out short paragraphs

    if (paragraphs.length > 0) {
      result.summary = paragraphs[0]
    }

    if (paragraphs.length > 1) {
      result.forecast = paragraphs.slice(1).join(' ')
    }

    // Try to extract issue time from various possible formats
    const timePatterns = [
      /issued[^:]*:\s*([^<\n]+)/i,
      /updated[^:]*:\s*([^<\n]+)/i,
      /(\d{1,2}:\d{2}.*?(?:GMT|UTC))/i,
    ]

    for (const pattern of timePatterns) {
      const timeMatch = html.match(pattern)
      if (timeMatch) {
        const parsed = new Date(timeMatch[1])
        if (!isNaN(parsed.getTime())) {
          result.issueTime = parsed
          break
        }
      }
    }

  } catch (error) {
    // HTML parsing errors are non-fatal, we'll work with what we have
    console.warn('Error parsing UK Met Office HTML:', error)
  }

  return result
}

export function extractTextFromHtml(html: string): string {
  // Simple HTML tag removal and text extraction
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function normalizeUkmoData(): Promise<NormalizedReport> {
  const htmlContent = await fetchUkmoForecast()
  const parsed = parseUkmoHtml(htmlContent)
  const textContent = extractTextFromHtml(htmlContent)

  const report: NormalizedReport = {
    source: 'UK_MET_OFFICE' as SourceTypeEnum,
    sourceUrl: 'https://weather.metoffice.gov.uk/specialist-forecasts/space-weather',
    issuedAt: parsed.issueTime || new Date(),
    fetchedAt: new Date(),
    headline: parsed.headline || 'UK Met Office Space Weather Forecast',
    summary: parsed.summary || textContent.substring(0, 200) || 'No summary available',
    details: textContent || 'No content available',
    rawPayload: {
      html: htmlContent,
      parsed,
      textContent,
    },
    processingErrors: [],
  }

  // Add quality score
  const quality = validateDataQuality(report)
  report.qualityScore = quality.score
  report.processingErrors = quality.issues

  return report
}