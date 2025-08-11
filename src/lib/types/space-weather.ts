import { z } from 'zod'

// Enums matching Prisma schema
export const SourceType = z.enum([
  'NOAA_SWPC',
  'UK_MET_OFFICE',
  'HELIO_UCLES',
  'OTHER'
])

export const HazardLevel = z.enum([
  'G1', 'G2', 'G3', 'G4', 'G5',  // Geomagnetic storms
  'R1', 'R2', 'R3', 'R4', 'R5',  // Radio blackouts
  'S1', 'S2', 'S3', 'S4', 'S5'   // Solar radiation storms
])

export const LlmProvider = z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE'])

// Core space weather data schemas
export const NormalizedReportSchema = z.object({
  id: z.string().optional(),
  source: SourceType,
  sourceUrl: z.string().url().optional(),
  issuedAt: z.date(),
  fetchedAt: z.date().optional(),
  
  // Core data
  headline: z.string().min(1),
  summary: z.string().min(1),
  details: z.string().min(1),
  confidence: z.string().optional(),
  
  // Validity window
  validStart: z.date().optional(),
  validEnd: z.date().optional(),
  
  // Hazard assessments
  geomagneticLevel: HazardLevel.optional(),
  geomagneticText: z.string().optional(),
  radioBlackoutLevel: HazardLevel.optional(),
  radioBlackoutText: z.string().optional(),
  radiationStormLevel: HazardLevel.optional(),
  radiationStormText: z.string().optional(),
  
  // Metadata
  rawPayload: z.any().optional(),
  processingErrors: z.array(z.string()).default([]),
  qualityScore: z.number().min(0).max(1).optional(),
})

export const CombinedReportSchema = z.object({
  generatedAt: z.date(),
  sources: z.array(NormalizedReportSchema),
  combinedHeadline: z.string().min(1),
  executiveSummary: z.string().min(1),
  outlookNext72h: z.string().min(1),
  riskOverview: z.object({
    geomagnetic: z.string().optional(),
    radioBlackout: z.string().optional(),
    radiationStorm: z.string().optional(),
  }).optional(),
  recommendedActions: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export const SpaceWeatherReportSchema = z.object({
  id: z.string().optional(),
  generatedAt: z.date(),
  combinedHeadline: z.string().min(1),
  executiveSummary: z.string().min(1),
  outlookNext72h: z.string().min(1),
  markdownContent: z.string().min(1),
  htmlContent: z.string().min(1),
  jsonMetadata: z.any().optional(),
  
  // LLM metadata
  llmProvider: LlmProvider.optional(),
  llmModel: z.string().optional(),
  generationTime: z.number().positive().optional(),
  
  // Associated sources
  sources: z.array(NormalizedReportSchema).optional(),
})

// Real-time data schemas
export const SpaceWeatherDataSchema = z.object({
  id: z.string().optional(),
  timestamp: z.date(),
  dataType: z.enum(['kp_index', 'solar_wind_speed', 'xray_flux', 'proton_flux', 'magnetic_field']),
  value: z.number(),
  unit: z.string().optional(),
  source: z.string().optional(),
  quality: z.enum(['good', 'fair', 'poor']).optional(),
})

// Template schemas
export const ReportTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  markdownTemplate: z.string().min(1),
  htmlTemplate: z.string().min(1),
  variablesSchema: z.any().optional(),
})

// API request/response schemas
export const FetchSourceRequestSchema = z.object({
  source: SourceType,
  forceRefresh: z.boolean().default(false),
})

export const ComposeReportRequestSchema = z.object({
  sources: z.array(z.string()), // Report IDs
  templateId: z.string().optional(),
  llmProvider: LlmProvider.optional(),
  customInstructions: z.string().optional(),
})

export const ChatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  toolCalls: z.any().optional(),
  timestamp: z.date().optional(),
})

export const ChatConversationSchema = z.object({
  id: z.string().optional(),
  reportId: z.string().optional(),
  provider: LlmProvider,
  model: z.string().min(1),
  messages: z.array(ChatMessageSchema),
  createdAt: z.date().optional(),
})

// Export TypeScript types
export type SourceTypeEnum = z.infer<typeof SourceType>
export type HazardLevelEnum = z.infer<typeof HazardLevel>
export type LlmProviderEnum = z.infer<typeof LlmProvider>
export type NormalizedReport = z.infer<typeof NormalizedReportSchema>
export type CombinedReport = z.infer<typeof CombinedReportSchema>
export type SpaceWeatherReport = z.infer<typeof SpaceWeatherReportSchema>
export type SpaceWeatherData = z.infer<typeof SpaceWeatherDataSchema>
export type ReportTemplate = z.infer<typeof ReportTemplateSchema>
export type FetchSourceRequest = z.infer<typeof FetchSourceRequestSchema>
export type ComposeReportRequest = z.infer<typeof ComposeReportRequestSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type ChatConversation = z.infer<typeof ChatConversationSchema>