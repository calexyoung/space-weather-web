import { z } from 'zod'

// Base schemas for common data types
export const TimestampSchema = z.string().datetime().or(z.date())

export const NumericValueSchema = z.number().finite().or(z.null())

export const PositiveNumberSchema = z.number().positive().finite()

export const PercentageSchema = z.number().min(0).max(100)

// Solar Wind Data Schemas
export const SolarWindSchema = z.object({
  speed: z.number().min(200).max(3000).nullable(), // km/s typical range
  density: z.number().min(0).max(200).nullable(), // p/cm³
  temperature: z.number().min(1000).max(10000000).nullable(), // K
  timestamp: TimestampSchema
})

// Magnetic Field Data Schemas
export const MagneticFieldSchema = z.object({
  bt: z.number().min(0).max(100).nullable(), // nT total field
  bx: z.number().min(-50).max(50).nullable(), // nT
  by: z.number().min(-50).max(50).nullable(), // nT
  bz: z.number().min(-50).max(50).nullable(), // nT GSM
  phi: z.number().min(0).max(360).nullable(), // degrees
  timestamp: TimestampSchema
})

// X-ray Flux Schema
export const XrayFluxSchema = z.object({
  shortWave: z.number().min(1e-9).max(1e-2).nullable(), // W/m² (A1 to X20+)
  longWave: z.number().min(1e-9).max(1e-2).nullable(), // W/m²
  class: z.enum(['A', 'B', 'C', 'M', 'X']).optional(),
  timestamp: TimestampSchema
})

// Particle Flux Schemas
export const ProtonFluxSchema = z.object({
  flux_10MeV: z.number().min(0.01).max(1e6).nullable(), // pfu
  flux_50MeV: z.number().min(0.01).max(1e5).nullable(), // pfu
  flux_100MeV: z.number().min(0.01).max(1e4).nullable(), // pfu
  timestamp: TimestampSchema
})

export const ElectronFluxSchema = z.object({
  flux_0_8MeV: z.number().min(1).max(1e8).nullable(), // e/(cm²·s·sr)
  flux_2MeV: z.number().min(1).max(1e7).nullable(), // e/(cm²·s·sr)
  timestamp: TimestampSchema
})

// Geomagnetic Indices Schemas
export const KpIndexSchema = z.object({
  kp: z.number().min(0).max(9).step(0.33), // 0 to 9 in thirds
  timestamp: TimestampSchema
})

export const DstIndexSchema = z.object({
  dst: z.number().min(-600).max(100), // nT, extreme storms can reach -600
  timestamp: TimestampSchema
})

export const ApIndexSchema = z.object({
  ap: z.number().min(0).max(400), // typical range
  timestamp: TimestampSchema
})

// Solar Activity Schemas
export const SunspotNumberSchema = z.object({
  ssn: z.number().min(0).max(500), // historical max around 400
  smoothed: z.number().min(0).max(300).optional(),
  timestamp: TimestampSchema
})

export const F107FluxSchema = z.object({
  flux: z.number().min(50).max(400), // sfu (solar flux units)
  adjusted: z.number().min(50).max(400).optional(),
  timestamp: TimestampSchema
})

export const SolarRegionSchema = z.object({
  region: z.number().min(10000).max(20000),
  location: z.string().regex(/^[NS]\d{2}[EW]\d{2}$/), // e.g., N12W45
  area: z.number().min(0).max(5000), // millionths of solar hemisphere
  spotClass: z.string().optional(),
  magClass: z.enum(['Alpha', 'Beta', 'Beta-Gamma', 'Beta-Gamma-Delta']).optional(),
  flareProb: z.object({
    C: PercentageSchema,
    M: PercentageSchema,
    X: PercentageSchema
  }).optional()
})

// Aurora Forecast Schema
export const AuroraForecastSchema = z.object({
  hemisphere: z.enum(['north', 'south']),
  viewLine: z.number().min(-90).max(90), // latitude
  power: z.number().min(0).max(200), // GW
  extent: z.number().min(0).max(90), // degrees latitude
  timestamp: TimestampSchema
})

// Data Quality Metadata Schema
export const DataQualityMetaSchema = z.object({
  source: z.string(),
  quality: PercentageSchema,
  completeness: PercentageSchema,
  latency: z.number().min(0), // milliseconds
  isCache: z.boolean(),
  isFallback: z.boolean(),
  validationErrors: z.array(z.string()),
  timestamp: TimestampSchema
})

// Satellite Status Schema
export const SatelliteStatusSchema = z.object({
  name: z.string(),
  status: z.enum(['online', 'degraded', 'offline']),
  lastUpdate: TimestampSchema,
  dataQuality: PercentageSchema,
  instruments: z.record(z.boolean()).optional()
})

// NOAA API Response Validators
export const NOAAPlasmaResponseSchema = z.array(z.array(z.any())).transform(data => {
  return data.filter(row => 
    Array.isArray(row) && 
    row.length >= 4 &&
    row[0] !== null // timestamp
  ).map(row => ({
    timestamp: row[0],
    density: row[1],
    speed: row[2],
    temperature: row[3]
  }))
})

export const NOAAMagResponseSchema = z.array(z.array(z.any())).transform(data => {
  return data.filter(row =>
    Array.isArray(row) &&
    row.length >= 7 &&
    row[0] !== null // timestamp
  ).map(row => ({
    timestamp: row[0],
    bx: row[1],
    by: row[2],
    bz: row[3],
    lon: row[4],
    lat: row[5],
    bt: row[6]
  }))
})

// Validation helper functions
export function validateSolarWind(data: unknown): z.infer<typeof SolarWindSchema> | null {
  try {
    return SolarWindSchema.parse(data)
  } catch (error) {
    console.error('Solar wind validation failed:', error)
    return null
  }
}

export function validateMagneticField(data: unknown): z.infer<typeof MagneticFieldSchema> | null {
  try {
    return MagneticFieldSchema.parse(data)
  } catch (error) {
    console.error('Magnetic field validation failed:', error)
    return null
  }
}

export function validateXrayFlux(data: unknown): z.infer<typeof XrayFluxSchema> | null {
  try {
    return XrayFluxSchema.parse(data)
  } catch (error) {
    console.error('X-ray flux validation failed:', error)
    return null
  }
}

// Data sanitization functions
export function sanitizeNumericValue(
  value: any,
  min: number,
  max: number,
  fallback: number | null = null
): number | null {
  if (value === null || value === undefined || value === '') return fallback
  
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) return fallback
  
  // Clamp to valid range
  if (num < min) return min
  if (num > max) return max
  
  return num
}

export function sanitizeTimestamp(value: any): Date | null {
  if (!value) return null
  
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return null
    
    // Check if date is reasonable (not too far in past or future)
    const now = new Date()
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    const oneHourFuture = new Date(now.getTime() + 60 * 60 * 1000)
    
    if (date < oneYearAgo || date > oneHourFuture) return null
    
    return date
  } catch {
    return null
  }
}

// Data completeness calculation
export function calculateCompleteness(data: Record<string, any>): number {
  const fields = Object.keys(data)
  const nonNullFields = fields.filter(key => 
    data[key] !== null && 
    data[key] !== undefined &&
    data[key] !== ''
  )
  
  return fields.length > 0 ? (nonNullFields.length / fields.length) * 100 : 0
}

// Outlier detection using IQR method
export function detectOutliers(values: number[]): number[] {
  if (values.length < 4) return []
  
  const sorted = [...values].sort((a, b) => a - b)
  const q1Index = Math.floor(sorted.length * 0.25)
  const q3Index = Math.floor(sorted.length * 0.75)
  
  const q1 = sorted[q1Index]
  const q3 = sorted[q3Index]
  const iqr = q3 - q1
  
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  
  return values.filter(v => v < lowerBound || v > upperBound)
}

// Cross-validation between multiple sources
export function crossValidateData<T>(
  sources: Array<{ name: string; data: T; quality: number }>
): { 
  consensus: T | null; 
  confidence: number; 
  outliers: string[] 
} {
  if (sources.length === 0) {
    return { consensus: null, confidence: 0, outliers: [] }
  }
  
  // Sort by quality
  const sorted = [...sources].sort((a, b) => b.quality - a.quality)
  
  // Use highest quality source as baseline
  const baseline = sorted[0]
  const outliers: string[] = []
  
  // Check for significant deviations
  for (const source of sorted.slice(1)) {
    if (source.quality < 50) {
      outliers.push(source.name)
    }
  }
  
  // Calculate confidence based on agreement
  const avgQuality = sources.reduce((sum, s) => sum + s.quality, 0) / sources.length
  const confidence = outliers.length === 0 ? avgQuality : avgQuality * 0.8
  
  return {
    consensus: baseline.data,
    confidence,
    outliers
  }
}

// Export validation result type
export interface ValidationResult<T> {
  isValid: boolean
  data: T | null
  errors: string[]
  warnings: string[]
  quality: number
  completeness: number
}

// Generic validation wrapper
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options?: {
    checkCompleteness?: boolean
    detectOutliers?: boolean
    sanitize?: boolean
  }
): ValidationResult<T> {
  const result: ValidationResult<T> = {
    isValid: false,
    data: null,
    errors: [],
    warnings: [],
    quality: 0,
    completeness: 0
  }
  
  try {
    // Parse with schema
    const parsed = schema.parse(data)
    result.data = parsed
    result.isValid = true
    result.quality = 100
    
    // Calculate completeness if requested
    if (options?.checkCompleteness && typeof parsed === 'object' && parsed !== null) {
      result.completeness = calculateCompleteness(parsed as Record<string, any>)
      
      if (result.completeness < 80) {
        result.warnings.push(`Data completeness is ${result.completeness.toFixed(1)}%`)
        result.quality *= result.completeness / 100
      }
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    } else {
      result.errors = ['Unknown validation error']
    }
  }
  
  return result
}