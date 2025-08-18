import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getLlmService } from '@/lib/llm/service'
import { createApiResponse, createApiError } from '@/lib/validators'
import { LlmProvider } from '@/lib/types/space-weather'
import { db } from '@/lib/db'

// Request schema
const ComposeReportRequestSchema = z.object({
  reportIds: z.array(z.string()).min(1, 'At least one report ID is required'),
  customInstructions: z.string().optional(),
  provider: LlmProvider.optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  saveToDatabase: z.boolean().default(true),
  templateId: z.string().optional(),
  outputFormat: z.enum(['markdown', 'html', 'both']).default('both'),
})

// Response schema
const ComposeReportResponseSchema = z.object({
  composedReportId: z.string().optional(),
  markdownContent: z.string(),
  htmlContent: z.string(),
  metadata: z.object({
    title: z.string(),
    sections: z.array(z.string()),
    wordCount: z.number(),
    composedAt: z.string(),
    sourceReports: z.array(z.string()),
    llmProvider: z.string(),
    llmModel: z.string(),
  }),
  processingTime: z.number(),
  sourceReportsCount: z.number(),
})

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const validatedRequest = ComposeReportRequestSchema.parse(body)

    // Fetch source reports from database
    const sourceReports = await db.spaceWeatherReport.findMany({
      where: {
        id: { in: validatedRequest.reportIds },
      },
      include: {
        sources: true,
      },
      orderBy: {
        generatedAt: 'desc',
      },
    })

    if (sourceReports.length === 0) {
      return NextResponse.json(
        createApiError('No reports found with the provided IDs', 'NO_REPORTS_FOUND'),
        { status: 404 }
      )
    }

    if (sourceReports.length !== validatedRequest.reportIds.length) {
      console.warn(
        `Only found ${sourceReports.length} reports out of ${validatedRequest.reportIds.length} requested`
      )
    }

    // Initialize LLM service
    const llmService = getLlmService(validatedRequest.provider, {
      model: validatedRequest.model,
      temperature: validatedRequest.temperature,
      streaming: false,
    })

    // Prepare composition prompt
    const compositionPrompt = createCompositionPrompt(
      sourceReports,
      validatedRequest.customInstructions
    )

    // Generate composed report using the LLM service
    // Note: We'll use the chat functionality since composition is essentially a chat operation
    const chatResponse = await llmService.chatWithAssistant(compositionPrompt)

    if (!chatResponse.content) {
      throw new Error('Failed to generate composed report content')
    }

    const processingTime = Date.now() - startTime

    // Parse the generated content
    const { markdownContent, metadata } = parseComposedContent(
      chatResponse.content,
      sourceReports
    )

    // Convert markdown to HTML if needed
    let htmlContent = ''
    if (validatedRequest.outputFormat === 'html' || validatedRequest.outputFormat === 'both') {
      htmlContent = await convertMarkdownToHtml(markdownContent)
    }

    // Save composed report to database if requested
    let composedReportId: string | undefined
    
    if (validatedRequest.saveToDatabase) {
      try {
        const savedReport = await db.spaceWeatherReport.create({
          data: {
            combinedHeadline: metadata.title,
            executiveSummary: extractExecutiveSummary(markdownContent),
            outlookNext72h: extractOutlook(markdownContent),
            markdownContent,
            htmlContent: htmlContent || markdownContent,
            jsonMetadata: {
              ...metadata,
              sourceReportIds: validatedRequest.reportIds,
              composedFrom: sourceReports.length,
              processingTime,
            },
            llmProvider: validatedRequest.provider || 'OPENAI',
            llmModel: validatedRequest.model || 'gpt-4',
            generationTime: processingTime,
          },
        })
        composedReportId = savedReport.id

        // Link to source reports (if we have a junction table)
        // This would require a proper schema relationship
        
      } catch (dbError) {
        console.error('Failed to save composed report to database:', dbError)
        // Continue without saving - don't fail the request
      }
    }

    // Prepare response
    const responseData = {
      composedReportId,
      markdownContent,
      htmlContent: htmlContent || markdownContent,
      metadata: {
        ...metadata,
        llmProvider: validatedRequest.provider || 'OPENAI',
        llmModel: validatedRequest.model || 'gpt-4',
      },
      processingTime,
      sourceReportsCount: sourceReports.length,
    }

    const validatedResponse = ComposeReportResponseSchema.parse(responseData)

    return NextResponse.json(createApiResponse(true, validatedResponse))

  } catch (error) {
    console.error('Compose report API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiError(
          'Invalid request data',
          'VALIDATION_ERROR',
          error.issues
        ),
        { status: 400 }
      )
    }

    return NextResponse.json(
      createApiError(
        error instanceof Error ? error.message : 'Internal server error',
        'COMPOSITION_ERROR'
      ),
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Get recent composed reports
    const reports = await db.spaceWeatherReport.findMany({
      where: {
        // Filter for composed reports (those with multiple source reports)
        jsonMetadata: {
          path: ['sourceReportIds'],
          array_contains: [],
        },
      },
      skip,
      take: limit,
      orderBy: {
        generatedAt: 'desc',
      },
      select: {
        id: true,
        combinedHeadline: true,
        executiveSummary: true,
        generatedAt: true,
        llmProvider: true,
        llmModel: true,
        generationTime: true,
        jsonMetadata: true,
      },
    })

    const total = await db.spaceWeatherReport.count({
      where: {
        jsonMetadata: {
          path: ['sourceReportIds'],
          array_contains: [],
        },
      },
    })

    return NextResponse.json(createApiResponse(true, {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }))

  } catch (error) {
    console.error('Get composed reports API error:', error)
    return NextResponse.json(
      createApiError(
        error instanceof Error ? error.message : 'Internal server error',
        'FETCH_ERROR'
      ),
      { status: 500 }
    )
  }
}

// Helper functions
function createCompositionPrompt(sourceReports: any[], customInstructions?: string): string {
  const currentDate = new Date().toLocaleDateString()
  
  return `You are a space weather analyst tasked with composing a comprehensive report from multiple existing reports. Please analyze and synthesize the information from the following ${sourceReports.length} source reports:

${sourceReports.map((report, index) => `
## Source Report ${index + 1} (Generated: ${new Date(report.generatedAt).toLocaleDateString()})
**Headline:** ${report.combinedHeadline}
**Summary:** ${report.executiveSummary}
**Outlook:** ${report.outlookNext72h}

**Full Content:**
${report.markdownContent.substring(0, 1000)}${report.markdownContent.length > 1000 ? '...' : ''}
`).join('\n')}

${customInstructions ? `**Special Instructions:** ${customInstructions}\n` : ''}

Please create a unified, comprehensive space weather report that:

1. **Synthesizes Information**: Combine insights from all source reports, resolving any conflicts or contradictions
2. **Updates Timeline**: Provide the most current assessment based on the latest data
3. **Maintains Accuracy**: Preserve important technical details and specific measurements
4. **Enhances Clarity**: Improve readability while maintaining scientific rigor

Structure your response as a complete markdown report with:

# Space Weather Composite Report - ${currentDate}

## Executive Summary
[Unified overview incorporating key findings from all sources]

## Current Conditions Analysis
[Synthesized current space weather state]

## Trend Analysis
[Analysis of changes and developments across the source reports]

## 72-Hour Outlook
[Consolidated forecast incorporating all available predictions]

## Risk Assessment
[Comprehensive risk evaluation for all sectors]

## Recommendations
[Unified operational guidance]

---
*Composite report generated from ${sourceReports.length} source reports*

Ensure the final report is coherent, comprehensive, and provides more value than the individual source reports alone.`
}

function parseComposedContent(content: string, sourceReports: any[]): { 
  markdownContent: string; 
  metadata: any 
} {
  const lines = content.split('\n')
  const metadata = {
    title: lines.find(line => line.startsWith('# '))?.replace('# ', '') || 'Space Weather Composite Report',
    sections: lines.filter(line => line.startsWith('## ')).map(line => line.replace('## ', '')),
    wordCount: content.split(/\s+/).length,
    composedAt: new Date().toISOString(),
    sourceReports: sourceReports.map(r => r.id),
  }

  return {
    markdownContent: content,
    metadata
  }
}

function extractExecutiveSummary(content: string): string {
  const lines = content.split('\n')
  const summaryStart = lines.findIndex(line => 
    line.toLowerCase().includes('executive summary') || 
    line.toLowerCase().includes('summary')
  )
  
  if (summaryStart === -1) return 'Generated composite space weather report'
  
  const summaryEnd = lines.findIndex((line, index) => 
    index > summaryStart && line.startsWith('##')
  )
  
  const summaryLines = lines.slice(
    summaryStart + 1, 
    summaryEnd === -1 ? summaryStart + 5 : summaryEnd
  )
  
  return summaryLines.join(' ').trim() || 'Generated composite space weather report'
}

function extractOutlook(content: string): string {
  const lines = content.split('\n')
  const outlookStart = lines.findIndex(line => 
    line.toLowerCase().includes('outlook') || 
    line.toLowerCase().includes('forecast')
  )
  
  if (outlookStart === -1) return 'No specific outlook available'
  
  const outlookEnd = lines.findIndex((line, index) => 
    index > outlookStart && line.startsWith('##')
  )
  
  const outlookLines = lines.slice(
    outlookStart + 1, 
    outlookEnd === -1 ? outlookStart + 5 : outlookEnd
  )
  
  return outlookLines.join(' ').trim() || 'No specific outlook available'
}

async function convertMarkdownToHtml(markdown: string): Promise<string> {
  // Simple markdown to HTML conversion
  // In production, use a proper markdown parser like 'marked' or 'remark'
  const html = markdown
    .replace(/^# (.+$)/gm, '<h1>$1</h1>')
    .replace(/^## (.+$)/gm, '<h2>$1</h2>')
    .replace(/^### (.+$)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\- (.+$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h123]|<li|<\/p|<p)/gm, '<p>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')

  return `<div class="composed-space-weather-report">${html}</div>`
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}