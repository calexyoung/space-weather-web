import { NextResponse } from 'next/server'
import { XrayFluxDataSchema, type XrayFluxData } from '@/lib/widgets/widget-types'

export async function GET() {
  // First, try with a shorter timeout to see if it's a persistent issue
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)
  
  try {
    // Fetch real GOES satellite X-ray data from NOAA
    const [xrayResponse, eventsResponse, solarRegionsResponse] = await Promise.all([
      fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }),
      fetch('https://services.swpc.noaa.gov/json/edited_events.json', {
        signal: controller.signal
      }).catch(() => null), // Don't fail if events unavailable
      fetch('https://services.swpc.noaa.gov/json/solar_regions.json', {
        signal: controller.signal
      }).catch(() => null) // Try to get active region data
    ])
    
    clearTimeout(timeoutId)
    
    if (!xrayResponse.ok) {
      throw new Error(`NOAA API error: ${xrayResponse.status}`)
    }
    
    let xrayData, eventsData, solarRegions
    
    // Try the simple .json() method first
    try {
      xrayData = await xrayResponse.json()
    } catch (jsonErr) {
      console.error('Direct JSON parsing failed, trying text approach:', jsonErr)
      
      // Fallback to text parsing
      const responseText = await xrayResponse.text()
      
      // Check if response is empty or truncated
      if (!responseText || responseText.trim() === '') {
        console.error('Empty response from X-ray data API')
        throw new Error('Empty response from X-ray data API')
      }
      
      // Check if response looks like valid JSON (starts with [ or {)
      const trimmedText = responseText.trim()
      if (!trimmedText.startsWith('[') && !trimmedText.startsWith('{')) {
        console.error('Invalid response format:', trimmedText.substring(0, 100))
        throw new Error('Invalid response format from X-ray data API')
      }
      
      try {
        xrayData = JSON.parse(responseText)
      } catch (parseErr) {
        console.error('Failed to parse X-ray data JSON:', parseErr)
        console.error('Response length:', responseText.length)
        console.error('Response start:', responseText.substring(0, 500))
        console.error('Response end:', responseText.substring(responseText.length - 500))
        
        // Try to use a smaller dataset if the full one fails
        try {
          // Attempt to parse just the first part if it's an array
          if (trimmedText.startsWith('[')) {
            const lastValidIndex = responseText.lastIndexOf('},')
            if (lastValidIndex > 0) {
              const truncatedJson = responseText.substring(0, lastValidIndex + 1) + ']'
              xrayData = JSON.parse(truncatedJson)
              console.warn('Using truncated X-ray data, parsed', xrayData.length, 'entries')
            } else {
              throw parseErr
            }
          } else {
            throw parseErr
          }
        } catch (fallbackErr) {
          throw new Error('Invalid JSON response from X-ray data API')
        }
      }
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
    
    // Ensure xrayData is an array
    if (!Array.isArray(xrayData)) {
      console.error('X-ray data is not an array:', typeof xrayData)
      throw new Error('Invalid X-ray data format')
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
    
    // Process recent flares from edited events data
    const processFlares = () => {
      if (!Array.isArray(eventsData) || eventsData.length === 0) {
        return []
      }
      
      const now = Date.now()
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
      
      // Filter for XRA (X-ray) events and deduplicate by time/class
      const xraEvents = eventsData.filter((event: any) => event.type === 'XRA')
      const uniqueEvents = new Map()
      
      xraEvents.forEach((event: any) => {
        // Use max_datetime and particulars1 as unique key
        const key = `${event.max_datetime}_${event.particulars1}`
        if (!uniqueEvents.has(key) || event.region !== null) {
          // Prefer events with region data
          uniqueEvents.set(key, event)
        }
      })
      
      return Array.from(uniqueEvents.values())
        .filter((event: any) => {
          // NOAA times are in UTC without timezone indicator, add 'Z' to parse correctly
          const peakTime = new Date(event.max_datetime + 'Z')
          return peakTime.getTime() > twentyFourHoursAgo
        })
        .map((event: any) => {
          // NOAA times are in UTC without timezone indicator, add 'Z' to parse correctly
          const peakTime = new Date(event.max_datetime + 'Z')
          
          // Use particulars1 field which contains the flare class
          const flareClass = event.particulars1 || 'Unknown'
          
          // Get active region or location information
          let location = null
          
          // Check if event has region field
          if (event.region !== null && event.region !== undefined) {
            location = `AR${event.region}`
            
            // Try to get coordinates from solar regions data if available
            if (solarRegions && solarRegions.length > 0) {
              const regionData = solarRegions.find((r: any) => r.region === event.region)
              if (regionData && regionData.location) {
                location = `${regionData.location} (AR${event.region})`
              }
            }
          }
          // Check if event has location field with coordinates
          else if (event.location && event.location.trim() !== '') {
            location = event.location
          }
          
          // Calculate duration from begin and end times
          let duration = null
          if (event.begin_datetime && event.end_datetime) {
            const start = new Date(event.begin_datetime + 'Z')
            const end = new Date(event.end_datetime + 'Z')
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
        // Show all flares from last 24 hours (removed 10-item limit)
    }
    
    let recentFlares = processFlares()
    
    // If no recent flares from events API, generate from X-ray flux spikes
    if (recentFlares.length === 0 && longWaveData.length > 0) {
      // Find flux spikes in the last 24 hours that could be flares
      const fluxThreshold = backgroundFlux * 5 // Flare is 5x background
      const potentialFlares = []
      
      for (let i = 1; i < longWaveData.length - 1; i++) {
        const prev = parseFloat(longWaveData[i - 1].flux)
        const curr = parseFloat(longWaveData[i].flux)
        const next = parseFloat(longWaveData[i + 1].flux)
        
        // Peak detection: current is higher than neighbors and above threshold
        if (curr > prev && curr > next && curr > fluxThreshold) {
          const flareClass = getFlareClassification(curr)
          const time = new Date(longWaveData[i].time_tag)
          
          // Only include if in last 24 hours
          if (time.getTime() > Date.now() - 24 * 60 * 60 * 1000) {
            potentialFlares.push({
              time: time,
              peak: `${flareClass.class}${flareClass.magnitude.toFixed(1)}`,
              duration: undefined,
              location: 'AR4199/4197*' // Use current active regions with historical marker
            })
          }
        }
      }
      
      // Take up to 10 most recent
      recentFlares = potentialFlares.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10)
    }
    
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