import { NormalizedReport, SourceTypeEnum } from '../types/space-weather'
import { fetchWithTimeout } from '../http-client'

const BOM_SWS_URL = 'https://www.sws.bom.gov.au/Space_Weather/1/1'
const BOM_API_URL = 'https://sws-data.sws.bom.gov.au/api/v1/get-latest-forecast'

interface BomSpaceWeatherData {
  forecast?: {
    geomagnetic?: {
      summary?: string
      storm_periods?: Array<{
        start_time: string
        end_time: string
        kp_index: number
        storm_level?: string
      }>
    }
    solar?: {
      summary?: string
      flare_probability?: {
        c_class: number
        m_class: number
        x_class: number
      }
    }
    proton?: {
      summary?: string
      event_probability?: number
    }
  }
  current_conditions?: {
    solar_wind?: {
      speed: number
      density: number
      bz: number
    }
    kp_index?: number
    xray_flux?: string
  }
  issued_time?: string
  valid_from?: string
  valid_to?: string
}

export async function fetchBomData(): Promise<BomSpaceWeatherData> {
  try {
    // Try API first
    const apiResponse = await fetchWithTimeout(BOM_API_URL, {
      headers: {
        'Accept': 'application/json',
      }
    })
    
    if (apiResponse.ok) {
      return await apiResponse.json()
    }
  } catch (error) {
    console.warn('BOM API fetch failed, falling back to web scraping:', error)
  }

  // Fallback to web scraping
  const response = await fetchWithTimeout(BOM_SWS_URL, {
    headers: {
      'User-Agent': 'SpaceWeatherMonitor/1.0',
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch BOM data: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()
  return parseBomHtml(html)
}

function parseBomHtml(html: string): BomSpaceWeatherData {
  // Extract current conditions
  const kpMatch = html.match(/Kp\s*index.*?(\d+)/i)
  const solarWindMatch = html.match(/Solar\s*wind\s*speed.*?(\d+)\s*km\/s/i)
  
  // Extract forecast summary
  const forecastMatch = html.match(/Forecast\s*Summary[:\s]*([^<]+)/i)
  const geomagneticMatch = html.match(/Geomagnetic\s*Activity[:\s]*([^<]+)/i)
  
  // Extract flare probabilities
  const cClassMatch = html.match(/C-class.*?(\d+)%/i)
  const mClassMatch = html.match(/M-class.*?(\d+)%/i)
  const xClassMatch = html.match(/X-class.*?(\d+)%/i)

  return {
    forecast: {
      geomagnetic: {
        summary: geomagneticMatch?.[1]?.trim() || 'No geomagnetic forecast available'
      },
      solar: {
        summary: forecastMatch?.[1]?.trim() || 'No solar forecast available',
        flare_probability: {
          c_class: cClassMatch ? parseInt(cClassMatch[1]) : 0,
          m_class: mClassMatch ? parseInt(mClassMatch[1]) : 0,
          x_class: xClassMatch ? parseInt(xClassMatch[1]) : 0
        }
      }
    },
    current_conditions: {
      kp_index: kpMatch ? parseInt(kpMatch[1]) : undefined,
      solar_wind: {
        speed: solarWindMatch ? parseInt(solarWindMatch[1]) : 0,
        density: 0,
        bz: 0
      }
    },
    issued_time: new Date().toISOString()
  }
}

export async function normalizeBomData(): Promise<NormalizedReport> {
  const data = await fetchBomData()
  
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

  // Map flare probabilities to radio blackout risk
  const flareToRLevel = (m: number, x: number): string | undefined => {
    if (x >= 50) return 'R5'
    if (x >= 25) return 'R4'
    if (m >= 50) return 'R3'
    if (m >= 25) return 'R2'
    if (m >= 10) return 'R1'
    return undefined
  }

  const geoLevel = kpToGLevel(data.current_conditions?.kp_index)
  const radioLevel = flareToRLevel(
    data.forecast?.solar?.flare_probability?.m_class || 0,
    data.forecast?.solar?.flare_probability?.x_class || 0
  )

  // Build headline
  const headline = buildHeadline(data, geoLevel, radioLevel)
  
  // Build summary
  const summary = buildSummary(data)
  
  // Build details
  const details = buildDetails(data)

  return {
    source: 'BOM_SWS' as SourceTypeEnum,
    sourceUrl: BOM_SWS_URL,
    issuedAt: data.issued_time ? new Date(data.issued_time) : new Date(),
    fetchedAt: new Date(),
    headline,
    summary,
    details,
    confidence: 'High',
    validStart: data.valid_from ? new Date(data.valid_from) : new Date(),
    validEnd: data.valid_to ? new Date(data.valid_to) : new Date(Date.now() + 72 * 60 * 60 * 1000),
    geomagneticLevel: geoLevel as any,
    geomagneticText: data.forecast?.geomagnetic?.summary,
    radioBlackoutLevel: radioLevel as any,
    radioBlackoutText: `C-class: ${data.forecast?.solar?.flare_probability?.c_class}%, M-class: ${data.forecast?.solar?.flare_probability?.m_class}%, X-class: ${data.forecast?.solar?.flare_probability?.x_class}%`,
    radiationStormLevel: data.forecast?.proton?.event_probability && data.forecast.proton.event_probability > 25 ? 'S1' as any : undefined,
    radiationStormText: data.forecast?.proton?.summary,
    rawPayload: data,
    processingErrors: [],
    qualityScore: 0.85
  }
}

function buildHeadline(data: BomSpaceWeatherData, geoLevel?: string, radioLevel?: string): string {
  const alerts = []
  
  if (geoLevel && geoLevel >= 'G2') {
    alerts.push(`Geomagnetic Storm ${geoLevel} Expected`)
  }
  
  if (radioLevel && radioLevel >= 'R2') {
    alerts.push(`Radio Blackout Risk ${radioLevel}`)
  }
  
  if (data.forecast?.solar?.flare_probability?.x_class && data.forecast.solar.flare_probability.x_class >= 10) {
    alerts.push(`Elevated X-class Flare Risk (${data.forecast.solar.flare_probability.x_class}%)`)
  }
  
  if (alerts.length > 0) {
    return alerts.join(' | ')
  }
  
  return 'Space Weather Conditions Normal to Unsettled'
}

function buildSummary(data: BomSpaceWeatherData): string {
  const parts = []
  
  if (data.current_conditions?.kp_index !== undefined) {
    parts.push(`Current Kp index: ${data.current_conditions.kp_index}`)
  }
  
  if (data.current_conditions?.solar_wind?.speed) {
    parts.push(`Solar wind speed: ${data.current_conditions.solar_wind.speed} km/s`)
  }
  
  if (data.forecast?.solar?.flare_probability) {
    const { c_class, m_class, x_class } = data.forecast.solar.flare_probability
    parts.push(`Flare probabilities - C: ${c_class}%, M: ${m_class}%, X: ${x_class}%`)
  }
  
  if (data.forecast?.geomagnetic?.summary) {
    parts.push(data.forecast.geomagnetic.summary)
  }
  
  return parts.join('. ') || 'No summary available'
}

function buildDetails(data: BomSpaceWeatherData): string {
  const sections = []
  
  sections.push('## Current Space Weather Conditions')
  
  if (data.current_conditions) {
    if (data.current_conditions.kp_index !== undefined) {
      sections.push(`- Planetary K-index: ${data.current_conditions.kp_index}`)
    }
    
    if (data.current_conditions.solar_wind) {
      sections.push(`- Solar Wind Speed: ${data.current_conditions.solar_wind.speed} km/s`)
      if (data.current_conditions.solar_wind.density > 0) {
        sections.push(`- Solar Wind Density: ${data.current_conditions.solar_wind.density} p/cc`)
      }
      if (data.current_conditions.solar_wind.bz !== 0) {
        sections.push(`- IMF Bz: ${data.current_conditions.solar_wind.bz} nT`)
      }
    }
    
    if (data.current_conditions.xray_flux) {
      sections.push(`- X-ray Flux: ${data.current_conditions.xray_flux}`)
    }
  }
  
  sections.push('\n## Forecast')
  
  if (data.forecast?.geomagnetic?.summary) {
    sections.push(`### Geomagnetic Activity`)
    sections.push(data.forecast.geomagnetic.summary)
    
    if (data.forecast.geomagnetic.storm_periods && data.forecast.geomagnetic.storm_periods.length > 0) {
      sections.push('\n**Expected Storm Periods:**')
      data.forecast.geomagnetic.storm_periods.forEach(period => {
        sections.push(`- ${period.start_time} to ${period.end_time}: Kp ${period.kp_index} ${period.storm_level ? `(${period.storm_level})` : ''}`)
      })
    }
  }
  
  if (data.forecast?.solar?.summary) {
    sections.push(`\n### Solar Activity`)
    sections.push(data.forecast.solar.summary)
    
    if (data.forecast.solar.flare_probability) {
      sections.push('\n**Flare Probabilities (24 hours):**')
      sections.push(`- C-class: ${data.forecast.solar.flare_probability.c_class}%`)
      sections.push(`- M-class: ${data.forecast.solar.flare_probability.m_class}%`)
      sections.push(`- X-class: ${data.forecast.solar.flare_probability.x_class}%`)
    }
  }
  
  if (data.forecast?.proton) {
    sections.push(`\n### Proton Event`)
    if (data.forecast.proton.summary) {
      sections.push(data.forecast.proton.summary)
    }
    if (data.forecast.proton.event_probability !== undefined) {
      sections.push(`Proton Event Probability: ${data.forecast.proton.event_probability}%`)
    }
  }
  
  sections.push('\n---')
  sections.push('*Data provided by the Australian Space Weather Forecasting Centre, Bureau of Meteorology*')
  
  return sections.join('\n')
}

export default {
  fetchBomData,
  normalizeBomData
}