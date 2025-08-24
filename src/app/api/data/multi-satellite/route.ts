import { NextResponse } from 'next/server'

const NOAA_BASE_URL = 'https://services.swpc.noaa.gov/json'

export interface MultiSatelliteData {
  satellites: {
    ace: {
      status: 'online' | 'offline' | 'degraded'
      lastUpdate: Date
      solarWind: {
        speed: number | null
        density: number | null
        temperature: number | null
      }
      magneticField: {
        bt: number | null
        bz: number | null
      }
      particles: {
        protons: number | null
        electrons: number | null
      }
      dataQuality: number // 0-100%
    }
    dscovr: {
      status: 'online' | 'offline' | 'degraded'
      lastUpdate: Date
      solarWind: {
        speed: number | null
        density: number | null
        temperature: number | null
      }
      magneticField: {
        bt: number | null
        bz: number | null
        phi: number | null
      }
      dataQuality: number
    }
    goes: {
      primary: {
        satellite: string // e.g., "GOES-16"
        status: 'online' | 'offline' | 'degraded'
        lastUpdate: Date
        xray: {
          shortWave: number | null
          longWave: number | null
        }
        particles: {
          protons: number | null
          electrons: number | null
        }
        magnetometer: number | null
        dataQuality: number
      }
      secondary: {
        satellite: string // e.g., "GOES-18"
        status: 'online' | 'offline' | 'degraded'
        lastUpdate: Date
        xray: {
          shortWave: number | null
          longWave: number | null
        }
        particles: {
          protons: number | null
          electrons: number | null
        }
        magnetometer: number | null
        dataQuality: number
      }
    }
    stereoA: {
      status: 'online' | 'offline' | 'degraded'
      lastUpdate: Date
      position: {
        angle: number // degrees from Earth
        distance: number // AU
      }
      solarWind: {
        speed: number | null
        density: number | null
      }
      dataQuality: number
    }
  }
  consensus: {
    solarWindSpeed: {
      average: number
      stdDev: number
      confidence: number
      trend: 'increasing' | 'decreasing' | 'stable'
    }
    particleFlux: {
      protonAverage: number
      electronAverage: number
      risk: 'low' | 'moderate' | 'high' | 'extreme'
    }
    magneticField: {
      bzAverage: number
      stormPotential: number // 0-100%
    }
    overallDataQuality: number
    primarySource: string // Most reliable source at this moment
  }
}

async function fetchSatelliteData(url: string): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 } // 1 minute cache
    })
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.warn(`Failed to fetch ${url}:`, error)
  }
  return null
}

function calculateDataQuality(data: any, requiredFields: string[]): number {
  if (!data) return 0
  let validFields = 0
  let totalFields = requiredFields.length
  
  requiredFields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], data)
    if (value !== null && value !== undefined && !isNaN(parseFloat(value))) {
      validFields++
    }
  })
  
  return Math.round((validFields / totalFields) * 100)
}

function determineStatus(quality: number, lastUpdate: Date): 'online' | 'offline' | 'degraded' {
  const age = Date.now() - lastUpdate.getTime()
  if (age > 3600000) return 'offline' // Older than 1 hour
  if (quality < 50) return 'degraded'
  return 'online'
}

export async function GET() {
  try {
    // Fetch data from all satellites
    const [
      aceSwepam,
      aceMag,
      aceEpam,
      dscovrMag,
      dscovrPlasma,
      goesPrimaryXray,
      goesPrimaryMag,
      goesPrimaryParticles,
      goesSecondaryXray,
      stereoA
    ] = await Promise.all([
      fetchSatelliteData(`${NOAA_BASE_URL}/ace/swepam/ace_swepam_1h.json`),
      fetchSatelliteData(`${NOAA_BASE_URL}/ace/mag/ace_mag_1h.json`),
      fetchSatelliteData(`${NOAA_BASE_URL}/ace/epam/ace_epam_5m.json`),
      fetchSatelliteData(`${NOAA_BASE_URL}/dscovr/dscovr_mag_1s.json`),
      fetchSatelliteData(`${NOAA_BASE_URL}/dscovr/dscovr_plasma_1s.json`),
      fetchSatelliteData(`${NOAA_BASE_URL}/goes/primary/xrays-1-day.json`),
      fetchSatelliteData(`${NOAA_BASE_URL}/goes/primary/magnetometers-1-day.json`),
      fetchSatelliteData(`${NOAA_BASE_URL}/goes/primary/integral-protons-1-day.json`),
      fetchSatelliteData(`${NOAA_BASE_URL}/goes/secondary/xrays-1-day.json`),
      fetchSatelliteData(`${NOAA_BASE_URL}/stereo/stereo_a_1m.json`)
    ])

    // Process ACE data
    const aceData: MultiSatelliteData['satellites']['ace'] = {
      status: 'offline',
      lastUpdate: new Date(),
      solarWind: {
        speed: null,
        density: null,
        temperature: null
      },
      magneticField: {
        bt: null,
        bz: null
      },
      particles: {
        protons: null,
        electrons: null
      },
      dataQuality: 0
    }

    if (aceSwepam && Array.isArray(aceSwepam) && aceSwepam.length > 0) {
      const latest = aceSwepam[aceSwepam.length - 1]
      aceData.lastUpdate = new Date(latest.time_tag)
      aceData.solarWind.speed = parseFloat(latest.speed) || null
      aceData.solarWind.density = parseFloat(latest.density) || null
      aceData.solarWind.temperature = parseFloat(latest.temperature) || null
    }

    if (aceMag && Array.isArray(aceMag) && aceMag.length > 0) {
      const latest = aceMag[aceMag.length - 1]
      aceData.magneticField.bt = parseFloat(latest.bt) || null
      aceData.magneticField.bz = parseFloat(latest.bz) || null
    }

    if (aceEpam && Array.isArray(aceEpam) && aceEpam.length > 0) {
      const latest = aceEpam[aceEpam.length - 1]
      aceData.particles.protons = parseFloat(latest.p1) || null
      aceData.particles.electrons = parseFloat(latest.e1) || null
    }

    aceData.dataQuality = calculateDataQuality(aceData, [
      'solarWind.speed', 'solarWind.density', 'magneticField.bz'
    ])
    aceData.status = determineStatus(aceData.dataQuality, aceData.lastUpdate)

    // Process DSCOVR data
    const dscovrData: MultiSatelliteData['satellites']['dscovr'] = {
      status: 'offline',
      lastUpdate: new Date(),
      solarWind: {
        speed: null,
        density: null,
        temperature: null
      },
      magneticField: {
        bt: null,
        bz: null,
        phi: null
      },
      dataQuality: 0
    }

    if (dscovrPlasma && Array.isArray(dscovrPlasma) && dscovrPlasma.length > 0) {
      const latest = dscovrPlasma[dscovrPlasma.length - 1]
      dscovrData.lastUpdate = new Date(latest.time_tag)
      dscovrData.solarWind.speed = parseFloat(latest.speed) || null
      dscovrData.solarWind.density = parseFloat(latest.density) || null
      dscovrData.solarWind.temperature = parseFloat(latest.temperature) || null
    }

    if (dscovrMag && Array.isArray(dscovrMag) && dscovrMag.length > 0) {
      const latest = dscovrMag[dscovrMag.length - 1]
      dscovrData.magneticField.bt = parseFloat(latest.bt) || null
      dscovrData.magneticField.bz = parseFloat(latest.bz_gsm) || null
      dscovrData.magneticField.phi = parseFloat(latest.phi_gsm) || null
    }

    dscovrData.dataQuality = calculateDataQuality(dscovrData, [
      'solarWind.speed', 'solarWind.density', 'magneticField.bz'
    ])
    dscovrData.status = determineStatus(dscovrData.dataQuality, dscovrData.lastUpdate)

    // Process GOES Primary data
    const goesPrimary: MultiSatelliteData['satellites']['goes']['primary'] = {
      satellite: 'GOES-16',
      status: 'offline',
      lastUpdate: new Date(),
      xray: {
        shortWave: null,
        longWave: null
      },
      particles: {
        protons: null,
        electrons: null
      },
      magnetometer: null,
      dataQuality: 0
    }

    if (goesPrimaryXray && Array.isArray(goesPrimaryXray) && goesPrimaryXray.length > 0) {
      const latest = goesPrimaryXray[goesPrimaryXray.length - 1]
      goesPrimary.lastUpdate = new Date(latest.time_tag)
      goesPrimary.satellite = `GOES-${latest.satellite || '16'}`
      
      // Find short and long wavelength data
      const shortWave = goesPrimaryXray.find(d => d.energy === '0.05-0.4nm')
      const longWave = goesPrimaryXray.find(d => d.energy === '0.1-0.8nm')
      
      if (shortWave) goesPrimary.xray.shortWave = parseFloat(shortWave.flux) || null
      if (longWave) goesPrimary.xray.longWave = parseFloat(longWave.flux) || null
    }

    if (goesPrimaryMag && Array.isArray(goesPrimaryMag) && goesPrimaryMag.length > 0) {
      const latest = goesPrimaryMag[goesPrimaryMag.length - 1]
      goesPrimary.magnetometer = parseFloat(latest.He) || null
    }

    if (goesPrimaryParticles && Array.isArray(goesPrimaryParticles) && goesPrimaryParticles.length > 0) {
      const latest = goesPrimaryParticles[goesPrimaryParticles.length - 1]
      goesPrimary.particles.protons = parseFloat(latest.flux) || null
    }

    goesPrimary.dataQuality = calculateDataQuality(goesPrimary, [
      'xray.longWave', 'particles.protons', 'magnetometer'
    ])
    goesPrimary.status = determineStatus(goesPrimary.dataQuality, goesPrimary.lastUpdate)

    // Process GOES Secondary (simplified)
    const goesSecondary: MultiSatelliteData['satellites']['goes']['secondary'] = {
      satellite: 'GOES-18',
      status: 'offline',
      lastUpdate: new Date(),
      xray: {
        shortWave: null,
        longWave: null
      },
      particles: {
        protons: null,
        electrons: null
      },
      magnetometer: null,
      dataQuality: 0
    }

    if (goesSecondaryXray && Array.isArray(goesSecondaryXray) && goesSecondaryXray.length > 0) {
      const latest = goesSecondaryXray[goesSecondaryXray.length - 1]
      goesSecondary.lastUpdate = new Date(latest.time_tag)
      goesSecondary.satellite = `GOES-${latest.satellite || '18'}`
      goesSecondary.xray.longWave = parseFloat(latest.flux) || null
      goesSecondary.dataQuality = 50 // Partial data
      goesSecondary.status = 'degraded'
    }

    // Process STEREO-A data
    const stereoAData: MultiSatelliteData['satellites']['stereoA'] = {
      status: 'offline',
      lastUpdate: new Date(),
      position: {
        angle: 45, // Approximate angle from Earth
        distance: 1.0 // AU
      },
      solarWind: {
        speed: null,
        density: null
      },
      dataQuality: 0
    }

    if (stereoA && Array.isArray(stereoA) && stereoA.length > 0) {
      const latest = stereoA[stereoA.length - 1]
      stereoAData.lastUpdate = new Date(latest.time_tag)
      stereoAData.solarWind.speed = parseFloat(latest.speed) || null
      stereoAData.solarWind.density = parseFloat(latest.density) || null
      stereoAData.dataQuality = calculateDataQuality(stereoAData, [
        'solarWind.speed', 'solarWind.density'
      ])
      stereoAData.status = determineStatus(stereoAData.dataQuality, stereoAData.lastUpdate)
    }

    // Calculate consensus values
    const validSpeeds = [
      aceData.solarWind.speed,
      dscovrData.solarWind.speed,
      stereoAData.solarWind.speed
    ].filter(s => s !== null) as number[]

    const speedAverage = validSpeeds.length > 0
      ? validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length
      : 400

    const speedStdDev = validSpeeds.length > 1
      ? Math.sqrt(validSpeeds.reduce((sum, s) => sum + Math.pow(s - speedAverage, 2), 0) / validSpeeds.length)
      : 0

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (validSpeeds.length >= 2) {
      const recent = validSpeeds[validSpeeds.length - 1]
      const previous = validSpeeds[validSpeeds.length - 2]
      if (recent > previous + 20) trend = 'increasing'
      else if (recent < previous - 20) trend = 'decreasing'
    }

    // Calculate particle risk
    const protonFluxes = [
      aceData.particles.protons,
      goesPrimary.particles.protons
    ].filter(p => p !== null) as number[]

    const protonAverage = protonFluxes.length > 0
      ? protonFluxes.reduce((a, b) => a + b, 0) / protonFluxes.length
      : 0.1

    let risk: 'low' | 'moderate' | 'high' | 'extreme' = 'low'
    if (protonAverage >= 1e4) risk = 'extreme'
    else if (protonAverage >= 1e3) risk = 'high'
    else if (protonAverage >= 1e2) risk = 'moderate'

    // Calculate magnetic field consensus
    const bzValues = [
      aceData.magneticField.bz,
      dscovrData.magneticField.bz
    ].filter(b => b !== null) as number[]

    const bzAverage = bzValues.length > 0
      ? bzValues.reduce((a, b) => a + b, 0) / bzValues.length
      : 0

    const stormPotential = bzAverage < -10 ? 80 : bzAverage < -5 ? 50 : bzAverage < 0 ? 20 : 5

    // Determine primary source (highest quality online satellite)
    const satellites = [
      { name: 'DSCOVR', quality: dscovrData.dataQuality, status: dscovrData.status },
      { name: 'ACE', quality: aceData.dataQuality, status: aceData.status },
      { name: 'GOES-Primary', quality: goesPrimary.dataQuality, status: goesPrimary.status },
      { name: 'STEREO-A', quality: stereoAData.dataQuality, status: stereoAData.status }
    ]

    const primarySource = satellites
      .filter(s => s.status === 'online')
      .sort((a, b) => b.quality - a.quality)[0]?.name || 'None'

    // Calculate overall data quality
    const allQualities = [
      aceData.dataQuality,
      dscovrData.dataQuality,
      goesPrimary.dataQuality,
      goesSecondary.dataQuality,
      stereoAData.dataQuality
    ]

    const overallDataQuality = Math.round(
      allQualities.reduce((a, b) => a + b, 0) / allQualities.length
    )

    const responseData: MultiSatelliteData = {
      satellites: {
        ace: aceData,
        dscovr: dscovrData,
        goes: {
          primary: goesPrimary,
          secondary: goesSecondary
        },
        stereoA: stereoAData
      },
      consensus: {
        solarWindSpeed: {
          average: Math.round(speedAverage),
          stdDev: Math.round(speedStdDev),
          confidence: Math.min(95, validSpeeds.length * 30),
          trend
        },
        particleFlux: {
          protonAverage: protonAverage,
          electronAverage: aceData.particles.electrons || 0,
          risk
        },
        magneticField: {
          bzAverage: Math.round(bzAverage * 10) / 10,
          stormPotential
        },
        overallDataQuality,
        primarySource
      }
    }

    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    })

  } catch (error) {
    console.error('Error fetching multi-satellite data:', error)
    
    // Return fallback data
    const fallbackData: MultiSatelliteData = {
      satellites: {
        ace: {
          status: 'offline',
          lastUpdate: new Date(),
          solarWind: { speed: null, density: null, temperature: null },
          magneticField: { bt: null, bz: null },
          particles: { protons: null, electrons: null },
          dataQuality: 0
        },
        dscovr: {
          status: 'offline',
          lastUpdate: new Date(),
          solarWind: { speed: null, density: null, temperature: null },
          magneticField: { bt: null, bz: null, phi: null },
          dataQuality: 0
        },
        goes: {
          primary: {
            satellite: 'GOES-16',
            status: 'offline',
            lastUpdate: new Date(),
            xray: { shortWave: null, longWave: null },
            particles: { protons: null, electrons: null },
            magnetometer: null,
            dataQuality: 0
          },
          secondary: {
            satellite: 'GOES-18',
            status: 'offline',
            lastUpdate: new Date(),
            xray: { shortWave: null, longWave: null },
            particles: { protons: null, electrons: null },
            magnetometer: null,
            dataQuality: 0
          }
        },
        stereoA: {
          status: 'offline',
          lastUpdate: new Date(),
          position: { angle: 0, distance: 1 },
          solarWind: { speed: null, density: null },
          dataQuality: 0
        }
      },
      consensus: {
        solarWindSpeed: {
          average: 400,
          stdDev: 0,
          confidence: 0,
          trend: 'stable'
        },
        particleFlux: {
          protonAverage: 0.1,
          electronAverage: 0,
          risk: 'low'
        },
        magneticField: {
          bzAverage: 0,
          stormPotential: 5
        },
        overallDataQuality: 0,
        primarySource: 'None'
      }
    }
    
    return NextResponse.json(fallbackData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  }
}