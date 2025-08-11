import { z } from 'zod'
import { HazardLevel, LlmProvider, SourceType } from '../types/space-weather'

// Template variable definitions for type safety
export const TemplateVariablesSchema = z.object({
  // Core report data
  generatedAt: z.date(),
  sources: z.array(z.object({
    id: z.string().optional(),
    source: SourceType,
    sourceUrl: z.string().url().optional(),
    issuedAt: z.date(),
    fetchedAt: z.date().optional(),
    headline: z.string(),
    summary: z.string(),
    details: z.string(),
    confidence: z.string().optional(),
    validStart: z.date().optional(),
    validEnd: z.date().optional(),
    geomagneticLevel: HazardLevel.optional(),
    geomagneticText: z.string().optional(),
    radioBlackoutLevel: HazardLevel.optional(),
    radioBlackoutText: z.string().optional(),
    radiationStormLevel: HazardLevel.optional(),
    radiationStormText: z.string().optional(),
    qualityScore: z.number().min(0).max(1).optional(),
  })),
  
  // Combined report content
  combinedHeadline: z.string(),
  executiveSummary: z.string(),
  solarActivity: z.string().optional(),
  geomagneticActivity: z.string().optional(),
  radiationEnvironment: z.string().optional(),
  forecast72h: z.string(),
  riskAssessment: z.object({
    geomagnetic: z.string().optional(),
    radioBlackout: z.string().optional(),
    radiationStorm: z.string().optional(),
    overall: z.string().optional(),
  }).optional(),
  recommendations: z.array(z.string()).optional(),
  
  // Metadata
  llmProvider: LlmProvider.optional(),
  llmModel: z.string().optional(),
  generationTime: z.number().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
})

// Template configuration schema
export const TemplateConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  category: z.enum(['standard', 'technical', 'executive', 'alert', 'custom']),
  outputFormat: z.enum(['markdown', 'html', 'both']),
  
  // Template metadata
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  
  // Required variables
  requiredVariables: z.array(z.string()).default([]),
  optionalVariables: z.array(z.string()).default([]),
  
  // Template content
  markdownTemplate: z.string().min(1),
  htmlTemplate: z.string().optional(),
  
  // Styling and formatting
  cssClasses: z.record(z.string()).optional(),
  customHelpers: z.array(z.string()).default([]),
  
  // Validation rules
  validationRules: z.array(z.object({
    field: z.string(),
    rule: z.enum(['required', 'minLength', 'maxLength', 'pattern']),
    value: z.any(),
    message: z.string().optional(),
  })).default([]),
})

// Template compilation result
export const CompiledTemplateSchema = z.object({
  templateId: z.string(),
  compiledMarkdown: z.function().optional(),
  compiledHtml: z.function().optional(),
  compiledAt: z.date(),
  isValid: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

// Template rendering context
export const RenderContextSchema = z.object({
  template: TemplateConfigSchema,
  variables: TemplateVariablesSchema,
  options: z.object({
    strict: z.boolean().default(true),
    noEscape: z.boolean().default(false),
    helpers: z.record(z.function()).default({}),
    partials: z.record(z.string()).default({}),
    data: z.any().optional(),
  }).default({}),
})

// Template validation result
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    type: z.enum(['syntax', 'variable', 'helper', 'partial']),
    message: z.string(),
    line: z.number().optional(),
    column: z.number().optional(),
    severity: z.enum(['error', 'warning', 'info']),
  })).default([]),
  warnings: z.array(z.string()).default([]),
  requiredVariables: z.array(z.string()).default([]),
  optionalVariables: z.array(z.string()).default([]),
})

// Default template configurations
export const DEFAULT_TEMPLATES = {
  standard: {
    id: 'standard',
    name: 'Standard Report',
    description: 'General purpose space weather report for broad audience',
    category: 'standard' as const,
    outputFormat: 'both' as const,
    isDefault: true,
    requiredVariables: ['combinedHeadline', 'executiveSummary', 'forecast72h'],
    optionalVariables: ['generatedAt', 'sources', 'riskAssessment', 'recommendations', 'solarActivity', 'geomagneticActivity', 'radiationEnvironment'],
  },
  technical: {
    id: 'technical',
    name: 'Technical Report',
    description: 'Detailed technical report for specialists and researchers',
    category: 'technical' as const,
    outputFormat: 'both' as const,
    requiredVariables: ['generatedAt', 'combinedHeadline', 'sources'],
    optionalVariables: ['solarActivity', 'geomagneticActivity', 'radiationEnvironment'],
  },
  executive: {
    id: 'executive',
    name: 'Executive Summary',
    description: 'Concise executive summary for decision makers',
    category: 'executive' as const,
    outputFormat: 'both' as const,
    requiredVariables: ['generatedAt', 'combinedHeadline', 'executiveSummary'],
    optionalVariables: ['riskAssessment', 'recommendations'],
  },
  alert: {
    id: 'alert',
    name: 'Alert Notice',
    description: 'Emergency alert for significant space weather events',
    category: 'alert' as const,
    outputFormat: 'both' as const,
    requiredVariables: ['generatedAt', 'combinedHeadline', 'riskAssessment'],
    optionalVariables: ['recommendations', 'forecast72h'],
  },
} as const

// Export TypeScript types
export type TemplateVariables = z.infer<typeof TemplateVariablesSchema>
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>
export type CompiledTemplate = z.infer<typeof CompiledTemplateSchema>
export type RenderContext = z.infer<typeof RenderContextSchema>
export type ValidationResult = z.infer<typeof ValidationResultSchema>
export type DefaultTemplateKeys = keyof typeof DEFAULT_TEMPLATES