import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { ApiResponseSchema, PaginatedResponseSchema } from '@/lib/types/api'

const prisma = new PrismaClient()

// Request schemas
const CreateReportSchema = z.object({
  combinedHeadline: z.string().min(1, 'Headline is required'),
  executiveSummary: z.string().min(1, 'Executive summary is required'),
  outlookNext72h: z.string().min(1, 'Outlook is required'),
  markdownContent: z.string().min(1, 'Markdown content is required'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  jsonMetadata: z.any().optional(),
  llmProvider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE']).optional(),
  llmModel: z.string().optional(),
  generationTime: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  totalTokens: z.number().optional(),
  templateId: z.string().optional(),
  sourceIds: z.array(z.string()).optional(),
})

const UpdateReportSchema = CreateReportSchema.partial().extend({
  id: z.string(),
  status: z.enum(['DRAFT', 'GENERATING', 'COMPLETED', 'FAILED', 'ARCHIVED']).optional(),
})

const ListReportsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.enum(['DRAFT', 'GENERATING', 'COMPLETED', 'FAILED', 'ARCHIVED']).optional(),
  llmProvider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['generatedAt', 'updatedAt', 'viewCount', 'downloadCount']).default('generatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  includeDeleted: z.coerce.boolean().default(false),
})

// Utility function to calculate reading time
function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200
  const words = text.split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

// Utility function to create search vector
function createSearchVector(report: any): string {
  return [
    report.combinedHeadline,
    report.executiveSummary,
    report.outlookNext72h,
    report.llmProvider,
    report.llmModel,
  ].filter(Boolean).join(' ').toLowerCase()
}

// GET /api/reports - List reports with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = ListReportsQuerySchema.parse(Object.fromEntries(searchParams))

    const where: any = {
      isDeleted: query.includeDeleted ? undefined : false,
    }

    // Apply filters
    if (query.status) {
      where.status = query.status
    }

    if (query.llmProvider) {
      where.llmProvider = query.llmProvider
    }

    if (query.dateFrom || query.dateTo) {
      where.generatedAt = {}
      if (query.dateFrom) {
        where.generatedAt.gte = query.dateFrom
      }
      if (query.dateTo) {
        where.generatedAt.lte = query.dateTo
      }
    }

    // Handle search
    if (query.search) {
      where.OR = [
        {
          combinedHeadline: {
            contains: query.search,
            mode: 'insensitive'
          }
        },
        {
          executiveSummary: {
            contains: query.search,
            mode: 'insensitive'
          }
        },
        {
          outlookNext72h: {
            contains: query.search,
            mode: 'insensitive'
          }
        },
        {
          searchVector: {
            contains: query.search.toLowerCase()
          }
        }
      ]
    }

    // Calculate pagination
    const skip = (query.page - 1) * query.limit
    const take = query.limit

    // Get total count for pagination
    const total = await prisma.spaceWeatherReport.count({ where })

    // Fetch reports
    const reports = await prisma.spaceWeatherReport.findMany({
      where,
      skip,
      take,
      orderBy: {
        [query.sortBy]: query.sortOrder
      },
      include: {
        sources: {
          select: {
            id: true,
            source: true,
            headline: true,
          }
        },
        template: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            exports: true,
            versions: true,
          }
        }
      }
    })

    const pages = Math.ceil(total / query.limit)

    const response = PaginatedResponseSchema(z.any()).parse({
      success: true,
      data: reports,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages,
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching reports:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch reports',
    }, { status: 500 })
  }
}

// POST /api/reports - Create a new report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = CreateReportSchema.parse(body)

    // Calculate derived fields
    const wordCount = data.markdownContent.split(/\s+/).length
    const readingTime = calculateReadingTime(data.markdownContent)
    const searchVector = createSearchVector(data)

    // Create the report
    const report = await prisma.spaceWeatherReport.create({
      data: {
        ...data,
        wordCount,
        readingTime,
        searchVector,
        status: 'COMPLETED', // Assuming it's created in completed state
        sources: data.sourceIds ? {
          connect: data.sourceIds.map(id => ({ id }))
        } : undefined,
      },
      include: {
        sources: {
          select: {
            id: true,
            source: true,
            headline: true,
          }
        },
        template: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            exports: true,
            versions: true,
          }
        }
      }
    })

    const response = ApiResponseSchema(z.any()).parse({
      success: true,
      data: report,
    })

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating report:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create report',
    }, { status: 500 })
  }
}

// PUT /api/reports - Update multiple reports (bulk operations)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, reportIds, data } = body

    if (!action || !reportIds || !Array.isArray(reportIds)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: action, reportIds',
      }, { status: 400 })
    }

    let result

    switch (action) {
      case 'delete':
        result = await prisma.spaceWeatherReport.updateMany({
          where: {
            id: { in: reportIds },
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          }
        })
        break

      case 'restore':
        result = await prisma.spaceWeatherReport.updateMany({
          where: {
            id: { in: reportIds },
            isDeleted: true,
          },
          data: {
            isDeleted: false,
            deletedAt: null,
          }
        })
        break

      case 'archive':
        result = await prisma.spaceWeatherReport.updateMany({
          where: {
            id: { in: reportIds },
          },
          data: {
            status: 'ARCHIVED',
          }
        })
        break

      case 'update':
        if (!data) {
          return NextResponse.json({
            success: false,
            error: 'Update data is required for update action',
          }, { status: 400 })
        }

        result = await prisma.spaceWeatherReport.updateMany({
          where: {
            id: { in: reportIds },
          },
          data: {
            ...data,
            updatedAt: new Date(),
          }
        })
        break

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
        }, { status: 400 })
    }

    const response = ApiResponseSchema(z.any()).parse({
      success: true,
      data: {
        action,
        affected: result.count,
        reportIds,
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error performing bulk operation:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to perform bulk operation',
    }, { status: 500 })
  }
}

// DELETE /api/reports - Permanently delete reports
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportIds = searchParams.getAll('id')

    if (reportIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No report IDs provided',
      }, { status: 400 })
    }

    // Delete exports first due to cascade constraint
    await prisma.reportExport.deleteMany({
      where: {
        reportId: { in: reportIds }
      }
    })

    // Then delete the reports
    const result = await prisma.spaceWeatherReport.deleteMany({
      where: {
        id: { in: reportIds }
      }
    })

    const response = ApiResponseSchema(z.any()).parse({
      success: true,
      data: {
        deleted: result.count,
        reportIds,
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error deleting reports:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete reports',
    }, { status: 500 })
  }
}