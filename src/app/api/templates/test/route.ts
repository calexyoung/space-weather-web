import { NextRequest, NextResponse } from 'next/server'
import { templateService } from '@/lib/templates/service'
import { loadDefaultTemplate, createSampleTemplateData } from '@/lib/templates'

// GET /api/templates/test - Test the template system with sample data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateName = searchParams.get('template') || 'standard'
    const format = searchParams.get('format') || 'markdown'

    // Load the default template
    const template = await loadDefaultTemplate(templateName)
    
    if (!template) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Template '${templateName}' not found`,
          availableTemplates: ['standard', 'technical', 'executive', 'alert']
        },
        { status: 404 }
      )
    }

    // Create sample data
    const sampleData = createSampleTemplateData()

    // Test the template
    const testResult = templateService.testTemplate(template, sampleData)

    if (!testResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Template test failed',
        details: {
          errors: testResult.errors,
          warnings: testResult.warnings
        }
      }, { status: 400 })
    }

    const output = format === 'html' ? testResult.html : testResult.markdown

    return NextResponse.json({
      success: true,
      data: {
        template: {
          name: template.name,
          description: template.description,
          category: template.category,
          format: format
        },
        output: output,
        warnings: testResult.warnings,
        sampleDataUsed: sampleData
      }
    })

  } catch (error) {
    console.error('Template test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Template test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/templates/test - Test a custom template with provided data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { template, data, format = 'markdown' } = body

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template content is required' },
        { status: 400 }
      )
    }

    // Create a temporary template config
    const tempConfig = {
      id: 'temp-test',
      name: 'Test Template',
      description: 'Custom template for testing',
      version: '1.0.0',
      category: 'custom' as const,
      outputFormat: 'both' as const,
      isDefault: false,
      isActive: true,
      author: 'Test',
      tags: ['test'],
      requiredVariables: [],
      optionalVariables: [],
      markdownTemplate: format === 'markdown' ? template : '',
      htmlTemplate: format === 'html' ? template : '',
      cssClasses: {},
      customHelpers: [],
      validationRules: [],
    }

    // Use provided data or sample data (but ensure it includes all required fields)
    let testData = data || createSampleTemplateData()
    
    // If data was provided, merge it with sample data to ensure all required fields are present
    if (data) {
      const sampleData = createSampleTemplateData()
      testData = { ...sampleData, ...data }
    }

    // Test the template
    const testResult = templateService.testTemplate(tempConfig, testData)

    if (!testResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Template test failed',
        details: {
          errors: testResult.errors,
          warnings: testResult.warnings
        }
      }, { status: 400 })
    }

    const output = format === 'html' ? testResult.html : testResult.markdown

    return NextResponse.json({
      success: true,
      data: {
        output: output,
        warnings: testResult.warnings,
        dataUsed: testData
      }
    })

  } catch (error) {
    console.error('Custom template test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Custom template test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}