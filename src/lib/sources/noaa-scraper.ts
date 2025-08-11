import { spaceWeatherClient, getErrorMessage } from '../http-client'
import { NormalizedReport, SourceTypeEnum, HazardLevelEnum } from '../types/space-weather'
import { safeParseDate, validateDataQuality } from '../validators'

export interface NoaaDiscussion {
  raw: string
  issuedAt?: Date
  headline?: string
  summary?: string
  forecast?: string
  hazards?: {
    geomagnetic?: string
    radio?: string
    radiation?: string
  }
}

export async function fetchNoaaDiscussion(): Promise<string> {
  try {
    const url = 'https://services.swpc.noaa.gov/text/discussion.txt'
    const data = await spaceWeatherClient.get<string>(url)
    return data
  } catch (error) {
    throw new Error(`Failed to fetch NOAA discussion: ${getErrorMessage(error)}`)
  }
}

export async function fetchNoaaSolarRegions(): Promise<string> {
  try {
    const url = 'https://services.swpc.noaa.gov/text/srs.txt'
    const data = await spaceWeatherClient.get<string>(url)
    return data
  } catch (error) {
    throw new Error(`Failed to fetch NOAA solar regions: ${getErrorMessage(error)}`)
  }
}

export function parseNoaaDiscussion(text: string): NoaaDiscussion {
  const lines = text.split('\n').map(line => line.trim())
  const result: NoaaDiscussion = { raw: text }

  // Find issue date/time
  const dateMatch = text.match(/(\d{4}\s+\w{3}\s+\d{1,2}\s+\d{4})\s+UTC/i)
  if (dateMatch) {
    result.issuedAt = safeParseDate(dateMatch[1]) || undefined
  }

  // Extract sections
  let currentSection = ''
  const sections: { [key: string]: string[] } = {}

  for (const line of lines) {
    if (line.includes('ANALYSIS') || line.includes('FORECAST')) {
      currentSection = line
      sections[currentSection] = []
    } else if (currentSection && line) {
      sections[currentSection].push(line)
    }
  }

  // Extract headline from first meaningful line
  const meaningfulLines = lines.filter(line => 
    line.length > 10 && 
    !line.includes('NOAA') && 
    !line.includes('UTC') &&
    !line.includes('---')
  )
  if (meaningfulLines.length > 0) {
    result.headline = meaningfulLines[0]
  }

  // Combine analysis sections for summary
  const analysisSections = Object.keys(sections).filter(key => 
    key.includes('ANALYSIS')
  )
  if (analysisSections.length > 0) {
    result.summary = analysisSections.map(key => 
      sections[key].join(' ')
    ).join(' ').substring(0, 500)
  }

  // Combine forecast sections
  const forecastSections = Object.keys(sections).filter(key => 
    key.includes('FORECAST')
  )
  if (forecastSections.length > 0) {
    result.forecast = forecastSections.map(key => 
      sections[key].join(' ')
    ).join(' ').substring(0, 500)
  }

  return result
}

export function extractFlareInfo(text: string): { count: number; highest?: string } {
  // Extract solar flare information using regex pattern from Python code
  const flarePattern = /([CMX])([0-9]+\.?[0-9]*)/gi
  const matches = Array.from(text.matchAll(flarePattern))
  
  if (matches.length === 0) {
    return { count: 0 }
  }

  // Convert flare classifications to numerical values for comparison
  const flareValues = matches.map(match => {
    const flareClass = match[1].toUpperCase()
    const magnitude = parseFloat(match[2])
    
    let baseValue = 0
    switch (flareClass) {
      case 'X': baseValue = 1000; break
      case 'M': baseValue = 100; break
      case 'C': baseValue = 10; break
    }
    
    return {
      value: baseValue + magnitude,
      flare: `${flareClass}${magnitude}`
    }
  })

  // Find highest value flare
  const highest = flareValues.reduce((max, current) => 
    current.value > max.value ? current : max
  )

  return {
    count: matches.length,
    highest: highest.flare
  }
}

export async function normalizeNoaaData(): Promise<NormalizedReport> {
  const discussionText = await fetchNoaaDiscussion()
  const regionsText = await fetchNoaaSolarRegions()
  
  const discussion = parseNoaaDiscussion(discussionText)
  const flareInfo = extractFlareInfo(discussionText)

  const report: NormalizedReport = {
    source: 'NOAA_SWPC' as SourceTypeEnum,
    sourceUrl: 'https://services.swpc.noaa.gov/text/discussion.txt',
    issuedAt: discussion.issuedAt || new Date(),
    fetchedAt: new Date(),
    headline: discussion.headline || 'NOAA Space Weather Discussion',
    summary: discussion.summary || 'No summary available',
    details: `${discussionText}\n\n--- SOLAR REGIONS ---\n\n${regionsText}`,
    rawPayload: {
      discussion: discussionText,
      regions: regionsText,
      flareInfo,
      parsed: discussion,
    },
    processingErrors: [],
  }

  // Add quality score
  const quality = validateDataQuality(report)
  report.qualityScore = quality.score
  report.processingErrors = quality.issues

  return report
}