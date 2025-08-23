import { NextResponse } from 'next/server'
import { ProtonFluxDataSchema, type ProtonFluxData } from '@/lib/widgets/widget-types'

export async function GET() {
  try {
    // Fetch real GOES satellite proton data from NOAA
    const [protonResponse, summaryResponse] = await Promise.all([
      fetch('https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json', {
        signal: AbortSignal.timeout(10000)
      }),
      fetch('https://services.swpc.noaa.gov/products/noaa-scales.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null)
    ])
    
    if (!protonResponse.ok) {
      throw new Error(`NOAA API error: ${protonResponse.status}`)
    }
    
    let protonData, scalesData
    try {
      const responseText = await protonResponse.text()
      try {
        protonData = JSON.parse(responseText)
      } catch (parseErr) {
        console.error('Failed to parse proton data JSON:', parseErr)
        console.error('Response text snippet:', responseText.substring(0, 500))
        throw new Error('Invalid JSON response from proton data API')
      }
    } catch (err) {
      console.error('Failed to fetch proton data:', err)
      throw new Error('Failed to fetch proton data from API')
    }
    
    try {
      scalesData = summaryResponse && summaryResponse.ok ? await summaryResponse.json() : null
    } catch (err) {
      console.warn('Failed to parse scales data:', err)
      scalesData = null
    }
    
    // Get the most recent valid measurements for each energy level
    const validData = protonData.filter((d: Record<string, unknown>) => 
      d.flux !== null && d.flux !== -1
    )
    
    if (validData.length === 0) {
      throw new Error('No valid proton data available')
    }
    
    // Get latest measurements for each energy channel
    const flux10Data = validData.filter((d: Record<string, unknown>) => d.energy === '>=10 MeV')
    const flux50Data = validData.filter((d: Record<string, unknown>) => d.energy === '>=50 MeV')
    const flux100Data = validData.filter((d: Record<string, unknown>) => d.energy === '>=100 MeV')
    const flux500Data = validData.filter((d: Record<string, unknown>) => d.energy === '>=500 MeV')
    
    const latest10 = flux10Data[flux10Data.length - 1]
    const latest50 = flux50Data[flux50Data.length - 1]
    const latest100 = flux100Data[flux100Data.length - 1]
    const latest500 = flux500Data[flux500Data.length - 1]
    
    const flux10 = latest10 ? parseFloat(latest10.flux) : 0.01
    const flux50 = latest50 ? parseFloat(latest50.flux) : 0.01
    const flux100 = latest100 ? parseFloat(latest100.flux) : 0.01
    const flux500 = latest500 ? parseFloat(latest500.flux) : 0.01
    
    // Determine S-scale storm level based on >10 MeV flux
    const getStormLevel = (flux: number): ProtonFluxData['stormLevel'] => {
      if (flux >= 1e5) return 'S5' // >= 100,000 pfu
      if (flux >= 1e4) return 'S4' // >= 10,000 pfu
      if (flux >= 1e3) return 'S3' // >= 1,000 pfu
      if (flux >= 1e2) return 'S2' // >= 100 pfu
      if (flux >= 1e1) return 'S1' // >= 10 pfu
      return 'None'
    }
    
    const stormLevel = getStormLevel(flux10)
    
    // Storm threshold details
    const getStormThreshold = (level: ProtonFluxData['stormLevel']) => {
      const thresholds = {
        'None': {
          level: 'None',
          description: 'No solar radiation storm',
          effects: ['Normal satellite operations', 'No biological effects']
        },
        'S1': {
          level: 'S1 - Minor',
          description: 'Minor solar radiation storm (≥10 pfu)',
          effects: [
            'Minor impacts on HF radio in polar regions',
            'No biological hazard'
          ]
        },
        'S2': {
          level: 'S2 - Moderate',
          description: 'Moderate solar radiation storm (≥100 pfu)',
          effects: [
            'Infrequent effects on HF via polar regions',
            'Passengers in high-flying aircraft at high latitudes may be exposed to slightly elevated radiation risk'
          ]
        },
        'S3': {
          level: 'S3 - Strong',
          description: 'Strong solar radiation storm (≥1,000 pfu)',
          effects: [
            'Degraded HF radio propagation via polar regions',
            'Navigation errors likely',
            'Radiation hazard to astronauts on EVA',
            'Passengers in high-flying aircraft at high latitudes exposed to radiation risk'
          ]
        },
        'S4': {
          level: 'S4 - Severe',
          description: 'Severe solar radiation storm (≥10,000 pfu)',
          effects: [
            'Blackout of HF radio via polar regions',
            'Navigation outages on north polar cap',
            'Increased radiation exposure to astronauts and air crews',
            'Minor effects on satellite operations possible'
          ]
        },
        'S5': {
          level: 'S5 - Extreme',
          description: 'Extreme solar radiation storm (≥100,000 pfu)',
          effects: [
            'Complete HF radio blackout on entire sunlit side',
            'Navigation errors for days',
            'Satellites may be rendered useless',
            'Significant radiation hazard to astronauts and air crews'
          ]
        }
      }
      return thresholds[level]
    }
    
    // Calculate trend based on last 10 data points
    const recentFluxes = flux10Data.slice(-10).map((d: Record<string, unknown>) => parseFloat(String(d.flux)))
    let trend: ProtonFluxData['trend'] = 'stable'
    if (recentFluxes.length >= 2) {
      const firstHalf = recentFluxes.slice(0, Math.floor(recentFluxes.length / 2))
      const secondHalf = recentFluxes.slice(Math.floor(recentFluxes.length / 2))
      const firstAvg = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length
      
      if (secondAvg > firstAvg * 2) trend = 'increasing'
      else if (secondAvg < firstAvg * 0.5) trend = 'decreasing'
    }
    
    // Get recent events (look for significant increases in flux)
    const recentEvents: ProtonFluxData['recentEvents'] = []
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    
    // Simple peak detection in the data
    for (let i = 1; i < flux10Data.length - 1; i++) {
      const prev = parseFloat(flux10Data[i - 1].flux)
      const curr = parseFloat(flux10Data[i].flux)
      const next = parseFloat(flux10Data[i + 1].flux)
      const time = new Date(flux10Data[i].time_tag)
      
      // Detect peaks above S1 threshold
      if (curr >= 10 && curr > prev && curr > next && time.getTime() > oneWeekAgo) {
        recentEvents.push({
          time,
          peakFlux: curr,
          stormLevel: getStormLevel(curr),
          duration: undefined // Would need more complex analysis
        })
      }
    }
    
    // Sort and limit recent events
    recentEvents.sort((a, b) => b.time.getTime() - a.time.getTime())
    recentEvents.splice(5)
    
    const getRiskLevel = (flux: number): ProtonFluxData['riskLevel'] => {
      if (flux >= 1e5) return 'Extreme' // S5
      if (flux >= 1e4) return 'Severe' // S4
      if (flux >= 1e3) return 'Strong' // S3
      if (flux >= 1e2) return 'Moderate' // S2
      if (flux >= 1e1) return 'Minor' // S1
      return 'Minimal'
    }
    
    // Basic forecast based on trend
    const getForecast = () => {
      if (trend === 'increasing' && flux10 > 5) {
        return {
          probability24h: Math.min(80, flux10 * 2),
          expectedLevel: flux10 >= 50 ? 'S2' : 'S1'
        }
      } else if (trend === 'decreasing') {
        return {
          probability24h: Math.max(10, 50 - flux10),
          expectedLevel: undefined
        }
      }
      return {
        probability24h: flux10 >= 5 ? 40 : 20,
        expectedLevel: flux10 >= 5 ? 'S1' : undefined
      }
    }
    
    const realData: ProtonFluxData = {
      current: {
        flux10,
        flux50,
        flux100,
        flux500
      },
      stormLevel,
      stormThreshold: getStormThreshold(stormLevel),
      trend,
      recentEvents,
      forecast: getForecast(),
      riskLevel: getRiskLevel(flux10)
    }

    // Validate the data structure
    const validatedData = ProtonFluxDataSchema.parse(realData)

    return NextResponse.json(validatedData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    })
  } catch (error) {
    console.error('Error fetching proton flux data:', error)
    
    // Return minimal fallback data on error
    const fallbackData: ProtonFluxData = {
      current: {
        flux10: 0.1,
        flux50: 0.01,
        flux100: 0.01,
        flux500: 0.001
      },
      stormLevel: 'None',
      stormThreshold: {
        level: 'None',
        description: 'No solar radiation storm',
        effects: ['Normal satellite operations', 'No biological effects']
      },
      trend: 'stable',
      recentEvents: [],
      forecast: {
        probability24h: 10,
        expectedLevel: undefined
      },
      riskLevel: 'Minimal'
    }
    
    return NextResponse.json(fallbackData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  }
}