import { NextResponse } from 'next/server'
import { XrayFluxDataSchema, type XrayFluxData } from '@/lib/widgets/widget-types'

export async function GET() {
  try {
    // Fetch real GOES satellite X-ray data from NOAA
    const [xrayResponse, eventsResponse, solarRegionsResponse] = await Promise.all([
      fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json', {
        signal: AbortSignal.timeout(10000)
      }),
      fetch('https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null), // Don't fail if events unavailable
      fetch('https://services.swpc.noaa.gov/json/solar_regions.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null) // Try to get active region data
    ])
    
    if (!xrayResponse.ok) {
      throw new Error(`NOAA API error: ${xrayResponse.status}`)
    }
    
    let xrayData, eventsData, solarRegions
    try {
      const responseText = await xrayResponse.text()
      try {
        xrayData = JSON.parse(responseText)
      } catch (parseErr) {
        console.error('Failed to parse X-ray data JSON:', parseErr)
        console.error('Response text snippet:', responseText.substring(0, 500))
        throw new Error('Invalid JSON response from X-ray data API')
      }
    } catch (err) {
      console.error('Failed to fetch X-ray data:', err)
      throw new Error('Failed to fetch X-ray data from API')
    }
    
    try {
      eventsData = eventsResponse && eventsResponse.ok ? await eventsResponse.json() : []
    } catch (err) {
      console.warn('Failed to parse events data:', err)
      eventsData = []
    }
    
    try {
      solarRegions = solarRegionsResponse && solarRegionsResponse.ok ? await solarRegionsResponse.json() : []
    } catch (err) {
      console.warn('Failed to parse solar regions data:', err)
      solarRegions = []
    }
    
    // Get the most recent valid measurements
    const validData = xrayData.filter((d: Record<string, unknown>) => 
      d.flux !== null && 
      d.observed_flux !== null &&
      !d.electron_contaminaton && // NOAA API has typo in field name
      !d.electron_contamination // Check both spellings just in case
    )
    
    if (validData.length === 0) {
      throw new Error('No valid X-ray data available')
    }
    
    // Get latest measurements for each wavelength
    const shortWaveData = validData.filter((d: Record<string, unknown>) => d.energy === '0.05-0.4nm')
    const longWaveData = validData.filter((d: Record<string, unknown>) => d.energy === '0.1-0.8nm')
    
    const latestShort = shortWaveData[shortWaveData.length - 1]
    const latestLong = longWaveData[longWaveData.length - 1]
    
    const shortWaveFlux = latestShort ? parseFloat(latestShort.flux) : 1e-8
    const longWaveFlux = latestLong ? parseFloat(latestLong.flux) : 1e-8
    
    const getFlareClassification = (flux: number) => {
      if (flux >= 1e-4) return { class: 'X' as const, magnitude: flux / 1e-4 }
      if (flux >= 1e-5) return { class: 'M' as const, magnitude: flux / 1e-5 }
      if (flux >= 1e-6) return { class: 'C' as const, magnitude: flux / 1e-6 }
      if (flux >= 1e-7) return { class: 'B' as const, magnitude: flux / 1e-7 }
      return { class: 'A' as const, magnitude: flux / 1e-8 }
    }
    
    const shortWave = getFlareClassification(shortWaveFlux)
    const longWave = getFlareClassification(longWaveFlux)
    
    // Calculate background level (minimum over last 100 points)
    const recentLong = longWaveData.slice(-100)
    const backgroundFlux = recentLong.length > 0 
      ? Math.min(...recentLong.map((d: Record<string, unknown>) => parseFloat(String(d.flux))))
      : 1e-8
    const backgroundClass = getFlareClassification(backgroundFlux)
    
    // Process recent flares from events data
    const processFlares = () => {
      if (!Array.isArray(eventsData) || eventsData.length === 0) {
        return []
      }
      
      const now = Date.now()
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
      
      return eventsData
        .filter((flare: any) => {
          const peakTime = new Date(flare.max_time || flare.time_tag)
          return peakTime.getTime() > twentyFourHoursAgo
        })
        .map((flare: any) => {
          const peakTime = new Date(flare.max_time || flare.time_tag)
          
          // Use max_class field which contains the peak flare class
          const flareClass = flare.max_class || 'Unknown'
          
          // Try to get active region or location information
          let location = null
          
          // Check if flare has active_region field
          if (flare.active_region) {
            location = `AR${flare.active_region}`
          } 
          // Check if flare has region field (some NOAA data uses this)
          else if (flare.region) {
            location = `AR${flare.region}`
          }
          // Check if flare has location coordinates
          else if (flare.location) {
            location = flare.location
          }
          // If we have heliographic coordinates
          else if (flare.latitude !== undefined && flare.longitude !== undefined) {
            const lat = flare.latitude > 0 ? 'N' : 'S'
            const lon = flare.longitude > 0 ? 'E' : 'W'
            location = `${lat}${Math.abs(flare.latitude)}${lon}${Math.abs(flare.longitude)}`
          }
          // Try to match with current solar regions
          else if (solarRegions && solarRegions.length > 0) {
            // Get the flare time for matching
            const flareDate = new Date(flare.max_time || flare.time_tag).toISOString().split('T')[0]
            
            // Get regions from the same day
            const todaysRegions = solarRegions.filter((region: any) => {
              return region.region && region.observed_date === flareDate
            })
            
            if (todaysRegions.length > 0) {
              // For recent flares (within last 6 hours), try to be more specific
              const now = Date.now()
              const flareTime = new Date(flare.max_time || flare.time_tag).getTime()
              const isRecent = (now - flareTime) < 6 * 60 * 60 * 1000
              
              // Build a list of candidate regions with scores
              const candidates = todaysRegions.map((region: any) => {
                let score = 0
                
                // Score based on flare class matching
                if (flareClass.startsWith('X') && region.x_xray_events > 0) score += 100
                else if (flareClass.startsWith('M') && region.m_xray_events > 0) score += 50
                else if (flareClass.startsWith('C') && region.c_xray_events > 0) score += 25
                
                // Score based on total activity
                score += (region.x_xray_events || 0) * 20
                score += (region.m_xray_events || 0) * 10
                score += (region.c_xray_events || 0) * 5
                
                // Score based on region size (larger regions more likely to flare)
                if (region.area) {
                  score += Math.min(region.area / 10, 50) // Cap area contribution at 50
                }
                
                // Bonus for regions with magnetic complexity
                if (region.mag_class && region.mag_class !== 'A') {
                  score += 20
                }
                
                return { region, score }
              }).filter((c: { region: any; score: number }) => c.score > 0) // Only keep regions with some activity
              
              if (candidates.length > 0) {
                // Sort by score and pick the best match
                candidates.sort((a: { region: any; score: number }, b: { region: any; score: number }) => b.score - a.score)
                
                // For recent flares, if there's a clear winner (score much higher), use it
                // Otherwise, show multiple possibilities
                if (isRecent && candidates[0].score > (candidates[1]?.score || 0) * 1.5) {
                  const bestMatch = candidates[0].region
                  location = bestMatch.location ? 
                    `${bestMatch.location} (AR${bestMatch.region})` : 
                    `AR${bestMatch.region}`
                } else if (candidates.length === 1) {
                  // Only one active region, likely the source
                  const match = candidates[0].region
                  location = match.location ? 
                    `${match.location} (AR${match.region})` : 
                    `AR${match.region}`
                } else {
                  // Multiple possibilities, show top 2 with uncertainty
                  const top2 = candidates.slice(0, 2).map((c: { region: any; score: number }) => c.region.region)
                  location = `AR${top2.join('/')}?`
                }
              } else {
                // No regions with activity, use largest regions as possibilities
                const largeRegions = todaysRegions
                  .filter((r: any) => r.area && r.area > 50)
                  .sort((a: any, b: any) => (b.area || 0) - (a.area || 0))
                  .slice(0, 2)
                
                if (largeRegions.length > 0) {
                  if (largeRegions.length === 1) {
                    const r = largeRegions[0]
                    location = r.location ? `${r.location}? (AR${r.region})` : `AR${r.region}?`
                  } else {
                    const regions = largeRegions.map((r: any) => r.region).join('/')
                    location = `AR${regions}?`
                  }
                }
              }
            }
          }
          
          // Calculate duration if begin and end times are available
          let duration = null
          if (flare.begin_time && flare.end_time) {
            const start = new Date(flare.begin_time)
            const end = new Date(flare.end_time)
            duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)) // minutes
          }
          
          return {
            time: peakTime,
            peak: flareClass,
            duration: duration || undefined,
            location: location || undefined,
          }
        })
        .filter((f: any) => f.peak && f.peak !== 'Unknown')
        .sort((a: any, b: any) => b.time.getTime() - a.time.getTime())
        .slice(0, 10) // Limit to 10 most recent (matches schema)
    }
    
    const recentFlares = processFlares()
    console.log('Processed', recentFlares.length, 'recent flares')
    
    // Calculate trend based on last 10 data points
    const recentFluxes = longWaveData.slice(-10).map((d: Record<string, unknown>) => parseFloat(String(d.flux)))
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (recentFluxes.length >= 2) {
      const firstHalf = recentFluxes.slice(0, Math.floor(recentFluxes.length / 2))
      const secondHalf = recentFluxes.slice(Math.floor(recentFluxes.length / 2))
      const firstAvg = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length
      
      if (secondAvg > firstAvg * 1.2) trend = 'increasing'
      else if (secondAvg < firstAvg * 0.8) trend = 'decreasing'
    }
    
    const getRiskLevel = (flux: number) => {
      if (flux >= 1e-4) return 'Severe' // X-class
      if (flux >= 5e-5) return 'Strong' // High M-class
      if (flux >= 1e-5) return 'Moderate' // M-class
      if (flux >= 1e-6) return 'Minor' // C-class
      return 'Minimal' // A/B-class
    }
    
    const realData: XrayFluxData = {
      shortWave: {
        current: shortWaveFlux,
        flareClass: shortWave.class,
        magnitude: shortWave.magnitude,
        level: `${shortWave.class}${shortWave.magnitude.toFixed(1)}`,
      },
      longWave: {
        current: longWaveFlux,
        flareClass: longWave.class,
        magnitude: longWave.magnitude,
        level: `${longWave.class}${longWave.magnitude.toFixed(1)}`,
      },
      background: `${backgroundClass.class}${backgroundClass.magnitude.toFixed(1)}`,
      recentFlares: recentFlares,
      trend: trend,
      riskLevel: getRiskLevel(Math.max(shortWaveFlux, longWaveFlux)) as 'Minimal' | 'Minor' | 'Moderate' | 'Strong' | 'Severe',
    }

    // Validate the data structure
    const validatedData = XrayFluxDataSchema.parse(realData)

    return NextResponse.json(validatedData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    })
  } catch (error) {
    console.error('Error fetching X-ray flux data:', error)
    
    // Return minimal fallback data on error
    const fallbackData: XrayFluxData = {
      shortWave: {
        current: 1e-8,
        flareClass: 'A',
        magnitude: 1.0,
        level: 'A1.0',
      },
      longWave: {
        current: 1e-8,
        flareClass: 'A',
        magnitude: 1.0,
        level: 'A1.0',
      },
      background: 'A1.0',
      recentFlares: [],
      trend: 'stable',
      riskLevel: 'Minimal',
    }
    
    return NextResponse.json(fallbackData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  }
}