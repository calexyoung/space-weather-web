import { z } from 'zod'
import { 
  NormalizedReportSchema, 
  SpaceWeatherReportSchema,
  SpaceWeatherDataSchema,
  LlmProvider 
} from './space-weather'

// Standard API response wrapper
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.date().default(() => new Date()),
  })

// API Error schema
export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().min(1),
  code: z.string().optional(),
  details: z.any().optional(),
  timestamp: z.date().default(() => new Date()),
})

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  total: z.number().min(0).optional(),
  pages: z.number().min(0).optional(),
})

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: PaginationSchema,
    timestamp: z.date().default(() => new Date()),
  })

// Specific API response types
export const FetchSourcesResponseSchema = ApiResponseSchema(
  z.array(NormalizedReportSchema)
)

export const ComposeReportResponseSchema = ApiResponseSchema(
  SpaceWeatherReportSchema
)

export const RealtimeDataResponseSchema = ApiResponseSchema(
  z.array(SpaceWeatherDataSchema)
)

// LLM tool call schemas
export const LlmToolCallSchema = z.object({
  name: z.string().min(1),
  parameters: z.record(z.any()),
})

export const LlmFunctionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  parameters: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional(),
  }),
})

// Dashboard widget data schemas
export const WidgetDataSchema = z.object({
  type: z.enum(['kp_index', 'solar_wind', 'xray_flux', 'status_summary']),
  title: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  status: z.enum(['normal', 'warning', 'critical']).optional(),
  lastUpdated: z.date(),
  trend: z.enum(['up', 'down', 'stable']).optional(),
  sparklineData: z.array(z.number()).optional(),
})

export const DashboardDataSchema = z.object({
  widgets: z.array(WidgetDataSchema),
  alerts: z.array(z.object({
    id: z.string(),
    level: z.enum(['info', 'warning', 'error']),
    message: z.string().min(1),
    timestamp: z.date(),
  })),
  lastRefresh: z.date(),
})

// Configuration schemas
export const LlmConfigSchema = z.object({
  provider: LlmProvider,
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().optional(),
  streaming: z.boolean().default(false),
})

export const SystemConfigSchema = z.object({
  defaultLlmProvider: LlmProvider,
  refreshIntervals: z.object({
    sources: z.number().positive().default(300000), // 5 minutes
    realtimeData: z.number().positive().default(60000), // 1 minute
    dashboard: z.number().positive().default(30000), // 30 seconds
  }),
  alerts: z.object({
    enabled: z.boolean().default(true),
    emailNotifications: z.boolean().default(false),
    thresholds: z.object({
      kpIndex: z.number().min(0).max(9).default(5),
      xrayFlux: z.number().positive().default(1e-5),
    }),
  }),
})

// Export TypeScript types
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  timestamp: Date
}

export type ApiError = z.infer<typeof ApiErrorSchema>
export type Pagination = z.infer<typeof PaginationSchema>
export type PaginatedResponse<T = any> = {
  success: true
  data: T[]
  pagination: Pagination
  timestamp: Date
}

export type FetchSourcesResponse = z.infer<typeof FetchSourcesResponseSchema>
export type ComposeReportResponse = z.infer<typeof ComposeReportResponseSchema>
export type RealtimeDataResponse = z.infer<typeof RealtimeDataResponseSchema>
export type LlmToolCall = z.infer<typeof LlmToolCallSchema>
export type LlmFunction = z.infer<typeof LlmFunctionSchema>
export type WidgetData = z.infer<typeof WidgetDataSchema>
export type DashboardData = z.infer<typeof DashboardDataSchema>
export type LlmConfig = z.infer<typeof LlmConfigSchema>
export type SystemConfig = z.infer<typeof SystemConfigSchema>