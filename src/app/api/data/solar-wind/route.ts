import { NextResponse } from 'next/server'
import { SolarWindDataSchema, type SolarWindData } from '@/lib/widgets/widget-types'

export async function GET() {
  try {
    // Fetch real ACE/DSCOVR satellite data from NOAA
    const [plasmaResponse, magResponse] = await Promise.all([
      fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json', {
        signal: AbortSignal.timeout(10000)
      }),
      fetch('https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json', {
        signal: AbortSignal.timeout(10000)
      })
    ])
    
    if (!plasmaResponse.ok || !magResponse.ok) {
      throw new Error(`NOAA API error: Plasma ${plasmaResponse.status}, Mag ${magResponse.status}`)
    }
    
    const plasmaData = await plasmaResponse.json()
    const magData = await magResponse.json()
    
    // Skip header row and get valid data
    const validPlasma = plasmaData.slice(1).filter((row: unknown[]) => 
      row.length >= 4 && 
      row[1] !== null && // density
      row[2] !== null && // speed
      row[3] !== null   // temperature
    )
    
    const validMag = magData.slice(1).filter((row: unknown[]) => 
      row.length >= 7 && 
      row[6] !== null // Bt
    )
    
    if (validPlasma.length === 0 || validMag.length === 0) {
      throw new Error('No valid solar wind data available')
    }
    
    // Get the most recent data points
    const latestPlasma = validPlasma[validPlasma.length - 1]
    const latestMag = validMag[validMag.length - 1]
    
    const speed = parseFloat(latestPlasma[2]) || 400
    const density = parseFloat(latestPlasma[1]) || 5
    const temperature = parseFloat(latestPlasma[3]) || 100000
    
    const bt = parseFloat(latestMag[6]) || 5
    const bz = parseFloat(latestMag[3]) || 0
    const by = parseFloat(latestMag[2]) || 0
    const bx = parseFloat(latestMag[1]) || 0
    
    // Calculate ram pressure (nPa)
    const pressureRam = density * speed * speed * 1.67e-6
    
    // Calculate trends based on recent data
    const calculateTrend = (data: unknown[][], index: number) => {
      if (data.length < 10) return 'stable' as const
      
      const recent = data.slice(-10).map(row => parseFloat(String(row[index])))
      const firstHalf = recent.slice(0, 5).reduce((a, b) => a + b, 0) / 5
      const secondHalf = recent.slice(5).reduce((a, b) => a + b, 0) / 5
      
      if (secondHalf > firstHalf * 1.1) return 'increasing' as const
      if (secondHalf < firstHalf * 0.9) return 'decreasing' as const
      return 'stable' as const
    }
    
    const classifySolarWind = (speed: number) => {
      if (speed < 350) return 'Low'
      if (speed < 450) return 'Normal'
      if (speed < 550) return 'Enhanced'
      return 'High'
    }
    
    const realData: SolarWindData = {
      speed,
      density,
      temperature,
      magneticField: {
        bt,
        bz,
        by,
        bx,
      },
      pressureRam,
      trend: {
        speed: calculateTrend(validPlasma, 2),
        density: calculateTrend(validPlasma, 1),
        magneticField: calculateTrend(validMag, 6),
      },
      classification: classifySolarWind(speed),
    }

    // Validate the data structure
    const validatedData = SolarWindDataSchema.parse(realData)

    return NextResponse.json(validatedData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    })
  } catch (error) {
    console.error('Error fetching solar wind data:', error)
    
    // Return minimal fallback data on error
    const fallbackData: SolarWindData = {
      speed: 400,
      density: 5,
      temperature: 100000,
      magneticField: {
        bt: 5,
        bz: 0,
        by: 0,
        bx: 0,
      },
      pressureRam: 1.3,
      trend: {
        speed: 'stable',
        density: 'stable',
        magneticField: 'stable',
      },
      classification: 'Normal',
    }
    
    return NextResponse.json(fallbackData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  }
}