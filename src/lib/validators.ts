import { z } from 'zod'
import { 
  NormalizedReportSchema,
  SpaceWeatherReportSchema,
  HazardLevel,
  SourceType
} from './types/space-weather'
import { ApiResponseSchema, ApiErrorSchema } from './types/api'

// Validation helper functions
export function validateNormalizedReport(data: unknown) {
  try {
    return {
      success: true as const,
      data: NormalizedReportSchema.parse(data),
      error: null,
    }
  } catch (error) {
    return {
      success: false as const,
      data: null,
      error: error instanceof z.ZodError ? error.issues : String(error),
    }
  }
}

export function validateSpaceWeatherReport(data: unknown) {
  try {
    return {
      success: true as const,
      data: SpaceWeatherReportSchema.parse(data),
      error: null,
    }
  } catch (error) {
    return {
      success: false as const,
      data: null,
      error: error instanceof z.ZodError ? error.issues : String(error),
    }
  }
}

// Type guards
export function isValidSourceType(value: string): value is z.infer<typeof SourceType> {
  try {
    SourceType.parse(value)
    return true
  } catch {
    return false
  }
}

export function isValidHazardLevel(value: string): value is z.infer<typeof HazardLevel> {
  try {
    HazardLevel.parse(value)
    return true
  } catch {
    return false
  }
}

export function isApiError(response: unknown): response is z.infer<typeof ApiErrorSchema> {
  try {
    ApiErrorSchema.parse(response)
    return true
  } catch {
    return false
  }
}

// Safe parsing utilities
export function safeParseDate(value: unknown): Date | null {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof value === 'number') {
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

export function safeParseNumber(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

export function safeParseString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value != null) return String(value)
  return null
}

// Hazard level utilities
export function getHazardSeverity(level: z.infer<typeof HazardLevel>): number {
  const levelMap: Record<string, number> = {
    G1: 1, G2: 2, G3: 3, G4: 4, G5: 5,
    R1: 1, R2: 2, R3: 3, R4: 4, R5: 5,
    S1: 1, S2: 2, S3: 3, S4: 4, S5: 5,
  }
  return levelMap[level] || 0
}

export function getHazardCategory(level: z.infer<typeof HazardLevel>): 'geomagnetic' | 'radio' | 'radiation' {
  if (level.startsWith('G')) return 'geomagnetic'
  if (level.startsWith('R')) return 'radio'
  return 'radiation'
}

export function isHighSeverityHazard(level: z.infer<typeof HazardLevel>): boolean {
  return getHazardSeverity(level) >= 3
}

// Data quality validation
export function validateDataQuality(report: z.infer<typeof NormalizedReportSchema>): {
  score: number
  issues: string[]
} {
  const issues: string[] = []
  let score = 1.0

  // Check for required fields
  if (!report.headline?.trim()) {
    issues.push('Missing headline')
    score -= 0.2
  }
  
  if (!report.summary?.trim()) {
    issues.push('Missing summary')
    score -= 0.2
  }

  if (!report.details?.trim()) {
    issues.push('Missing details')
    score -= 0.2
  }

  // Check data freshness (older than 24 hours)
  const hoursOld = (Date.now() - report.issuedAt.getTime()) / (1000 * 60 * 60)
  if (hoursOld > 24) {
    issues.push(`Data is ${Math.round(hoursOld)} hours old`)
    score -= Math.min(0.3, hoursOld / 72) // Reduce score based on age
  }

  // Check for processing errors
  if (report.processingErrors.length > 0) {
    issues.push(`${report.processingErrors.length} processing errors`)
    score -= report.processingErrors.length * 0.05
  }

  // Ensure score is between 0 and 1
  score = Math.max(0, Math.min(1, score))

  return { score, issues }
}

// API response validation
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string
): { success: boolean; data?: T; error?: string; timestamp: Date } {
  return {
    success,
    data: success ? data : undefined,
    error: success ? undefined : error,
    timestamp: new Date(),
  }
}

export function createApiError(
  error: string,
  code?: string,
  details?: any
): z.infer<typeof ApiErrorSchema> {
  return {
    success: false,
    error,
    code,
    details,
    timestamp: new Date(),
  }
}