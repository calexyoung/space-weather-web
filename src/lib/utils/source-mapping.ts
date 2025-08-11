import { SourceTypeEnum } from '@/lib/types/space-weather'

/**
 * Maps internal source type names to API endpoint names
 */
export const getApiEndpointForSource = (source: SourceTypeEnum): string => {
  const sourceMapping: Record<SourceTypeEnum, string> = {
    'NOAA_SWPC': 'noaa',
    'UK_MET_OFFICE': 'ukmo', 
    'HELIO_UCLES': 'helio'
  }
  
  return sourceMapping[source] || source.toLowerCase()
}

/**
 * Gets the API URL for a given source
 */
export const getSourceApiUrl = (source: SourceTypeEnum, params?: Record<string, string>): string => {
  const endpoint = getApiEndpointForSource(source)
  const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
  return `/api/sources/${endpoint}${queryString}`
}