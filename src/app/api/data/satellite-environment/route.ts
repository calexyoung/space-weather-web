import { NextResponse } from 'next/server'
import { SatelliteEnvironmentSchema, type SatelliteEnvironment } from '@/lib/widgets/widget-types'

// Helper function to calculate risk level based on particle flux
function calculateParticleRisk(electronFlux: number, protonFlux: number): 'None' | 'Minor' | 'Moderate' | 'Strong' | 'Severe' | 'Extreme' {
  // Electron flux thresholds (particles/cm²/s/sr)
  // Based on GOES alert thresholds
  const electronRisk = 
    electronFlux < 1e3 ? 'None' :
    electronFlux < 1e4 ? 'Minor' :
    electronFlux < 1e5 ? 'Moderate' :
    electronFlux < 1e6 ? 'Strong' :
    electronFlux < 1e7 ? 'Severe' : 'Extreme'
  
  // Proton flux thresholds (particles/cm²/s/sr)
  // Based on NOAA S-scale storm levels
  const protonRisk = 
    protonFlux < 10 ? 'None' :       // Below S1
    protonFlux < 100 ? 'Minor' :      // S1
    protonFlux < 1000 ? 'Moderate' :  // S2
    protonFlux < 10000 ? 'Strong' :   // S3
    protonFlux < 100000 ? 'Severe' : 'Extreme' // S4-S5
  
  // Return the higher of the two risks
  const riskLevels = ['None', 'Minor', 'Moderate', 'Strong', 'Severe', 'Extreme']
  const electronIndex = riskLevels.indexOf(electronRisk)
  const protonIndex = riskLevels.indexOf(protonRisk)
  return riskLevels[Math.max(electronIndex, protonIndex)] as 'None' | 'Minor' | 'Moderate' | 'Strong' | 'Severe' | 'Extreme'
}

// Helper function to convert Kp to geomagnetic risk level
function kpToGeomagneticRisk(kp: number): 'None' | 'Minor' | 'Moderate' | 'Strong' | 'Severe' | 'Extreme' {
  if (kp < 4) return 'None'       // Below G0
  if (kp === 4) return 'None'     // G0
  if (kp === 5) return 'Minor'    // G1
  if (kp === 6) return 'Moderate' // G2
  if (kp === 7) return 'Strong'   // G3
  if (kp === 8) return 'Severe'   // G4
  return 'Extreme'                 // G5
}

// Helper function to assess radio blackout risk from X-ray flux
function xrayToRadioRisk(xrayFlux: number): 'None' | 'Minor' | 'Moderate' | 'Strong' | 'Severe' | 'Extreme' {
  // X-ray flux in W/m² (GOES long wavelength)
  if (xrayFlux < 1e-6) return 'None'      // Below R1 (M1.0)
  if (xrayFlux < 5e-6) return 'Minor'     // R1 (M1-M5)
  if (xrayFlux < 1e-5) return 'Moderate'  // R2 (M5-X1)
  if (xrayFlux < 1e-4) return 'Strong'    // R3 (X1-X10)
  if (xrayFlux < 2e-4) return 'Severe'    // R4 (X10-X20)
  return 'Extreme'                        // R5 (>X20)
}

// Helper function to identify hazards based on conditions
function identifyHazards(
  electronFlux: number,
  protonFlux: number,
  magneticField: number,
  kpIndex: number,
  density: number
): Array<{
  type: 'Surface_Charging' | 'Deep_Dielectric_Charging' | 'Single_Event_Upset' | 'Atmospheric_Drag' | 'Navigation_Error'
  severity: 'Low' | 'Moderate' | 'High' | 'Critical'
  duration: string
  description: string
}> {
  const hazards = []
  
  // Surface charging hazard from electrons
  if (electronFlux > 1e5) {
    hazards.push({
      type: 'Surface_Charging' as const,
      severity: electronFlux > 1e6 ? 'Critical' as const : 
                electronFlux > 5e5 ? 'High' as const : 'Moderate' as const,
      duration: '6-12 hours',
      description: `Elevated electron flux (${electronFlux.toExponential(1)} e/cm²/s/sr) may cause spacecraft surface charging.`
    })
  }
  
  // Deep dielectric charging from high energy electrons
  if (electronFlux > 5e4) {
    hazards.push({
      type: 'Deep_Dielectric_Charging' as const,
      severity: electronFlux > 1e6 ? 'High' as const : 'Moderate' as const,
      duration: '24-48 hours',
      description: 'High energy electrons penetrating spacecraft shielding may cause internal charging.'
    })
  }
  
  // Single Event Upsets from protons
  if (protonFlux > 10) {
    hazards.push({
      type: 'Single_Event_Upset' as const,
      severity: protonFlux > 1000 ? 'Critical' as const :
                protonFlux > 100 ? 'High' as const : 'Moderate' as const,
      duration: '2-8 hours',
      description: `Solar energetic particles (${protonFlux.toFixed(0)} pfu) increase risk of memory bit flips and latch-ups.`
    })
  }
  
  // Atmospheric drag from geomagnetic storms
  if (kpIndex >= 5 || density > 5e-12) {
    hazards.push({
      type: 'Atmospheric_Drag' as const,
      severity: kpIndex >= 7 ? 'High' as const :
                kpIndex >= 6 ? 'Moderate' as const : 'Low' as const,
      duration: '12-24 hours',
      description: `Geomagnetic activity (Kp=${kpIndex}) causing atmospheric expansion and increased satellite drag.`
    })
  }
  
  // Navigation errors from geomagnetic disturbances
  if (kpIndex >= 5 || Math.abs(magneticField) > 20) {
    hazards.push({
      type: 'Navigation_Error' as const,
      severity: kpIndex >= 7 ? 'High' as const : 
                kpIndex >= 6 ? 'Moderate' as const : 'Low' as const,
      duration: '4-12 hours',
      description: 'Ionospheric disturbances affecting GNSS signal propagation and positioning accuracy.'
    })
  }
  
  // Add baseline minimal hazard if no others identified
  if (hazards.length === 0) {
    hazards.push({
      type: 'Surface_Charging' as const,
      severity: 'Low' as const,
      duration: '1-3 hours',
      description: 'Normal background space weather conditions. Minimal operational impacts expected.'
    })
  }
  
  return hazards
}

export async function GET() {
  try {
    // Fetch multiple data sources in parallel
    const [
      electronsResponse,
      protonsResponse,
      magnetometerResponse,
      kpIndexResponse,
      xrayResponse,
      aceResponse
    ] = await Promise.all([
      // GOES primary satellite data
      fetch('https://services.swpc.noaa.gov/json/goes/primary/differential-electrons-1-day.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null),
      fetch('https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null),
      fetch('https://services.swpc.noaa.gov/json/goes/primary/magnetometers-1-day.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null),
      // Planetary K-index for geomagnetic conditions
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null),
      // X-ray flux for radio blackouts
      fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null),
      // ACE satellite for validation
      fetch('https://services.swpc.noaa.gov/json/ace/epam/ace_epam_5m.json', {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null)
    ])
    
    // Parse all responses with fallbacks
    const electronsData = electronsResponse ? await electronsResponse.json().catch(() => []) : []
    const protonsData = protonsResponse ? await protonsResponse.json().catch(() => []) : []
    const magnetometerData = magnetometerResponse ? await magnetometerResponse.json().catch(() => []) : []
    const kpData = kpIndexResponse ? await kpIndexResponse.json().catch(() => []) : []
    const xrayData = xrayResponse ? await xrayResponse.json().catch(() => []) : []
    const aceData = aceResponse ? await aceResponse.json().catch(() => []) : []
    
    // Process electron flux (use latest value)
    let electronFlux = 1e3 // Default safe value
    if (electronsData && electronsData.length > 0) {
      // Sum all energy channels for total flux
      const latestElectron = electronsData[electronsData.length - 1]
      electronFlux = 0
      // GOES has multiple energy channels
      if (latestElectron.e38 !== null && latestElectron.e38 !== -9999 && !isNaN(latestElectron.e38)) {
        electronFlux += latestElectron.e38
      }
      if (latestElectron.e175 !== null && latestElectron.e175 !== -9999 && !isNaN(latestElectron.e175)) {
        electronFlux += latestElectron.e175
      }
      if (electronFlux === 0 || isNaN(electronFlux)) electronFlux = 1e3 // Fallback if no valid data
    }
    
    // Process proton flux (>10 MeV)
    let protonFlux = 0.1 // Default safe value
    let neutronFlux = 10  // Estimated from proton flux
    if (protonsData && protonsData.length > 0) {
      const latestProton = protonsData[protonsData.length - 1]
      // Use >=10 MeV channel for SEP events
      if (latestProton.flux && latestProton.flux !== -9999 && !isNaN(latestProton.flux)) {
        protonFlux = latestProton.flux
      } else if (latestProton.p10 && latestProton.p10 !== -9999 && !isNaN(latestProton.p10)) {
        protonFlux = latestProton.p10
      }
      // Estimate neutron flux as ~1% of proton flux
      neutronFlux = protonFlux * 0.01
      if (isNaN(protonFlux)) protonFlux = 0.1
      if (isNaN(neutronFlux)) neutronFlux = 10
    }
    
    // Process magnetometer data
    let magneticFieldBz = 0
    if (magnetometerData && magnetometerData.length > 0) {
      const latestMag = magnetometerData[magnetometerData.length - 1]
      // Get Bz component (most important for geomagnetic activity)
      if (latestMag.Bz !== null && latestMag.Bz !== -9999) {
        magneticFieldBz = latestMag.Bz
      } else if (latestMag.bt !== null && latestMag.bt !== -9999) {
        // Use total field if Bz not available
        magneticFieldBz = latestMag.bt * 0.5 // Rough estimate
      }
    }
    
    // Get current Kp index
    let currentKp = 2 // Default quiet conditions
    if (kpData && kpData.length > 1) {
      const validKp = kpData.slice(1).filter((row: unknown[]) => 
        row && row.length >= 2 && row[1] !== null && row[1] !== ''
      )
      if (validKp.length > 0) {
        currentKp = parseFloat(validKp[validKp.length - 1][1]) || 2
      }
    }
    
    // Get X-ray flux for radio blackout assessment
    let xrayFlux = 1e-8 // Default A-class level
    if (xrayData && xrayData.length > 0) {
      const latestXray = xrayData[xrayData.length - 1]
      if (latestXray.flux && latestXray.flux !== -9999) {
        xrayFlux = latestXray.flux
      } else if (latestXray.short && latestXray.short !== -9999) {
        xrayFlux = latestXray.short
      }
    }
    
    // Validate with ACE data if available
    if (aceData && aceData.length > 0) {
      const latestAce = aceData[aceData.length - 1]
      // Use ACE data to validate/supplement GOES if significantly different
      if (latestAce.e38 && latestAce.e38 !== -999.9) {
        // If GOES electron data seems wrong, use ACE
        if (electronFlux < 10 || electronFlux > 1e9) {
          electronFlux = latestAce.e38
        }
      }
    }
    
    // Calculate atmospheric parameters (simplified model)
    // Density increases during geomagnetic storms
    const baseDensity = 5e-13 // kg/m³ at 400km
    const densityMultiplier = 1 + (currentKp - 2) * 0.5 // Increases with Kp
    let atmosphericDensity = baseDensity * Math.max(1, densityMultiplier)
    
    // Scale height decreases during storms (atmosphere expands)
    const baseScaleHeight = 50 // km
    let scaleHeight = baseScaleHeight / Math.max(1, densityMultiplier * 0.5)
    
    // Temperature increases with solar/geomagnetic activity
    const baseTemp = 1000 // K
    let atmosphericTemp = baseTemp * (1 + currentKp * 0.1)
    
    // Ensure no NaN values
    if (isNaN(atmosphericDensity)) atmosphericDensity = baseDensity
    if (isNaN(scaleHeight)) scaleHeight = baseScaleHeight
    if (isNaN(atmosphericTemp)) atmosphericTemp = baseTemp
    
    // Calculate risk levels
    const geomagneticRisk = kpToGeomagneticRisk(currentKp)
    const radiationRisk = calculateParticleRisk(electronFlux, protonFlux)
    const radioRisk = xrayToRadioRisk(xrayFlux)
    
    // Identify current hazards
    const hazards = identifyHazards(
      electronFlux,
      protonFlux,
      magneticFieldBz,
      currentKp,
      atmosphericDensity
    )
    
    // Determine overall risk level
    const riskLevels = ['None', 'Minor', 'Moderate', 'Strong', 'Severe', 'Extreme']
    const maxRiskIndex = Math.max(
      riskLevels.indexOf(geomagneticRisk),
      riskLevels.indexOf(radiationRisk),
      riskLevels.indexOf(radioRisk)
    )
    
    const overallRiskMap = {
      'None': 'Minimal',
      'Minor': 'Low',
      'Moderate': 'Moderate',
      'Strong': 'High',
      'Severe': 'Critical',
      'Extreme': 'Critical'
    } as const
    
    const overallRisk = overallRiskMap[riskLevels[maxRiskIndex] as keyof typeof overallRiskMap] || 'Minimal'
    
    const satelliteEnvironment: SatelliteEnvironment = {
      riskLevels: {
        geomagnetic: geomagneticRisk,
        radiation: radiationRisk,
        radio: radioRisk
      },
      particleFlux: {
        electrons: electronFlux,
        protons: protonFlux,
        neutrons: neutronFlux
      },
      atmosphericDrag: {
        density: atmosphericDensity,
        scale_height: scaleHeight,
        temperature: atmosphericTemp
      },
      hazards,
      overallRisk
    }
    
    // Validate data structure
    const validatedData = SatelliteEnvironmentSchema.parse(satelliteEnvironment)
    
    return NextResponse.json(validatedData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=120' // Cache for 2 minutes
      }
    })
    
  } catch (error) {
    console.error('Error fetching satellite environment data:', error)
    
    // Return safe fallback data
    const fallbackData: SatelliteEnvironment = {
      riskLevels: {
        geomagnetic: 'None',
        radiation: 'None',
        radio: 'None'
      },
      particleFlux: {
        electrons: 1e3,
        protons: 0.1,
        neutrons: 10
      },
      atmosphericDrag: {
        density: 5e-13,
        scale_height: 50,
        temperature: 1000
      },
      hazards: [{
        type: 'Surface_Charging',
        severity: 'Low',
        duration: '1-3 hours',
        description: 'Unable to fetch real-time data. Showing nominal conditions.'
      }],
      overallRisk: 'Minimal'
    }
    
    return NextResponse.json(fallbackData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}