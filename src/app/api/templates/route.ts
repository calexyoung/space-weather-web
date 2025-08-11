import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { templateService } from '@/lib/templates/service'
import { TemplateConfigSchema, DEFAULT_TEMPLATES } from '@/lib/templates/schemas'
import { ReportTemplateSchema } from '@/lib/types/space-weather'
import { readFile } from 'fs/promises'
import { join } from 'path'

// GET /api/templates - List all available templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeDefault = searchParams.get('includeDefault') === 'true'
    const category = searchParams.get('category')
    const isActive = searchParams.get('active')

    // Get templates from database
    const dbTemplates = await db.reportTemplate.findMany({
      where: {
        ...(category && { name: { contains: category, mode: 'insensitive' } }),
        ...(isActive !== null && { isDefault: isActive === 'true' }),
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ],
    })

    // Convert database templates to our format
    const templates = dbTemplates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description || '',
      version: '1.0.0',
      category: 'custom' as const,
      outputFormat: 'both' as const,
      isDefault: template.isDefault,
      isActive: true,
      author: 'System',
      tags: [],
      requiredVariables: [],
      optionalVariables: [],
      markdownTemplate: template.markdownTemplate,
      htmlTemplate: template.htmlTemplate,
      cssClasses: {},
      customHelpers: [],
      validationRules: [],
    }))

    // Add default templates if requested
    if (includeDefault) {
      const defaultTemplates = await Promise.all(
        Object.entries(DEFAULT_TEMPLATES).map(async ([key, config]) => {
          try {
            const templatesDir = join(process.cwd(), 'src/lib/templates/defaults')
            const markdownContent = await readFile(join(templatesDir, `${key}.md.hbs`), 'utf-8')
            
            let htmlContent = ''
            try {
              htmlContent = await readFile(join(templatesDir, `${key}.html.hbs`), 'utf-8')
            } catch {
              // HTML template not found, that's OK
            }

            return {
              ...config,
              version: '1.0.0',
              isActive: true,
              author: 'System',
              tags: [config.category],
              markdownTemplate: markdownContent,
              htmlTemplate: htmlContent,
              cssClasses: {},
              customHelpers: [],
              validationRules: [],
            }
          } catch (error) {
            console.error(`Failed to load default template ${key}:`, error)
            return null
          }
        })
      )

      templates.unshift(...defaultTemplates.filter(Boolean) as any[])
    }

    return NextResponse.json({
      success: true,
      data: {
        templates,
        count: templates.length,
        categories: [...new Set(templates.map(t => t.category))],
      }
    })

  } catch (error) {
    console.error('Failed to fetch templates:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request body
    const templateData = TemplateConfigSchema.parse(body)

    // Validate the template syntax
    const validation = templateService.validateTemplate(
      templateData.markdownTemplate,
      templateData.requiredVariables
    )

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template validation failed',
          details: {
            errors: validation.errors,
            warnings: validation.warnings
          }
        },
        { status: 400 }
      )
    }

    // Create the template in database
    const template = await db.reportTemplate.create({
      data: {
        name: templateData.name,
        description: templateData.description,
        isDefault: templateData.isDefault,
        markdownTemplate: templateData.markdownTemplate,
        htmlTemplate: templateData.htmlTemplate || '',
        variablesSchema: {
          required: templateData.requiredVariables,
          optional: templateData.optionalVariables,
          validation: templateData.validationRules
        }
      }
    })

    // Test the template compilation
    try {
      const compiled = templateService.compileTemplate(templateData)
      if (!compiled.isValid) {
        // Template created but has compilation warnings
        return NextResponse.json({
          success: true,
          data: template,
          warnings: compiled.warnings
        })
      }
    } catch (compilationError) {
      console.warn('Template created but compilation failed:', compilationError)
    }

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create template:', error)
    
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Template name already exists',
          details: 'Please choose a different template name'
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/templates - Update existing template (requires ID in body)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Check if template exists
    const existingTemplate = await db.reportTemplate.findUnique({
      where: { id: body.id }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    // Validate the updated template data
    const templateData = TemplateConfigSchema.parse(body)

    // Validate template syntax
    const validation = templateService.validateTemplate(
      templateData.markdownTemplate,
      templateData.requiredVariables
    )

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template validation failed',
          details: {
            errors: validation.errors,
            warnings: validation.warnings
          }
        },
        { status: 400 }
      )
    }

    // Update the template
    const updatedTemplate = await db.reportTemplate.update({
      where: { id: body.id },
      data: {
        name: templateData.name,
        description: templateData.description,
        isDefault: templateData.isDefault,
        markdownTemplate: templateData.markdownTemplate,
        htmlTemplate: templateData.htmlTemplate || '',
        variablesSchema: {
          required: templateData.requiredVariables,
          optional: templateData.optionalVariables,
          validation: templateData.validationRules
        }
      }
    })

    // Clear template cache for this template
    templateService.clearCache()

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully'
    })

  } catch (error) {
    console.error('Failed to update template:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/templates - Delete template (requires ID in query params)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Check if template exists and is not default
    const template = await db.reportTemplate.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    if (template.isDefault) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete default template' },
        { status: 403 }
      )
    }

    // Delete the template
    await db.reportTemplate.delete({
      where: { id: templateId }
    })

    // Clear template cache
    templateService.clearCache()

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete template:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}