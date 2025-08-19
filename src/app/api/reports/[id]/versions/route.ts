import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { ApiResponseSchema, PaginatedResponseSchema } from '@/lib/types/api'

const prisma = new PrismaClient()

const ListVersionsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  includeContent: z.coerce.boolean().default(false),
})

const CreateVersionSchema = z.object({
  combinedHeadline: z.string().optional(),
  executiveSummary: z.string().optional(),
  outlookNext72h: z.string().optional(),
  markdownContent: z.string().optional(),
  htmlContent: z.string().optional(),
  jsonMetadata: z.any().optional(),
  changeDescription: z.string().optional(),
})

const CompareVersionsQuerySchema = z.object({
  versionA: z.string(),
  versionB: z.string(),
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

// GET /api/reports/[id]/versions - List all versions of a report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const query = ListVersionsQuerySchema.parse(Object.fromEntries(searchParams))

    // First, find the root report (either the report itself or its parent)
    const report = await prisma.spaceWeatherReport.findFirst({
      where: { id, isDeleted: false }
    })

    if (!report) {
      return NextResponse.json({
        success: false,
        error: 'Report not found',
      }, { status: 404 })
    }

    const rootId = report.parentId || report.id

    // Calculate pagination
    const skip = (query.page - 1) * query.limit
    const take = query.limit

    // Get total count for pagination
    const total = await prisma.spaceWeatherReport.count({
      where: {
        OR: [
          { id: rootId },
          { parentId: rootId }
        ],
        isDeleted: false,
      }
    })

    // Fetch all versions
    const versions = await prisma.spaceWeatherReport.findMany({
      where: {
        OR: [
          { id: rootId },
          { parentId: rootId }
        ],
        isDeleted: false,
      },
      skip,
      take,
      orderBy: {
        version: 'desc'
      },
      select: {
        id: true,
        version: true,
        combinedHeadline: true,
        executiveSummary: query.includeContent,
        outlookNext72h: query.includeContent,
        markdownContent: query.includeContent,
        htmlContent: query.includeContent,
        jsonMetadata: query.includeContent,
        status: true,
        generatedAt: true,
        updatedAt: true,
        wordCount: true,
        readingTime: true,
        viewCount: true,
        downloadCount: true,
        llmProvider: true,
        llmModel: true,
        generationTime: true,
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
      data: versions,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages,
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching report versions:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch report versions',
    }, { status: 500 })
  }
}

// POST /api/reports/[id]/versions - Create a new version of a report
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = CreateVersionSchema.parse(body)

    // Get the current report
    const currentReport = await prisma.spaceWeatherReport.findFirst({
      where: { id, isDeleted: false }
    })

    if (!currentReport) {
      return NextResponse.json({
        success: false,
        error: 'Report not found',
      }, { status: 404 })
    }

    // Find the latest version number
    const rootId = currentReport.parentId || currentReport.id
    const latestVersion = await prisma.spaceWeatherReport.findFirst({
      where: {
        OR: [
          { id: rootId },
          { parentId: rootId }
        ],
        isDeleted: false,
      },
      orderBy: {
        version: 'desc'
      }
    })

    const newVersionNumber = (latestVersion?.version || 1) + 1

    // Prepare the new version data
    const newVersionData = {
      ...currentReport,
      id: undefined, // Let Prisma generate new ID
      ...data, // Override with new data
      parentId: rootId,
      version: newVersionNumber,
      viewCount: 0,
      downloadCount: 0,
      lastViewedAt: null,
      lastDownloadedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Recalculate derived fields if content changed
    if (data.markdownContent) {
      newVersionData.wordCount = data.markdownContent.split(/\s+/).length
      newVersionData.readingTime = calculateReadingTime(data.markdownContent)
      newVersionData.searchVector = createSearchVector(newVersionData)
    }

    // Create the new version
    const newVersion = await prisma.spaceWeatherReport.create({
      data: newVersionData,
      include: {
        parent: {
          select: {
            id: true,
            version: true,
            combinedHeadline: true,
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
      data: {
        ...newVersion,
        changeDescription: data.changeDescription,
      },
    })

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating report version:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create report version',
    }, { status: 500 })
  }
}

// Additional route for version comparison
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'compare') {
      const query = CompareVersionsQuerySchema.parse(Object.fromEntries(searchParams))

      // Fetch both versions
      const [versionA, versionB] = await Promise.all([
        prisma.spaceWeatherReport.findFirst({
          where: { id: query.versionA, isDeleted: false }
        }),
        prisma.spaceWeatherReport.findFirst({
          where: { id: query.versionB, isDeleted: false }
        })
      ])

      if (!versionA || !versionB) {
        return NextResponse.json({
          success: false,
          error: 'One or both versions not found',
        }, { status: 404 })
      }

      // Generate comparison data
      const comparison = {
        versionA: {
          id: versionA.id,
          version: versionA.version,
          headline: versionA.combinedHeadline,
          summary: versionA.executiveSummary,
          outlook: versionA.outlookNext72h,
          content: versionA.markdownContent,
          updatedAt: versionA.updatedAt,
          wordCount: versionA.wordCount,
          readingTime: versionA.readingTime,
        },
        versionB: {
          id: versionB.id,
          version: versionB.version,
          headline: versionB.combinedHeadline,
          summary: versionB.executiveSummary,
          outlook: versionB.outlookNext72h,
          content: versionB.markdownContent,
          updatedAt: versionB.updatedAt,
          wordCount: versionB.wordCount,
          readingTime: versionB.readingTime,
        },
        differences: {
          headline: versionA.combinedHeadline !== versionB.combinedHeadline,
          summary: versionA.executiveSummary !== versionB.executiveSummary,
          outlook: versionA.outlookNext72h !== versionB.outlookNext72h,
          content: versionA.markdownContent !== versionB.markdownContent,
          wordCountDiff: (versionB.wordCount || 0) - (versionA.wordCount || 0),
          readingTimeDiff: (versionB.readingTime || 0) - (versionA.readingTime || 0),
        }
      }

      const response = ApiResponseSchema(z.any()).parse({
        success: true,
        data: comparison,
      })

      return NextResponse.json(response)
    } else if (action === 'rollback') {
      const { searchParams } = new URL(request.url)
      const targetVersionId = searchParams.get('targetVersion')

      if (!targetVersionId) {
        return NextResponse.json({
          success: false,
          error: 'Target version ID is required for rollback',
        }, { status: 400 })
      }

      // Get the target version
      const targetVersion = await prisma.spaceWeatherReport.findFirst({
        where: { id: targetVersionId, isDeleted: false }
      })

      if (!targetVersion) {
        return NextResponse.json({
          success: false,
          error: 'Target version not found',
        }, { status: 404 })
      }

      // Create a new version based on the target version
      const { id: _, ...targetVersionWithoutId } = targetVersion
      const rollbackData = {
        ...targetVersionWithoutId,
        version: 1, // Will be recalculated below
        createdAt: new Date(),
        updatedAt: new Date(),
        viewCount: 0,
        downloadCount: 0,
        lastViewedAt: null,
        lastDownloadedAt: null,
        jsonMetadata: targetVersion.jsonMetadata || undefined,
      }

      // Find the latest version number
      const rootId = targetVersion.parentId || targetVersion.id
      const latestVersion = await prisma.spaceWeatherReport.findFirst({
        where: {
          OR: [
            { id: rootId },
            { parentId: rootId }
          ],
          isDeleted: false,
        },
        orderBy: {
          version: 'desc'
        }
      })

      rollbackData.version = (latestVersion?.version || 1) + 1
      rollbackData.parentId = rootId

      const rolledBackVersion = await prisma.spaceWeatherReport.create({
        data: rollbackData,
        include: {
          parent: {
            select: {
              id: true,
              version: true,
              combinedHeadline: true,
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
        data: {
          ...rolledBackVersion,
          rolledBackFrom: targetVersion.version,
        },
      })

      return NextResponse.json(response, { status: 201 })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unknown action',
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in version operation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to perform version operation',
    }, { status: 500 })
  }
}