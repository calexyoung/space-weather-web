export const customReportTemplate = {
  id: 'custom',
  name: 'Custom Template',
  description: 'User-defined template with custom format and prompts',
  
  // Default template structure that users can modify
  defaultTemplate: `# {{title}}
## {{subtitle}}

{{content}}

---
*Generated: {{generatedAt}}*`,
  
  // Configuration for custom templates
  config: {
    allowMarkdown: true,
    allowHtml: true,
    allowVariables: true,
    maxLength: 50000,
    
    // Available variables that users can use
    availableVariables: [
      // Time variables
      'date',
      'time',
      'generatedAt',
      'issuedAt',
      
      // Solar activity
      'solarActivity',
      'flareCount',
      'flareList',
      'sunspotNumber',
      'activeRegions',
      'solarWind',
      'solarWindSpeed',
      'solarWindDensity',
      'imfBz',
      
      // Geomagnetic
      'kpIndex',
      'apIndex',
      'dstIndex',
      'geomagneticStatus',
      'stormLevel',
      
      // Space weather scales
      'radioBlackoutLevel',
      'solarRadiationLevel',
      'geomagneticStormLevel',
      
      // Forecasts
      'forecast24h',
      'forecast48h',
      'forecast72h',
      'auroraForecast',
      
      // Impacts
      'satelliteImpacts',
      'aviationImpacts',
      'powerGridImpacts',
      'radioImpacts',
      'gpsImpacts',
      
      // Data sources
      'dataSources',
      'dataQuality',
      'confidence',
      
      // Custom fields
      'customField1',
      'customField2',
      'customField3',
      'customField4',
      'customField5'
    ],
    
    // Helper functions available in templates
    helpers: [
      'formatDate',
      'formatTime',
      'formatNumber',
      'uppercase',
      'lowercase',
      'capitalize',
      'truncate',
      'conditional'
    ]
  },
  
  // Method to validate custom template
  validateTemplate: (template: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Check for balanced brackets
    const openBrackets = (template.match(/{{/g) || []).length
    const closeBrackets = (template.match(/}}/g) || []).length
    if (openBrackets !== closeBrackets) {
      errors.push('Unbalanced template brackets')
    }
    
    // Check for valid variable names
    const variablePattern = /{{(\w+)}}/g
    const matches = template.matchAll(variablePattern)
    for (const match of matches) {
      const varName = match[1]
      if (!customReportTemplate.config.availableVariables.includes(varName) && 
          !varName.startsWith('custom')) {
        errors.push(`Unknown variable: ${varName}`)
      }
    }
    
    // Check length
    if (template.length > customReportTemplate.config.maxLength) {
      errors.push(`Template exceeds maximum length of ${customReportTemplate.config.maxLength} characters`)
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  },
  
  // Method to create a custom template configuration
  createCustomTemplate: (params: {
    name: string
    description?: string
    template: string
    prompt?: string
    requiredFields?: string[]
    format?: 'markdown' | 'html' | 'text'
  }) => {
    const validation = customReportTemplate.validateTemplate(params.template)
    
    if (!validation.valid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`)
    }
    
    return {
      id: `custom-${Date.now()}`,
      name: params.name,
      description: params.description || 'Custom template',
      template: params.template,
      prompt: params.prompt || 'Generate content based on the custom template provided',
      requiredFields: params.requiredFields || [],
      format: params.format || 'markdown',
      createdAt: new Date().toISOString()
    }
  },
  
  // Example custom templates that users might create
  examples: {
    aviation: {
      name: 'Aviation Weather Brief',
      template: `SPACE WEATHER AVIATION BRIEF
Valid: {{validFrom}} - {{validTo}} UTC

SOLAR RADIATION: {{solarRadiationLevel}}
- Flight Level Impact: {{flightLevelImpact}}
- Polar Route Status: {{polarRouteStatus}}

HF RADIO: {{hfRadioStatus}}
- Affected Frequencies: {{affectedFrequencies}}
- Alternative Comms: {{alternativeComms}}

GNSS/GPS: {{gnssStatus}}
- Accuracy Degradation: {{accuracyDegradation}}
- RAIM Availability: {{raimAvailability}}

RECOMMENDATIONS:
{{aviationRecommendations}}`,
      prompt: 'Generate an aviation-specific space weather brief focusing on flight operations impacts'
    },
    
    maritime: {
      name: 'Maritime Operations',
      template: `MARITIME SPACE WEATHER ADVISORY
Date: {{date}}

HF PROPAGATION: {{hfPropagation}}
GPS ACCURACY: {{gpsAccuracy}}
MAGNETIC COMPASS: {{compassDeviation}}

SEA STATE CORRELATION: {{seaStateCorrelation}}

VOYAGE PLANNING:
{{voyagePlanning}}`,
      prompt: 'Create a maritime-focused report emphasizing navigation and communication impacts'
    }
  }
}

export default customReportTemplate