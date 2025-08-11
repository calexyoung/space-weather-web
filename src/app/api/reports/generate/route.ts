import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getLlmService } from '@/lib/llm/service'
import { createApiResponse, createApiError } from '@/lib/validators'
import { LlmProvider, SourceType } from '@/lib/types/space-weather'
import { db } from '@/lib/db'

// Request schema
const GenerateReportRequestSchema = z.object({
  sources: z.array(SourceType).min(1, 'At least one source is required'),
  customInstructions: z.string().optional(),
  provider: LlmProvider.optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  saveToDatabase: z.boolean().default(true),
  templateId: z.string().optional(),
})

// Response schema for type safety
const GenerateReportResponseSchema = z.object({
  reportId: z.string().optional(),
  markdownContent: z.string(),
  htmlContent: z.string(),
  metadata: z.object({
    title: z.string(),
    sections: z.array(z.string()),
    wordCount: z.number(),
    generatedAt: z.string(),
    sources: z.array(z.string()),
    llmProvider: z.string(),
    llmModel: z.string(),
  }),
  generationTime: z.number(),
  cached: z.boolean().default(false),
})

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const validatedRequest = GenerateReportRequestSchema.parse(body)

    // Initialize LLM service with optional configuration
    const llmService = getLlmService(validatedRequest.provider, {
      model: validatedRequest.model,
      temperature: validatedRequest.temperature,
      streaming: false,
    })

    // Convert source types to strings for the service
    const sourceStrings = validatedRequest.sources.map(source => source.toString())

    // Generate the report
    const reportResult = await llmService.generateReport(
      sourceStrings,
      validatedRequest.customInstructions
    )

    const generationTime = Date.now() - startTime

    // Save to database if requested
    let reportId: string | undefined
    
    if (validatedRequest.saveToDatabase) {
      try {
        const savedReport = await db.spaceWeatherReport.create({
          data: {
            combinedHeadline: reportResult.metadata.title,
            executiveSummary: reportResult.metadata.sections[0] || 'Generated space weather report',
            outlookNext72h: reportResult.metadata.sections.find(s => 
              s.toLowerCase().includes('forecast') || 
              s.toLowerCase().includes('outlook')
            ) || 'No forecast section available',
            markdownContent: reportResult.markdownContent,
            htmlContent: reportResult.htmlContent,
            jsonMetadata: reportResult.metadata,
            llmProvider: validatedRequest.provider || 'OPENAI',
            llmModel: validatedRequest.model || 'gpt-4',
            generationTime,
          },
        })
        reportId = savedReport.id
      } catch (dbError) {
        console.error('Failed to save report to database:', dbError)
        // Continue without saving - don't fail the request
      }
    }

    // Prepare response data
    const responseData = {
      reportId,
      markdownContent: reportResult.markdownContent,
      htmlContent: reportResult.htmlContent,
      metadata: {
        ...reportResult.metadata,
        llmProvider: validatedRequest.provider || 'OPENAI',
        llmModel: validatedRequest.model || 'gpt-4',
      },
      generationTime,
      cached: false,
    }

    // Validate response structure
    const validatedResponse = GenerateReportResponseSchema.parse(responseData)

    return NextResponse.json(createApiResponse(true, validatedResponse))

  } catch (error) {
    console.error('Generate report API error:', error)
    
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

    // Handle specific LLM service errors
    if (error instanceof Error && error.message.includes('Report generation failed')) {
      return NextResponse.json(
        createApiError(
          error.message,
          'GENERATION_ERROR'
        ),
        { status: 503 } // Service Unavailable
      )
    }

    return NextResponse.json(
      createApiError(
        error instanceof Error ? error.message : 'Internal server error',
        'UNKNOWN_ERROR'
      ),
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const reportId = url.searchParams.get('reportId')
    
    if (!reportId) {
      return NextResponse.json(
        createApiError('Report ID is required', 'MISSING_PARAMETER'),
        { status: 400 }
      )
    }

    // Fetch existing report from database
    const report = await db.spaceWeatherReport.findUnique({
      where: { id: reportId },
      include: {
        sources: true,
      },
    })

    if (!report) {
      return NextResponse.json(
        createApiError('Report not found', 'NOT_FOUND'),
        { status: 404 }
      )
    }

    // Transform database record to API response format
    const responseData = {
      reportId: report.id,
      markdownContent: report.markdownContent,
      htmlContent: report.htmlContent,
      metadata: {
        title: report.combinedHeadline,
        sections: [], // Would need to parse from content in a real implementation
        wordCount: report.markdownContent.split(/\s+/).length,
        generatedAt: report.generatedAt.toISOString(),
        sources: report.sources?.map(s => s.source) || [],
        llmProvider: report.llmProvider || 'OPENAI',
        llmModel: report.llmModel || 'gpt-4',
      },
      generationTime: report.generationTime || 0,
      cached: true,
    }

    return NextResponse.json(createApiResponse(true, responseData))

  } catch (error) {
    console.error('Get report API error:', error)
    return NextResponse.json(
      createApiError(
        error instanceof Error ? error.message : 'Internal server error',
        'FETCH_ERROR'
      ),
      { status: 500 }
    )
  }
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