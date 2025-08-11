import { z } from 'zod'

// Widget configuration and state types
export const WidgetConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  refreshInterval: z.number().min(5000).max(300000).default(30000), // 5s to 5min
  isVisible: z.boolean().default(true),
  position: z.number().default(0),
  expanded: z.boolean().default(false),
})

export const WidgetDataStateSchema = z.object({
  isLoading: z.boolean().default(false),
  hasError: z.boolean().default(false),
  errorMessage: z.string().optional(),
  lastUpdated: z.date().optional(),
  isOffline: z.boolean().default(false),
})

// KP Index Widget Data
export const KpIndexDataSchema = z.object({
  current: z.number().min(0).max(9),
  currentLevel: z.enum(['Quiet', 'Unsettled', 'Active', 'Minor Storm', 'Moderate Storm', 'Strong Storm', 'Severe Storm', 'Extreme Storm']),
  forecast3h: z.array(z.object({
    time: z.date(),
    kp: z.number().min(0).max(9),
    level: z.string(),
  })).max(8), // Next 24 hours in 3h increments
  trend: z.enum(['increasing', 'decreasing', 'stable']),
  estimated_speed: z.number().optional(),
})

// Solar Wind Widget Data
export const SolarWindDataSchema = z.object({
  speed: z.number().positive(),
  density: z.number().positive(),
  temperature: z.number().positive(),
  magneticField: z.object({
    bt: z.number(), // Total magnetic field
    bz: z.number(), // Z-component (most important for geomagnetic activity)
    by: z.number(), // Y-component
    bx: z.number(), // X-component
  }),
  pressureRam: z.number().positive(),
  trend: z.object({
    speed: z.enum(['increasing', 'decreasing', 'stable']),
    density: z.enum(['increasing', 'decreasing', 'stable']),
    magneticField: z.enum(['increasing', 'decreasing', 'stable']),
  }),
  classification: z.enum(['Low', 'Normal', 'Enhanced', 'High']),
})

// X-ray Flux Widget Data
export const XrayFluxDataSchema = z.object({
  shortWave: z.object({
    current: z.number().positive(),
    flareClass: z.enum(['A', 'B', 'C', 'M', 'X']),
    magnitude: z.number().positive(),
    level: z.string(), // e.g., "B2.3", "M5.1", "X1.4"
  }),
  longWave: z.object({
    current: z.number().positive(),
    flareClass: z.enum(['A', 'B', 'C', 'M', 'X']),
    magnitude: z.number().positive(),
    level: z.string(),
  }),
  background: z.string(), // Background flux level
  recentFlares: z.array(z.object({
    time: z.date(),
    peak: z.string(), // e.g., "M2.1"
    duration: z.number().optional(), // minutes
    location: z.string().optional(), // Active region
  })).max(10),
  trend: z.enum(['increasing', 'decreasing', 'stable']),
  riskLevel: z.enum(['Minimal', 'Minor', 'Moderate', 'Strong', 'Severe']),
})

// Aurora Forecast Widget Data
export const AuroraForecastSchema = z.object({
  currentActivity: z.enum(['Quiet', 'Unsettled', 'Minor', 'Moderate', 'Strong', 'Severe', 'Extreme']),
  visibility: z.object({
    northern: z.object({
      latitudeThreshold: z.number(), // Lowest latitude where aurora may be visible
      probability: z.number().min(0).max(100),
      locations: z.array(z.string()), // Major cities where visible
    }),
    southern: z.object({
      latitudeThreshold: z.number(),
      probability: z.number().min(0).max(100),
      locations: z.array(z.string()),
    }),
  }),
  forecast24h: z.array(z.object({
    time: z.date(),
    activity: z.string(),
    visibility: z.object({
      northern: z.number().min(0).max(100),
      southern: z.number().min(0).max(100),
    }),
  })).max(24),
  peakTime: z.date().optional(),
  confidence: z.enum(['Low', 'Medium', 'High']),
})

// Satellite Environment Widget Data
export const SatelliteEnvironmentSchema = z.object({
  riskLevels: z.object({
    geomagnetic: z.enum(['None', 'Minor', 'Moderate', 'Strong', 'Severe', 'Extreme']),
    radiation: z.enum(['None', 'Minor', 'Moderate', 'Strong', 'Severe', 'Extreme']),
    radio: z.enum(['None', 'Minor', 'Moderate', 'Strong', 'Severe', 'Extreme']),
  }),
  particleFlux: z.object({
    electrons: z.number().positive(),
    protons: z.number().positive(),
    neutrons: z.number().positive(),
  }),
  atmosphericDrag: z.object({
    density: z.number().positive(),
    scale_height: z.number().positive(),
    temperature: z.number().positive(),
  }),
  hazards: z.array(z.object({
    type: z.enum(['Surface_Charging', 'Deep_Dielectric_Charging', 'Single_Event_Upset', 'Atmospheric_Drag', 'Navigation_Error']),
    severity: z.enum(['Low', 'Moderate', 'High', 'Critical']),
    duration: z.string(), // e.g., "6-12 hours"
    description: z.string(),
  })),
  overallRisk: z.enum(['Minimal', 'Low', 'Moderate', 'High', 'Critical']),
})

// Widget sparkline data for trend visualization
export const SparklineDataSchema = z.object({
  timestamps: z.array(z.date()),
  values: z.array(z.number()),
  unit: z.string().optional(),
  color: z.string().default('#3b82f6'),
})

// Combined widget data type
export const WidgetDataSchema = z.object({
  kpIndex: KpIndexDataSchema.optional(),
  solarWind: SolarWindDataSchema.optional(),
  xrayFlux: XrayFluxDataSchema.optional(),
  auroraForecast: AuroraForecastSchema.optional(),
  satelliteEnvironment: SatelliteEnvironmentSchema.optional(),
  sparklines: z.record(SparklineDataSchema).optional(),
})

// Widget subscription event types
export const WidgetEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('data_update'),
    widgetId: z.string(),
    data: z.any(),
    timestamp: z.date(),
  }),
  z.object({
    type: z.literal('connection_status'),
    isConnected: z.boolean(),
    timestamp: z.date(),
  }),
  z.object({
    type: z.literal('error'),
    widgetId: z.string(),
    error: z.string(),
    timestamp: z.date(),
  }),
])

// Export TypeScript types
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>
export type WidgetDataState = z.infer<typeof WidgetDataStateSchema>
export type KpIndexData = z.infer<typeof KpIndexDataSchema>
export type SolarWindData = z.infer<typeof SolarWindDataSchema>
export type XrayFluxData = z.infer<typeof XrayFluxDataSchema>
export type AuroraForecast = z.infer<typeof AuroraForecastSchema>
export type SatelliteEnvironment = z.infer<typeof SatelliteEnvironmentSchema>
export type SparklineData = z.infer<typeof SparklineDataSchema>
export type WidgetData = z.infer<typeof WidgetDataSchema>
export type WidgetEvent = z.infer<typeof WidgetEventSchema>

// Widget type enumeration
export type WidgetType = 'kp-index' | 'solar-wind' | 'xray-flux' | 'aurora-forecast' | 'satellite-environment'

// Widget registry for dynamic loading
export interface WidgetInfo {
  id: WidgetType
  title: string
  description: string
  icon: string
  defaultConfig: Partial<WidgetConfig>
  dataSchema: z.ZodSchema
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetInfo> = {
  'kp-index': {
    id: 'kp-index',
    title: 'Kp Index Monitor',
    description: 'Real-time geomagnetic activity monitoring with 24-hour forecast',
    icon: 'Activity',
    defaultConfig: {
      refreshInterval: 180000, // 3 minutes
    },
    dataSchema: KpIndexDataSchema,
  },
  'solar-wind': {
    id: 'solar-wind',
    title: 'Solar Wind Parameters',
    description: 'Live solar wind speed, density, temperature, and magnetic field data',
    icon: 'Wind',
    defaultConfig: {
      refreshInterval: 60000, // 1 minute
    },
    dataSchema: SolarWindDataSchema,
  },
  'xray-flux': {
    id: 'xray-flux',
    title: 'X-ray Flux Monitor',
    description: 'Solar X-ray flux levels with flare classification and recent events',
    icon: 'Zap',
    defaultConfig: {
      refreshInterval: 30000, // 30 seconds
    },
    dataSchema: XrayFluxDataSchema,
  },
  'aurora-forecast': {
    id: 'aurora-forecast',
    title: 'Aurora Forecast',
    description: 'Aurora visibility predictions for northern and southern hemispheres',
    icon: 'Sparkles',
    defaultConfig: {
      refreshInterval: 300000, // 5 minutes
    },
    dataSchema: AuroraForecastSchema,
  },
  'satellite-environment': {
    id: 'satellite-environment',
    title: 'Satellite Environment',
    description: 'Space environment hazards and satellite operational risks',
    icon: 'Satellite',
    defaultConfig: {
      refreshInterval: 120000, // 2 minutes
    },
    dataSchema: SatelliteEnvironmentSchema,
  },
}