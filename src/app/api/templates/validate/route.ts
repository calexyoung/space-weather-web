import { NextRequest, NextResponse } from 'next/server'
import { templateService } from '@/lib/templates/service'
import { TemplateConfigSchema } from '@/lib/templates/schemas'
import { z } from 'zod'

const ValidateRequestSchema = z.object({
  template: z.string().min(1, 'Template content is required'),
  requiredVariables: z.array(z.string()).default([]),
  testData: z.any().optional(),
  format: z.enum(['markdown', 'html']).default('markdown'),
})

// POST /api/templates/validate - Validate template syntax and optionally test render
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { template, requiredVariables, testData, format } = ValidateRequestSchema.parse(body)

    // Validate template syntax
    const validation = templateService.validateTemplate(template, requiredVariables)

    const response: any = {
      success: true,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        requiredVariables: validation.requiredVariables,
        optionalVariables: validation.optionalVariables,
      }
    }

    // If template is valid and test data provided, attempt to render
    if (validation.isValid && testData) {
      try {
        // Create a temporary template config for testing
        const tempConfig = TemplateConfigSchema.parse({
          id: 'temp-validation',
          name: 'Validation Test',
          category: 'custom',
          outputFormat: 'both',
          requiredVariables,
          markdownTemplate: format === 'markdown' ? template : '',
          htmlTemplate: format === 'html' ? template : '',
        })

        // Test the template
        const testResult = templateService.testTemplate(tempConfig, testData)
        
        response.testResult = {
          success: testResult.success,
          output: format === 'html' ? testResult.html : testResult.markdown,
          errors: testResult.errors,
          warnings: testResult.warnings,
        }

      } catch (renderError) {
        response.testResult = {
          success: false,
          errors: [renderError instanceof Error ? renderError.message : 'Render test failed'],
          warnings: [],
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Template validation failed:', error)
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Template validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/templates/validate/helpers - Get available template helpers
export async function GET() {
  try {
    const helpers = {
      // Date helpers
      date: {
        formatDate: {
          description: 'Format date with custom format string',
          usage: '{{formatDate timestamp "yyyy-MM-dd HH:mm:ss UTC"}}',
          parameters: ['timestamp: Date|string', 'format: string (optional)']
        },
        formatDateRelative: {
          description: 'Format date relative to now (e.g., "2 hours ago")',
          usage: '{{formatDateRelative timestamp}}',
          parameters: ['timestamp: Date|string']
        },
        formatISODate: {
          description: 'Format date as ISO string',
          usage: '{{formatISODate timestamp}}',
          parameters: ['timestamp: Date|string']
        }
      },

      // Number helpers
      number: {
        formatNumber: {
          description: 'Format number with specified decimal places',
          usage: '{{formatNumber value 2}}',
          parameters: ['value: number', 'decimals: number (optional, default: 2)']
        },
        formatScientific: {
          description: 'Format number in scientific notation',
          usage: '{{formatScientific value 3}}',
          parameters: ['value: number', 'precision: number (optional, default: 2)']
        },
        formatPercentage: {
          description: 'Format number as percentage',
          usage: '{{formatPercentage value 1}}',
          parameters: ['value: number (0-1)', 'decimals: number (optional, default: 1)']
        }
      },

      // Space weather helpers
      spaceWeather: {
        hazardLevel: {
          description: 'Format hazard level with description',
          usage: '{{hazardLevel level}}',
          parameters: ['level: HazardLevel (G1-G5, R1-R5, S1-S5)'],
          example: 'G3 (Strong)'
        },
        hazardColor: {
          description: 'Get color for hazard level',
          usage: '{{hazardColor level}}',
          parameters: ['level: HazardLevel'],
          example: 'orange'
        },
        hazardSeverity: {
          description: 'Get numeric severity (1-5) for hazard level',
          usage: '{{hazardSeverity level}}',
          parameters: ['level: HazardLevel'],
          example: '3'
        },
        sourceIcon: {
          description: 'Get emoji icon for data source',
          usage: '{{sourceIcon source}}',
          parameters: ['source: SourceType'],
          example: '🌎'
        },
        confidenceBar: {
          description: 'Create visual confidence bar',
          usage: '{{confidenceBar score}}',
          parameters: ['score: number (0-1)'],
          example: '████████░░ 80%'
        },
        riskIcon: {
          description: 'Get emoji icon for risk level',
          usage: '{{riskIcon level}}',
          parameters: ['level: string (low, moderate, high, severe, extreme)'],
          example: '🟠'
        }
      },

      // Text helpers
      text: {
        capitalize: {
          description: 'Capitalize first letter',
          usage: '{{capitalize text}}',
          parameters: ['text: string']
        },
        uppercase: {
          description: 'Convert to uppercase',
          usage: '{{uppercase text}}',
          parameters: ['text: string']
        },
        lowercase: {
          description: 'Convert to lowercase',
          usage: '{{lowercase text}}',
          parameters: ['text: string']
        },
        truncate: {
          description: 'Truncate text to specified length',
          usage: '{{truncate text 100 "..."}}',
          parameters: ['text: string', 'length: number (default: 100)', 'suffix: string (default: "...")']
        },
        markdown: {
          description: 'Convert basic markdown to HTML',
          usage: '{{markdown text}}',
          parameters: ['text: string']
        }
      },

      // Conditional helpers
      conditional: {
        eq: {
          description: 'Test equality',
          usage: '{{#if (eq a b)}}equal{{/if}}',
          parameters: ['a: any', 'b: any']
        },
        gt: {
          description: 'Test greater than',
          usage: '{{#if (gt value 10)}}greater{{/if}}',
          parameters: ['a: number', 'b: number']
        },
        and: {
          description: 'Logical AND',
          usage: '{{#if (and condition1 condition2)}}both true{{/if}}',
          parameters: ['...conditions: any[]']
        },
        or: {
          description: 'Logical OR',
          usage: '{{#if (or condition1 condition2)}}at least one true{{/if}}',
          parameters: ['...conditions: any[]']
        },
        ifCond: {
          description: 'Complex conditional with operators',
          usage: '{{#ifCond value1 ">" value2}}greater{{else}}not greater{{/ifCond}}',
          parameters: ['v1: any', 'operator: string', 'v2: any'],
          operators: ['==', '===', '!=', '!==', '<', '<=', '>', '>=', '&&', '||']
        }
      },

      // Array helpers
      array: {
        length: {
          description: 'Get array length',
          usage: '{{length array}}',
          parameters: ['array: any[]']
        },
        first: {
          description: 'Get first element',
          usage: '{{first array}}',
          parameters: ['array: any[]']
        },
        last: {
          description: 'Get last element',
          usage: '{{last array}}',
          parameters: ['array: any[]']
        },
        join: {
          description: 'Join array elements',
          usage: '{{join array ", "}}',
          parameters: ['array: any[]', 'separator: string (default: ", ")']
        }
      },

      // Utility helpers
      utility: {
        default: {
          description: 'Provide default value if empty',
          usage: '{{default value "N/A"}}',
          parameters: ['value: any', 'defaultValue: any']
        },
        json: {
          description: 'Convert to JSON string',
          usage: '{{json object 2}}',
          parameters: ['object: any', 'indent: number (default: 2)']
        },
        debug: {
          description: 'Debug helper - logs value to console',
          usage: '{{debug value}}',
          parameters: ['value: any']
        }
      }
    }

    // Get template variable examples
    const exampleVariables = {
      generatedAt: new Date().toISOString(),
      sources: [
        {
          source: 'NOAA_SWPC',
          headline: 'Space weather conditions are quiet',
          summary: 'No significant activity observed',
          geomagneticLevel: 'G1',
          qualityScore: 0.85
        }
      ],
      combinedHeadline: 'Quiet Space Weather Conditions Continue',
      executiveSummary: 'Space weather activity remains at baseline levels with no significant disturbances expected.',
      forecast72h: 'Conditions are expected to remain quiet through the forecast period.',
      riskAssessment: {
        overall: 'low',
        geomagnetic: 'Minimal risk to infrastructure',
        radioBlackout: 'HF communications normal',
        radiationStorm: 'No enhanced radiation expected'
      },
      recommendations: [
        'Continue routine monitoring',
        'No special precautions required'
      ]
    }

    return NextResponse.json({
      success: true,
      data: {
        helpers,
        exampleVariables,
        partials: [
          'header - Standard report header',
          'sourceSummary - Data sources overview',
          'riskAssessment - Risk assessment section',
          'footer - Standard report footer'
        ]
      }
    })

  } catch (error) {
    console.error('Failed to get template helpers:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get template helpers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}