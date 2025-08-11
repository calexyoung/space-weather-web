import { spaceWeatherClient, getErrorMessage } from '../http-client'
import { NormalizedReport, SourceTypeEnum } from '../types/space-weather'
import { validateDataQuality } from '../validators'

export interface HelioFlareData {
  raw: string
  flareEvents: FlareEvent[]
  activeRegions: ActiveRegion[]
}

export interface FlareEvent {
  time?: Date
  classification?: string
  region?: string
  location?: string
  duration?: string
}

export interface ActiveRegion {
  number?: string
  location?: string
  magneticClass?: string
  area?: string
}

export async function fetchHelioCurrentActivity(): Promise<string> {
  try {
    const url = 'http://helio.mssl.ucl.ac.uk/helio-vo/solar_activity/current/'
    const data = await spaceWeatherClient.get<string>(url)
    return data
  } catch (error) {
    throw new Error(`Failed to fetch Helio current activity: ${getErrorMessage(error)}`)
  }
}

export function parseHelioActivity(content: string): HelioFlareData {
  const result: HelioFlareData = {
    raw: content,
    flareEvents: [],
    activeRegions: [],
  }

  try {
    // Parse flare events from various possible formats
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
    
    for (const line of lines) {
      // Look for flare classifications (X, M, C class)
      const flareMatch = line.match(/([CMX]\d+\.?\d*)/i)
      if (flareMatch) {
        const flareEvent: FlareEvent = {
          classification: flareMatch[1].toUpperCase(),
        }

        // Try to extract time information
        const timeMatch = line.match(/(\d{2}:\d{2}|\d{4}-\d{2}-\d{2})/i)
        if (timeMatch) {
          // Simple time parsing - would need more sophisticated parsing for production
          flareEvent.time = new Date() // Placeholder
        }

        // Try to extract region number
        const regionMatch = line.match(/(?:AR|region)\s*(\d+)/i)
        if (regionMatch) {
          flareEvent.region = regionMatch[1]
        }

        result.flareEvents.push(flareEvent)
      }

      // Look for active region information
      const regionMatch = line.match(/(?:AR|region)\s*(\d+)/i)
      if (regionMatch && !result.activeRegions.find(r => r.number === regionMatch[1])) {
        const activeRegion: ActiveRegion = {
          number: regionMatch[1],
        }

        // Try to extract magnetic classification
        const magneticMatch = line.match(/(beta|beta-gamma|beta-gamma-delta)/i)
        if (magneticMatch) {
          activeRegion.magneticClass = magneticMatch[1]
        }

        result.activeRegions.push(activeRegion)
      }
    }

  } catch (error) {
    console.warn('Error parsing Helio activity data:', error)
  }

  return result
}

export async function normalizeHelioData(): Promise<NormalizedReport> {
  const content = await fetchHelioCurrentActivity()
  const parsed = parseHelioActivity(content)

  // Generate summary from parsed data
  let summary = 'Solar activity summary: '
  if (parsed.flareEvents.length > 0) {
    const flareClasses = parsed.flareEvents.map(f => f.classification).join(', ')
    summary += `Recent flares: ${flareClasses}. `
  }
  if (parsed.activeRegions.length > 0) {
    summary += `Active regions: ${parsed.activeRegions.length}. `
  }

  const report: NormalizedReport = {
    source: 'HELIO_UCLES' as SourceTypeEnum,
    sourceUrl: 'http://helio.mssl.ucl.ac.uk/helio-vo/solar_activity/current/',
    issuedAt: new Date(), // HELIO data doesn't always have clear issue times
    fetchedAt: new Date(),
    headline: `Solar Activity Report - ${parsed.flareEvents.length} flares, ${parsed.activeRegions.length} active regions`,
    summary: summary || 'Solar activity data from HELIO observatory network',
    details: content,
    rawPayload: {
      content,
      parsed,
    },
    processingErrors: [],
  }

  // Add quality score
  const quality = validateDataQuality(report)
  report.qualityScore = quality.score
  report.processingErrors = quality.issues

  return report
}