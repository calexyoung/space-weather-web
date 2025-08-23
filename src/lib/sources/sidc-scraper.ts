import { NormalizedReport, SourceTypeEnum } from '../types/space-weather'
import { fetchWithTimeout } from '../http-client'

const SIDC_URL = 'https://www.sidc.be/spaceweatherservices/managed/services/archive/product/meu/latest'
const SIDC_DATA_URL = 'https://www.sidc.be/products/meu/latest_meu.txt'

interface SidcSpaceWeatherData {
  issuedAt?: string
  solarActivity?: {
    summary?: string
    activeRegions?: number
    flares?: {
      c_class?: number
      m_class?: number
      x_class?: number
    }
    sunspotNumber?: number
  }
  geomagneticActivity?: {
    summary?: string
    kpIndex?: number
    expectedStorms?: Array<{
      level: string
      probability: number
      timing?: string
    }>
  }
  solarWind?: {
    speed?: number
    density?: number
    temperature?: number
    bz?: number
  }
  protonEvents?: {
    current?: boolean
    probability?: number
    summary?: string
  }
  forecast?: {
    next24h?: string
    next48h?: string
    next72h?: string
  }
}

export async function fetchSidcData(): Promise<SidcSpaceWeatherData> {
  try {
    // Try to fetch the text bulletin first
    const textResponse = await fetchWithTimeout(SIDC_DATA_URL, {
      headers: {
        'Accept': 'text/plain',
      }
    })
    
    if (textResponse.ok) {
      const text = await textResponse.text()
      return parseSidcText(text)
    }
  } catch (error) {
    console.warn('SIDC text fetch failed, falling back to HTML:', error)
  }

  // Fallback to HTML parsing
  const response = await fetchWithTimeout(SIDC_URL, {
    headers: {
      'User-Agent': 'SpaceWeatherMonitor/1.0',
      'Accept': 'text/html,application/xhtml+xml',
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch SIDC data: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()
  return parseSidcHtml(html)
}

function parseSidcText(text: string): SidcSpaceWeatherData {
  const data: SidcSpaceWeatherData = {}
  
  // Extract issued date
  const dateMatch = text.match(/(\d{4}[-/]\d{2}[-/]\d{2})/i)
  if (dateMatch) {
    data.issuedAt = new Date(dateMatch[1]).toISOString()
  }
  
  // Extract solar activity
  const sunspotMatch = text.match(/sunspot\s*number[:\s]*(\d+)/i)
  const activeRegionsMatch = text.match(/(\d+)\s*active\s*region/i)
  const cFlareMatch = text.match(/(\d+)\s*C-?class/i)
  const mFlareMatch = text.match(/(\d+)\s*M-?class/i)
  const xFlareMatch = text.match(/(\d+)\s*X-?class/i)
  
  data.solarActivity = {
    sunspotNumber: sunspotMatch ? parseInt(sunspotMatch[1]) : undefined,
    activeRegions: activeRegionsMatch ? parseInt(activeRegionsMatch[1]) : undefined,
    flares: {
      c_class: cFlareMatch ? parseInt(cFlareMatch[1]) : 0,
      m_class: mFlareMatch ? parseInt(mFlareMatch[1]) : 0,
      x_class: xFlareMatch ? parseInt(xFlareMatch[1]) : 0
    }
  }
  
  // Extract geomagnetic activity
  const kpMatch = text.match(/Kp[:\s]*(\d+)/i)
  const geomagneticMatch = text.match(/geomagnetic\s*conditions?\s*(?:were|are|was)?\s*([^.]+)/i)
  
  data.geomagneticActivity = {
    kpIndex: kpMatch ? parseInt(kpMatch[1]) : undefined,
    summary: geomagneticMatch ? geomagneticMatch[1].trim() : undefined
  }
  
  // Extract solar wind parameters
  const windSpeedMatch = text.match(/solar\s*wind\s*speed[:\s]*(\d+)/i)
  const windDensityMatch = text.match(/density[:\s]*(\d+\.?\d*)/i)
  const bzMatch = text.match(/Bz[:\s]*(-?\d+\.?\d*)/i)
  
  data.solarWind = {
    speed: windSpeedMatch ? parseInt(windSpeedMatch[1]) : undefined,
    density: windDensityMatch ? parseFloat(windDensityMatch[1]) : undefined,
    bz: bzMatch ? parseFloat(bzMatch[1]) : undefined
  }
  
  // Extract forecast sections
  const forecastMatch = text.match(/forecast[:\s]*([^]*?)(?=\n\n|\z)/i)
  if (forecastMatch) {
    const forecastText = forecastMatch[1]
    data.forecast = {
      next24h: extractForecastPeriod(forecastText, '24'),
      next48h: extractForecastPeriod(forecastText, '48'),
      next72h: extractForecastPeriod(forecastText, '72')
    }
  }
  
  return data
}

function parseSidcHtml(html: string): SidcSpaceWeatherData {
  // Remove HTML tags but preserve structure
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  
  // Use text parser on cleaned HTML
  return parseSidcText(text)
}

function extractForecastPeriod(text: string, hours: string): string {
  const regex = new RegExp(`next\\s*${hours}\\s*hours?[:\\s]*([^.]+\\.?)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : `No ${hours}-hour forecast available`
}

export async function normalizeSidcData(): Promise<NormalizedReport> {
  const data = await fetchSidcData()
  
  // Map Kp index to geomagnetic storm level
  const kpToGLevel = (kp: number | undefined): string | undefined => {
    if (!kp) return undefined
    if (kp >= 9) return 'G5'
    if (kp >= 8) return 'G4'
    if (kp >= 7) return 'G3'
    if (kp >= 6) return 'G2'
    if (kp >= 5) return 'G1'
    return undefined
  }
  
  // Calculate radio blackout risk based on flare activity
  const calculateRadioRisk = (flares: any): string | undefined => {
    if (!flares) return undefined
    if (flares.x_class > 0) return 'R3'
    if (flares.m_class > 2) return 'R2'
    if (flares.m_class > 0) return 'R1'
    return undefined
  }
  
  const geoLevel = kpToGLevel(data.geomagneticActivity?.kpIndex)
  const radioLevel = calculateRadioRisk(data.solarActivity?.flares)
  
  // Build components
  const headline = buildHeadline(data, geoLevel, radioLevel)
  const summary = buildSummary(data)
  const details = buildDetails(data)
  
  return {
    source: 'SIDC_BELGIUM' as SourceTypeEnum,
    sourceUrl: SIDC_URL,
    issuedAt: data.issuedAt ? new Date(data.issuedAt) : new Date(),
    fetchedAt: new Date(),
    headline,
    summary,
    details,
    confidence: 'High',
    validStart: new Date(),
    validEnd: new Date(Date.now() + 72 * 60 * 60 * 1000),
    geomagneticLevel: geoLevel as any,
    geomagneticText: data.geomagneticActivity?.summary,
    radioBlackoutLevel: radioLevel as any,
    radioBlackoutText: buildFlareText(data.solarActivity?.flares),
    radiationStormLevel: data.protonEvents?.current ? 'S1' as any : undefined,
    radiationStormText: data.protonEvents?.summary,
    rawPayload: data,
    processingErrors: [],
    qualityScore: 0.85
  }
}

function buildHeadline(data: SidcSpaceWeatherData, geoLevel?: string, radioLevel?: string): string {
  const alerts = []
  
  if (geoLevel && geoLevel >= 'G2') {
    alerts.push(`Geomagnetic Storm ${geoLevel} Conditions`)
  }
  
  if (radioLevel && radioLevel >= 'R2') {
    alerts.push(`Radio Blackout Risk ${radioLevel}`)
  }
  
  if (data.solarActivity?.flares?.x_class && data.solarActivity.flares.x_class > 0) {
    alerts.push(`X-class Flare Activity Detected`)
  }
  
  if (data.solarActivity?.activeRegions && data.solarActivity.activeRegions >= 10) {
    alerts.push(`${data.solarActivity.activeRegions} Active Regions on Solar Disk`)
  }
  
  if (alerts.length > 0) {
    return alerts.join(' | ')
  }
  
  return 'Solar Activity at Background to Low Levels'
}

function buildSummary(data: SidcSpaceWeatherData): string {
  const parts = []
  
  if (data.solarActivity?.sunspotNumber !== undefined) {
    parts.push(`Sunspot number: ${data.solarActivity.sunspotNumber}`)
  }
  
  if (data.solarActivity?.activeRegions !== undefined) {
    parts.push(`${data.solarActivity.activeRegions} active regions`)
  }
  
  if (data.solarActivity?.flares) {
    const { c_class, m_class, x_class } = data.solarActivity.flares
    if (c_class || m_class || x_class) {
      const flareList = []
      if (x_class) flareList.push(`${x_class} X-class`)
      if (m_class) flareList.push(`${m_class} M-class`)
      if (c_class) flareList.push(`${c_class} C-class`)
      parts.push(`Flares: ${flareList.join(', ')}`)
    }
  }
  
  if (data.geomagneticActivity?.summary) {
    parts.push(`Geomagnetic: ${data.geomagneticActivity.summary}`)
  }
  
  if (data.solarWind?.speed) {
    parts.push(`Solar wind: ${data.solarWind.speed} km/s`)
  }
  
  return parts.join('. ') || 'No summary available'
}

function buildDetails(data: SidcSpaceWeatherData): string {
  const sections = []
  
  sections.push('## Solar Activity')
  
  if (data.solarActivity) {
    if (data.solarActivity.sunspotNumber !== undefined) {
      sections.push(`- Sunspot Number: ${data.solarActivity.sunspotNumber}`)
    }
    
    if (data.solarActivity.activeRegions !== undefined) {
      sections.push(`- Active Regions: ${data.solarActivity.activeRegions}`)
    }
    
    if (data.solarActivity.flares) {
      sections.push('\n### Flare Activity (past 24 hours)')
      const { c_class, m_class, x_class } = data.solarActivity.flares
      if (x_class) sections.push(`- X-class flares: ${x_class}`)
      if (m_class) sections.push(`- M-class flares: ${m_class}`)
      if (c_class) sections.push(`- C-class flares: ${c_class}`)
    }
    
    if (data.solarActivity.summary) {
      sections.push(`\n${data.solarActivity.summary}`)
    }
  }
  
  sections.push('\n## Geomagnetic Activity')
  
  if (data.geomagneticActivity) {
    if (data.geomagneticActivity.kpIndex !== undefined) {
      sections.push(`- Kp Index: ${data.geomagneticActivity.kpIndex}`)
    }
    
    if (data.geomagneticActivity.summary) {
      sections.push(data.geomagneticActivity.summary)
    }
    
    if (data.geomagneticActivity.expectedStorms && data.geomagneticActivity.expectedStorms.length > 0) {
      sections.push('\n### Expected Geomagnetic Storms')
      data.geomagneticActivity.expectedStorms.forEach(storm => {
        sections.push(`- ${storm.level}: ${storm.probability}% probability ${storm.timing ? `(${storm.timing})` : ''}`)
      })
    }
  }
  
  sections.push('\n## Solar Wind Parameters')
  
  if (data.solarWind) {
    if (data.solarWind.speed !== undefined) {
      sections.push(`- Speed: ${data.solarWind.speed} km/s`)
    }
    if (data.solarWind.density !== undefined) {
      sections.push(`- Density: ${data.solarWind.density} p/cc`)
    }
    if (data.solarWind.temperature !== undefined) {
      sections.push(`- Temperature: ${data.solarWind.temperature} K`)
    }
    if (data.solarWind.bz !== undefined) {
      sections.push(`- IMF Bz: ${data.solarWind.bz} nT`)
    }
  }
  
  if (data.protonEvents) {
    sections.push('\n## Proton Events')
    if (data.protonEvents.current !== undefined) {
      sections.push(`- Current proton event: ${data.protonEvents.current ? 'Yes' : 'No'}`)
    }
    if (data.protonEvents.probability !== undefined) {
      sections.push(`- Proton event probability: ${data.protonEvents.probability}%`)
    }
    if (data.protonEvents.summary) {
      sections.push(data.protonEvents.summary)
    }
  }
  
  if (data.forecast) {
    sections.push('\n## Forecast')
    if (data.forecast.next24h) {
      sections.push(`\n### Next 24 Hours`)
      sections.push(data.forecast.next24h)
    }
    if (data.forecast.next48h) {
      sections.push(`\n### Next 48 Hours`)
      sections.push(data.forecast.next48h)
    }
    if (data.forecast.next72h) {
      sections.push(`\n### Next 72 Hours`)
      sections.push(data.forecast.next72h)
    }
  }
  
  sections.push('\n---')
  sections.push('*Data provided by the Solar Influences Data Analysis Center (SIDC), Royal Observatory of Belgium*')
  
  return sections.join('\n')
}

function buildFlareText(flares: any): string {
  if (!flares) return 'No significant flare activity'
  
  const parts = []
  if (flares.x_class > 0) parts.push(`${flares.x_class} X-class`)
  if (flares.m_class > 0) parts.push(`${flares.m_class} M-class`)
  if (flares.c_class > 0) parts.push(`${flares.c_class} C-class`)
  
  if (parts.length > 0) {
    return `Flares in past 24h: ${parts.join(', ')}`
  }
  
  return 'No significant flare activity'
}

export default {
  fetchSidcData,
  normalizeSidcData
}