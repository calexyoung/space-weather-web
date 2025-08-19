import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { ApiResponseSchema } from '@/lib/types/api'

const prisma = new PrismaClient()

const UpdateReportSchema = z.object({
  combinedHeadline: z.string().optional(),
  executiveSummary: z.string().optional(),
  outlookNext72h: z.string().optional(),
  markdownContent: z.string().optional(),
  htmlContent: z.string().optional(),
  jsonMetadata: z.any().optional(),
  status: z.enum(['DRAFT', 'GENERATING', 'COMPLETED', 'FAILED', 'ARCHIVED']).optional(),
  llmProvider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE']).optional(),
  llmModel: z.string().optional(),
  generationTime: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  totalTokens: z.number().optional(),
  templateId: z.string().optional(),
})

// Utility functions
function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200
  const words = text.split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

function createSearchVector(report: any): string {
  return [
    report.combinedHeadline,
    report.executiveSummary,
    report.outlookNext72h,
    report.llmProvider,
    report.llmModel,
  ].filter(Boolean).join(' ').toLowerCase()
}

// GET /api/reports/[id] - Get a specific report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeVersions = searchParams.get('includeVersions') === 'true'
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    // Increment view count unless it's a system request
    const isSystemRequest = request.headers.get('x-system-request') === 'true'
    
    const report = await prisma.spaceWeatherReport.findFirst({
      where: {
        id,
        isDeleted: includeDeleted ? undefined : false,
      },
      include: {
        sources: {
          select: {
            id: true,
            source: true,
            sourceUrl: true,
            headline: true,
            summary: true,
            issuedAt: true,
            fetchedAt: true,
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            description: true,
          }
        },
        parent: includeVersions ? {
          select: {
            id: true,
            version: true,
            generatedAt: true,
            combinedHeadline: true,
          }
        } : false,
        versions: includeVersions ? {
          select: {
            id: true,
            version: true,
            generatedAt: true,
            combinedHeadline: true,
            status: true,
          },
          orderBy: {
            version: 'desc'
          }
        } : false,
        exports: {
          select: {
            id: true,
            format: true,
            filename: true,
            fileSize: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10, // Last 10 exports
        },
        _count: {
          select: {
            exports: true,
            versions: true,
          }
        }
      }
    })

    if (!report) {
      return NextResponse.json({
        success: false,
        error: 'Report not found',
      }, { status: 404 })
    }

    // Update view count and last viewed timestamp
    if (!isSystemRequest) {
      await prisma.spaceWeatherReport.update({
        where: { id },
        data: {
          viewCount: { increment: 1 },
          lastViewedAt: new Date(),
        }
      })
    }

    const response = ApiResponseSchema(z.any()).parse({
      success: true,
      data: report,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching report:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch report',
    }, { status: 500 })
  }
}

// PUT /api/reports/[id] - Update a specific report
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = UpdateReportSchema.parse(body)

    // Check if report exists and is not deleted
    const existingReport = await prisma.spaceWeatherReport.findFirst({
      where: {
        id,
        isDeleted: false,
      }
    })

    if (!existingReport) {
      return NextResponse.json({
        success: false,
        error: 'Report not found',
      }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = { ...data }

    // Recalculate derived fields if content changed
    if (data.markdownContent) {
      updateData.wordCount = data.markdownContent.split(/\s+/).length
      updateData.readingTime = calculateReadingTime(data.markdownContent)
      updateData.searchVector = createSearchVector({ ...existingReport, ...data })
    }

    // Create a new version if this is a significant update
    const isSignificantUpdate = data.combinedHeadline || 
                                data.executiveSummary || 
                                data.outlookNext72h || 
                                data.markdownContent

    if (isSignificantUpdate && body.createVersion) {
      // Create new version
      const newVersion = await prisma.spaceWeatherReport.create({
        data: {
          ...existingReport,
          ...updateData,
          id: undefined, // Let Prisma generate new ID
          parentId: existingReport.parentId || existingReport.id,
          version: existingReport.version + 1,
          viewCount: 0,
          downloadCount: 0,
          lastViewedAt: null,
          lastDownloadedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
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
        data: newVersion,
      })

      return NextResponse.json(response)
    } else {
      // Update existing report
      const updatedReport = await prisma.spaceWeatherReport.update({
        where: { id },
        data: updateData,
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
        data: updatedReport,
      })

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Error updating report:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update report',
    }, { status: 500 })
  }
}

// DELETE /api/reports/[id] - Delete a specific report (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    const report = await prisma.spaceWeatherReport.findFirst({
      where: { id }
    })

    if (!report) {
      return NextResponse.json({
        success: false,
        error: 'Report not found',
      }, { status: 404 })
    }

    if (permanent) {
      // Permanent deletion
      await prisma.reportExport.deleteMany({
        where: { reportId: id }
      })

      await prisma.spaceWeatherReport.delete({
        where: { id }
      })

      const response = ApiResponseSchema(z.any()).parse({
        success: true,
        data: { 
          id,
          deleted: true,
          permanent: true 
        },
      })

      return NextResponse.json(response)
    } else {
      // Soft deletion
      const deletedReport = await prisma.spaceWeatherReport.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        }
      })

      const response = ApiResponseSchema(z.any()).parse({
        success: true,
        data: { 
          id,
          deleted: true,
          permanent: false,
          deletedAt: deletedReport.deletedAt,
        },
      })

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Error deleting report:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete report',
    }, { status: 500 })
  }
}