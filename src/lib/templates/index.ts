// Export all template system components
export { templateService, TemplateService, TemplateCache } from './service'
export { templateHelpers, dateHelpers, numberHelpers, spaceWeatherHelpers, textHelpers, conditionalHelpers } from './helpers'
export {
  TemplateVariablesSchema,
  TemplateConfigSchema,
  CompiledTemplateSchema,
  RenderContextSchema,
  ValidationResultSchema,
  DEFAULT_TEMPLATES,
  type TemplateVariables,
  type TemplateConfig,
  type CompiledTemplate,
  type RenderContext,
  type ValidationResult,
  type DefaultTemplateKeys,
} from './schemas'

// Template loading utilities
import { readFile } from 'fs/promises'
import { join } from 'path'
import { TemplateConfig, DEFAULT_TEMPLATES } from './schemas'

/**
 * Load a default template by name
 */
export async function loadDefaultTemplate(templateName: string): Promise<TemplateConfig | null> {
  try {
    const templatesDir = join(process.cwd(), 'src/lib/templates/defaults')
    
    // Load markdown template
    const markdownPath = join(templatesDir, `${templateName}.md.hbs`)
    const markdownContent = await readFile(markdownPath, 'utf-8')
    
    // Try to load HTML template (optional)
    let htmlContent = ''
    try {
      const htmlPath = join(templatesDir, `${templateName}.html.hbs`)
      htmlContent = await readFile(htmlPath, 'utf-8')
    } catch {
      // HTML template not found, which is OK
    }

    // Get default config if available
    const defaultConfig = DEFAULT_TEMPLATES[templateName as keyof typeof DEFAULT_TEMPLATES]
    if (!defaultConfig) {
      throw new Error(`Unknown default template: ${templateName}`)
    }

    return {
      ...defaultConfig,
      version: '1.0.0',
      outputFormat: 'both' as const,
      isActive: true,
      author: 'System',
      tags: [defaultConfig.category],
      markdownTemplate: markdownContent,
      htmlTemplate: htmlContent,
      cssClasses: {},
      customHelpers: [],
      validationRules: [],
    }

  } catch (error) {
    console.error(`Failed to load default template ${templateName}:`, error)
    return null
  }
}

/**
 * Get all available default template names
 */
export function getDefaultTemplateNames(): string[] {
  return Object.keys(DEFAULT_TEMPLATES)
}

/**
 * Create a sample data object for testing templates
 */
export function createSampleTemplateData() {
  return {
    generatedAt: new Date(),
    sources: [
      {
        id: 'sample-noaa',
        source: 'NOAA_SWPC' as const,
        sourceUrl: 'https://www.swpc.noaa.gov',
        issuedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        fetchedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        headline: 'Space Weather Conditions Quiet',
        summary: 'Solar and geomagnetic activity levels are low. No significant space weather impacts expected.',
        details: 'Current solar wind parameters are within normal ranges. The interplanetary magnetic field is stable.',
        confidence: 'High',
        validStart: new Date(),
        validEnd: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        geomagneticLevel: 'G1' as const,
        geomagneticText: 'Minor geomagnetic disturbances possible',
        qualityScore: 0.92,
      },
      {
        id: 'sample-ukmo',
        source: 'UK_MET_OFFICE' as const,
        sourceUrl: 'https://www.metoffice.gov.uk/weather/specialist-forecasts/space-weather',
        issuedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        fetchedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
        headline: 'Quiet Conditions Expected to Continue',
        summary: 'Space weather activity remains at baseline levels with no significant events anticipated.',
        details: 'Solar activity is low with few active regions visible. Aurora activity is minimal.',
        confidence: 'Moderate',
        validStart: new Date(),
        validEnd: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        radioBlackoutLevel: 'R1' as const,
        radioBlackoutText: 'Minor HF radio communication impacts possible',
        qualityScore: 0.88,
      }
    ],
    combinedHeadline: 'Space Weather Conditions Remain Quiet with Minor Activity Possible',
    executiveSummary: 'Current space weather conditions are characterized by low solar activity and stable geomagnetic conditions. Minor disturbances are possible but no significant impacts to infrastructure or operations are expected.',
    solarActivity: 'Solar activity is at low levels with minimal flare activity observed. Solar wind parameters are within normal ranges.',
    geomagneticActivity: 'Geomagnetic activity is quiet to unsettled. The planetary K-index is expected to remain below 4.',
    radiationEnvironment: 'The solar energetic particle environment is at background levels with no enhancements expected.',
    forecast72h: 'Space weather conditions are expected to remain quiet through the 72-hour forecast period. A weak coronal hole high-speed stream may cause minor geomagnetic activity mid-period, but significant disturbances are not anticipated.',
    riskAssessment: {
      overall: 'low',
      geomagnetic: 'Low risk of geomagnetic impacts to infrastructure. Minor voltage corrections may be needed.',
      radioBlackout: 'Minimal risk to HF radio communications. Normal propagation conditions expected.',
      radiationStorm: 'No enhanced radiation risk to aviation or satellite operations.',
    },
    recommendations: [
      'Continue routine monitoring of space weather conditions',
      'No special precautions required for satellite operations',
      'HF radio users should experience normal propagation conditions',
      'Power grid operators can maintain standard operational procedures'
    ],
    llmProvider: 'OPENAI' as const,
    llmModel: 'gpt-4',
    generationTime: 2340, // milliseconds
    confidenceScore: 0.89,
  }
}

/**
 * Validate template variables against schema
 */
export function validateTemplateVariables(data: any): { isValid: boolean; errors: string[] } {
  try {
    TemplateVariablesSchema.parse(data)
    return { isValid: true, errors: [] }
  } catch (error) {
    if (error instanceof Error && 'errors' in error) {
      const zodError = error as any
      return {
        isValid: false,
        errors: zodError.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      }
    }
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error']
    }
  }
}

/**
 * Template system health check
 */
export function getTemplateSystemHealth() {
  const stats = templateService.getCacheStats()
  
  return {
    service: 'Template Service',
    status: 'healthy',
    cache: {
      size: stats.size,
      maxSize: stats.maxSize,
      utilization: `${Math.round((stats.size / stats.maxSize) * 100)}%`
    },
    defaultTemplates: getDefaultTemplateNames().length,
    helpersRegistered: Object.keys(templateHelpers).length,
    lastChecked: new Date().toISOString()
  }
}