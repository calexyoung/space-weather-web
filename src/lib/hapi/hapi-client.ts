import { csvParseRows } from 'd3-dsv'
import { format } from 'date-fns'

export interface HAPIDataPoint {
  time: Date
  [key: string]: number | string | Date
}

export interface HAPIFetchResult {
  datalist: HAPIDataPoint[]
  cadence: number
  metadata: {
    source: string
    server: string
    dataset: string
    dataPoints: number
    lastUpdated: string | null
  }
}

export interface HAPIParameter {
  name: string
  type: 'double' | 'string' | 'isotime'
  size?: number
  fill?: number | string
  units?: string
  description?: string
}

export interface HAPIInfo {
  id: string
  title: string
  parameters: HAPIParameter[]
  startDate: string
  stopDate: string
  cadence?: string
}

interface HAPIQueryOptions {
  server: string
  dataset: string
  parameters: string[]
  timeRange: [Date, Date]
  cadence?: number
}

// HAPI Servers - prioritized by reliability
export const HAPI_SERVERS = [
  {
    url: 'https://hapi.spaceweather.knmi.nl/hapi',
    name: 'KNMI Space Weather HAPI server',
    priority: 1
  },
  {
    url: 'https://cdaweb.gsfc.nasa.gov/hapi',
    name: 'NASA CDAWeb',
    priority: 2
  },
  {
    url: 'https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi',
    name: 'NASA CCMC ISWA',
    priority: 3
  },
  {
    url: 'https://iswa.ccmc.gsfc.nasa.gov/IswaSystemWebApp/hapi',
    name: 'NASA CCMC ISWA (backup)',
    priority: 4
  }
] as const

// Dataset configurations for space weather parameters
export const SPACE_WEATHER_DATASETS = {
  xray_flux: {
    servers: [
      {
        server: 'https://hapi.spaceweather.knmi.nl/hapi',
        dataset: 'xray_flux_rt',
        parameters: ['xray_flux_long', 'xray_flux_short'],
        timeParameter: 'time'
      },
      {
        server: 'https://cdaweb.gsfc.nasa.gov/hapi',
        dataset: 'AC_H0_MFI',
        parameters: ['BGSEc'],
        timeParameter: 'Epoch'
      }
    ]
  },
  proton_flux: {
    servers: [
      {
        server: 'https://hapi.spaceweather.knmi.nl/hapi',
        dataset: 'proton_flux_500_rt',
        parameters: ['proton_flux_10MeV', 'proton_flux_50MeV', 'proton_flux_100MeV'],
        timeParameter: 'time'
      }
    ]
  },
  kp_index: {
    servers: [
      {
        server: 'https://hapi.spaceweather.knmi.nl/hapi',
        dataset: 'kp_index',
        parameters: ['Kp'],
        timeParameter: 'time'
      }
    ]
  },
  solar_wind: {
    servers: [
      {
        server: 'https://hapi.spaceweather.knmi.nl/hapi',
        dataset: 'solar_wind_plasma_ace_rt',
        parameters: ['bulk_speed', 'proton_density'],
        timeParameter: 'time'
      }
    ]
  },
  magnetic_field: {
    servers: [
      {
        server: 'https://hapi.spaceweather.knmi.nl/hapi',
        dataset: 'solar_wind_mag_rt',
        parameters: ['bt', 'bz_gsm'],
        timeParameter: 'time'
      }
    ]
  }
} as const

const reorganizeInfoByParameter = (info: HAPIInfo, parameters: string[]) => {
  const infoRelevant = info.parameters.filter((p) => parameters.includes(p.name))
  return infoRelevant.reduce(
    (obj, item) => {
      obj[item.name] = {
        fill: item.fill === null || item.fill === undefined ? NaN : item.fill,
        size: item.size || 1,
        type: item.type,
      }
      return obj
    },
    {} as Record<string, { fill: number | string; size: number; type: string }>
  )
}

export const fetchHAPIInfo = async (server: string, dataset: string): Promise<HAPIInfo> => {
  const infoUrl = `${server}/info?id=${dataset}`
  
  const response = await fetch(infoUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Space-Weather-Dashboard/1.0'
    },
    signal: AbortSignal.timeout(10000) // 10 second timeout
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch HAPI info from ${infoUrl}: ${response.status} ${response.statusText}`)
  }
  
  return response.json()
}

export const fetchHAPIData = async (options: HAPIQueryOptions): Promise<HAPIFetchResult> => {
  const { server, dataset, parameters, timeRange, cadence = 0 } = options
  
  try {
    // First, get dataset info
    const info = await fetchHAPIInfo(server, dataset)
    
    // HAPI requirement: collect parameters in the same order as dataset info
    const allParameters = info.parameters.map((par) => par.name)
    const orderedParameters = allParameters.filter((parname) => parameters.includes(parname))
    
    if (orderedParameters.length === 0) {
      throw new Error(`No valid parameters found in dataset ${dataset}`)
    }
    
    // Create the data URL
    const startTime = format(timeRange[0], "yyyy-MM-dd'T'HH:mm:ss'Z'")
    const endTime = format(timeRange[1], "yyyy-MM-dd'T'HH:mm:ss'Z'")
    const dataUrl = `${server}/data?id=${dataset}&parameters=${orderedParameters.join(',')}&time.min=${startTime}&time.max=${endTime}`
    
    // Fetch data with timeout
    const response = await fetch(dataUrl, { 
      headers: {
        'Accept': 'text/csv',
        'User-Agent': 'Space-Weather-Dashboard/1.0'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`Network response was not ok on fetch of url: ${dataUrl} - ${response.status} ${response.statusText}`)
    }
    
    // Get CSV content
    const csvText = await response.text()
    
    if (!csvText.trim()) {
      throw new Error('Empty response from HAPI server')
    }
    
    // Set up parameter info for easy access
    const parameterInfo = reorganizeInfoByParameter(info, orderedParameters)
    
    // Parse CSV
    const datalist: HAPIDataPoint[] = csvParseRows(csvText, (csvColumns, i) => {
      if (!csvColumns || csvColumns.length === 0) return null
      
      const obj: HAPIDataPoint = {
        time: new Date(csvColumns[0])
      }
      
      // Validate time
      if (isNaN(obj.time.getTime())) return null
      
      let csvColumnIndex = 0
      
      for (let parameterIndex = 0; parameterIndex < orderedParameters.length; parameterIndex++) {
        const par = orderedParameters[parameterIndex]
        let parname = par
        const size = parameterInfo[par]?.size || 1
        const fill = parameterInfo[par]?.fill
        const type = parameterInfo[par]?.type
        
        for (let dimensionIndex = 0; dimensionIndex < size; dimensionIndex++) {
          csvColumnIndex++
          if (size > 1) {
            parname = `${par}_${dimensionIndex}`
          }
          
          if (csvColumnIndex >= csvColumns.length) break
          
          const columnText = csvColumns[csvColumnIndex]
          
          if (
            columnText === '' ||
            columnText === fill ||
            +columnText === +fill
          ) {
            obj[parname] = NaN
          } else if (type === 'isotime' || type === 'string') {
            obj[parname] = columnText
          } else {
            const numValue = Number(columnText)
            obj[parname] = isNaN(numValue) ? NaN : numValue
          }
        }
      }
      
      return obj
    }).filter(item => item !== null) as HAPIDataPoint[]
    
    return {
      datalist,
      cadence,
      metadata: {
        source: `HAPI: ${dataset}`,
        server,
        dataset,
        dataPoints: datalist.length,
        lastUpdated: datalist.length > 0 ? datalist[datalist.length - 1].time.toISOString() : null
      }
    }
  } catch (error) {
    throw new Error(`HAPI fetch failed for ${server}/${dataset}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const fetchHAPIDataWithFallback = async (
  datasetConfigs: Array<{
    server: string
    dataset: string
    parameters: string[]
    timeParameter?: string
  }>,
  timeRange: [Date, Date]
): Promise<HAPIFetchResult> => {
  let lastError: Error | null = null
  
  for (const config of datasetConfigs) {
    try {
      console.log(`Attempting HAPI fetch from ${config.server}/${config.dataset}`)
      const result = await fetchHAPIData({
        server: config.server,
        dataset: config.dataset,
        parameters: config.parameters,
        timeRange
      })
      
      if (result.datalist.length > 0) {
        console.log(`Successfully fetched ${result.datalist.length} data points from ${config.server}`)
        return result
      }
    } catch (error) {
      console.warn(`HAPI fetch failed for ${config.server}/${config.dataset}:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
      continue
    }
  }
  
  throw lastError || new Error('All HAPI servers failed to provide data')
}