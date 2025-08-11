import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { ApiResponseSchema, PaginatedResponseSchema } from '@/lib/types/api'

const prisma = new PrismaClient()

const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  
  // Filters
  status: z.enum(['DRAFT', 'GENERATING', 'COMPLETED', 'FAILED', 'ARCHIVED']).optional(),
  llmProvider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  minWordCount: z.coerce.number().optional(),
  maxWordCount: z.coerce.number().optional(),
  templateId: z.string().optional(),
  
  // Search options
  searchFields: z.array(z.enum(['headline', 'summary', 'outlook', 'content', 'all'])).default(['all']),
  sortBy: z.enum(['relevance', 'generatedAt', 'updatedAt', 'viewCount', 'downloadCount']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: z.coerce.boolean().default(false),
  exactMatch: z.coerce.boolean().default(false),
})

const AdvancedSearchSchema = z.object({
  queries: z.array(z.object({
    field: z.enum(['headline', 'summary', 'outlook', 'content', 'all']),
    value: z.string().min(1),
    operator: z.enum(['contains', 'equals', 'startsWith', 'endsWith']).default('contains'),
    caseSensitive: z.boolean().default(false),
  })),
  logic: z.enum(['AND', 'OR']).default('AND'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.enum(['relevance', 'generatedAt', 'updatedAt', 'viewCount', 'downloadCount']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeDeleted: z.coerce.boolean().default(false),
})

const SearchSuggestionsQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().min(1).max(10).default(5),
})

const SearchAnalyticsQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

// Utility function to calculate search relevance score
function calculateRelevanceScore(report: any, searchTerm: string): number {
  let score = 0
  const term = searchTerm.toLowerCase()
  
  // Title matches get highest score
  if (report.combinedHeadline.toLowerCase().includes(term)) {
    score += 10
  }
  
  // Summary matches get medium score
  if (report.executiveSummary.toLowerCase().includes(term)) {
    score += 5
  }
  
  // Outlook matches get medium score
  if (report.outlookNext72h.toLowerCase().includes(term)) {
    score += 5
  }
  
  // Content matches get lower score
  if (report.markdownContent?.toLowerCase().includes(term)) {
    score += 2
  }
  
  // LLM provider/model matches
  if (report.llmProvider?.toLowerCase().includes(term)) {
    score += 3
  }
  
  if (report.llmModel?.toLowerCase().includes(term)) {
    score += 2
  }
  
  // Boost score based on engagement
  score += (report.viewCount || 0) * 0.1
  score += (report.downloadCount || 0) * 0.2
  
  return score
}

// GET /api/reports/search - Basic search functionality
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = SearchQuerySchema.parse(Object.fromEntries(searchParams))

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

    if (query.templateId) {
      where.templateId = query.templateId
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

    if (query.minWordCount || query.maxWordCount) {
      where.wordCount = {}
      if (query.minWordCount) {
        where.wordCount.gte = query.minWordCount
      }
      if (query.maxWordCount) {
        where.wordCount.lte = query.maxWordCount
      }
    }

    // Handle search fields
    const searchConditions = []
    const searchMode = query.exactMatch ? 'insensitive' : 'insensitive'

    if (query.searchFields.includes('all') || query.searchFields.includes('headline')) {
      searchConditions.push({
        combinedHeadline: {
          contains: query.q,
          mode: searchMode
        }
      })
    }

    if (query.searchFields.includes('all') || query.searchFields.includes('summary')) {
      searchConditions.push({
        executiveSummary: {
          contains: query.q,
          mode: searchMode
        }
      })
    }

    if (query.searchFields.includes('all') || query.searchFields.includes('outlook')) {
      searchConditions.push({
        outlookNext72h: {
          contains: query.q,
          mode: searchMode
        }
      })
    }

    if (query.searchFields.includes('all') || query.searchFields.includes('content')) {
      searchConditions.push({
        markdownContent: {
          contains: query.q,
          mode: searchMode
        }
      })
    }

    // Add search vector condition for broader matching
    if (query.searchFields.includes('all')) {
      searchConditions.push({
        searchVector: {
          contains: query.q.toLowerCase()
        }
      })
    }

    if (searchConditions.length > 0) {
      where.OR = searchConditions
    }

    // Calculate pagination
    const skip = (query.page - 1) * query.limit
    const take = query.limit

    // Get total count for pagination
    const total = await prisma.spaceWeatherReport.count({ where })

    // Fetch reports
    let orderBy: any = {}
    if (query.sortBy === 'relevance') {
      // For relevance, we'll need to fetch all matching reports and sort in memory
      // This is less efficient but provides better search results
      orderBy = { generatedAt: query.sortOrder }
    } else {
      orderBy = { [query.sortBy]: query.sortOrder }
    }

    const reports = await prisma.spaceWeatherReport.findMany({
      where,
      skip: query.sortBy === 'relevance' ? 0 : skip,
      take: query.sortBy === 'relevance' ? undefined : take,
      orderBy,
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

    // Apply relevance scoring and pagination if needed
    let finalReports = reports
    if (query.sortBy === 'relevance') {
      const scoredReports = reports.map(report => ({
        ...report,
        _relevanceScore: calculateRelevanceScore(report, query.q)
      }))
      
      scoredReports.sort((a, b) => {
        if (query.sortOrder === 'desc') {
          return b._relevanceScore - a._relevanceScore
        } else {
          return a._relevanceScore - b._relevanceScore
        }
      })

      finalReports = scoredReports.slice(skip, skip + take)
    }

    const pages = Math.ceil(total / query.limit)

    const response = PaginatedResponseSchema(z.any()).parse({
      success: true,
      data: finalReports,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages,
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error searching reports:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to search reports',
    }, { status: 500 })
  }
}

// POST /api/reports/search - Advanced search functionality
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const query = AdvancedSearchSchema.parse(body)

    const where: any = {
      isDeleted: query.includeDeleted ? undefined : false,
    }

    // Build complex search conditions
    const searchConditions = query.queries.map(q => {
      const condition: any = {}
      
      let searchTarget: string
      switch (q.field) {
        case 'headline':
          searchTarget = 'combinedHeadline'
          break
        case 'summary':
          searchTarget = 'executiveSummary'
          break
        case 'outlook':
          searchTarget = 'outlookNext72h'
          break
        case 'content':
          searchTarget = 'markdownContent'
          break
        case 'all':
          // For 'all', we'll create an OR condition
          return {
            OR: [
              { combinedHeadline: { contains: q.value, mode: q.caseSensitive ? 'default' : 'insensitive' } },
              { executiveSummary: { contains: q.value, mode: q.caseSensitive ? 'default' : 'insensitive' } },
              { outlookNext72h: { contains: q.value, mode: q.caseSensitive ? 'default' : 'insensitive' } },
              { markdownContent: { contains: q.value, mode: q.caseSensitive ? 'default' : 'insensitive' } },
              { searchVector: { contains: q.value.toLowerCase() } },
            ]
          }
      }

      if (searchTarget) {
        switch (q.operator) {
          case 'contains':
            condition[searchTarget] = {
              contains: q.value,
              mode: q.caseSensitive ? 'default' : 'insensitive'
            }
            break
          case 'equals':
            condition[searchTarget] = {
              equals: q.value,
              mode: q.caseSensitive ? 'default' : 'insensitive'
            }
            break
          case 'startsWith':
            condition[searchTarget] = {
              startsWith: q.value,
              mode: q.caseSensitive ? 'default' : 'insensitive'
            }
            break
          case 'endsWith':
            condition[searchTarget] = {
              endsWith: q.value,
              mode: q.caseSensitive ? 'default' : 'insensitive'
            }
            break
        }
      }

      return condition
    })

    // Combine conditions with specified logic
    if (searchConditions.length > 0) {
      if (query.logic === 'AND') {
        where.AND = searchConditions
      } else {
        where.OR = searchConditions
      }
    }

    // Calculate pagination
    const skip = (query.page - 1) * query.limit
    const take = query.limit

    // Get total count for pagination
    const total = await prisma.spaceWeatherReport.count({ where })

    // Fetch reports
    let orderBy: any = {}
    if (query.sortBy === 'relevance') {
      orderBy = { generatedAt: query.sortOrder }
    } else {
      orderBy = { [query.sortBy]: query.sortOrder }
    }

    const reports = await prisma.spaceWeatherReport.findMany({
      where,
      skip: query.sortBy === 'relevance' ? 0 : skip,
      take: query.sortBy === 'relevance' ? undefined : take,
      orderBy,
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

    // Apply relevance scoring if needed
    let finalReports = reports
    if (query.sortBy === 'relevance') {
      const allSearchTerms = query.queries.map(q => q.value).join(' ')
      const scoredReports = reports.map(report => ({
        ...report,
        _relevanceScore: calculateRelevanceScore(report, allSearchTerms)
      }))
      
      scoredReports.sort((a, b) => {
        if (query.sortOrder === 'desc') {
          return b._relevanceScore - a._relevanceScore
        } else {
          return a._relevanceScore - b._relevanceScore
        }
      })

      finalReports = scoredReports.slice(skip, skip + take)
    }

    const pages = Math.ceil(total / query.limit)

    const response = PaginatedResponseSchema(z.any()).parse({
      success: true,
      data: finalReports,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages,
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in advanced search:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to perform advanced search',
    }, { status: 500 })
  }
}

// PUT /api/reports/search?action=suggestions - Get search suggestions
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'suggestions') {
      const query = SearchSuggestionsQuerySchema.parse(Object.fromEntries(searchParams))
      
      // Get suggestions based on existing headlines and content
      const suggestions = await prisma.spaceWeatherReport.findMany({
        where: {
          isDeleted: false,
          OR: [
            {
              combinedHeadline: {
                contains: query.q,
                mode: 'insensitive'
              }
            },
            {
              searchVector: {
                contains: query.q.toLowerCase()
              }
            }
          ]
        },
        select: {
          id: true,
          combinedHeadline: true,
          executiveSummary: true,
          llmProvider: true,
          generatedAt: true,
        },
        take: query.limit,
        orderBy: {
          generatedAt: 'desc'
        }
      })

      // Extract unique terms and phrases
      const terms = new Set<string>()
      suggestions.forEach(report => {
        const text = `${report.combinedHeadline} ${report.executiveSummary}`.toLowerCase()
        const words = text.split(/\s+/)
        words.forEach(word => {
          if (word.includes(query.q.toLowerCase()) && word.length > 2) {
            terms.add(word)
          }
        })
      })

      const response = ApiResponseSchema(z.any()).parse({
        success: true,
        data: {
          suggestions: Array.from(terms).slice(0, query.limit),
          reports: suggestions.slice(0, 3), // Top 3 matching reports
        },
      })

      return NextResponse.json(response)
    } else if (action === 'analytics') {
      const query = SearchAnalyticsQuerySchema.parse(Object.fromEntries(searchParams))
      
      const where: any = {
        isDeleted: false,
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

      // Get analytics data
      const [
        totalReports,
        totalViews,
        totalDownloads,
        providerStats,
        statusStats,
        contentStats
      ] = await Promise.all([
        prisma.spaceWeatherReport.count({ where }),
        prisma.spaceWeatherReport.aggregate({
          where,
          _sum: { viewCount: true }
        }),
        prisma.spaceWeatherReport.aggregate({
          where,
          _sum: { downloadCount: true }
        }),
        prisma.spaceWeatherReport.groupBy({
          by: ['llmProvider'],
          where,
          _count: { _all: true }
        }),
        prisma.spaceWeatherReport.groupBy({
          by: ['status'],
          where,
          _count: { _all: true }
        }),
        prisma.spaceWeatherReport.aggregate({
          where,
          _avg: { wordCount: true, readingTime: true },
          _min: { wordCount: true },
          _max: { wordCount: true }
        })
      ])

      const analytics = {
        overview: {
          totalReports,
          totalViews: totalViews._sum.viewCount || 0,
          totalDownloads: totalDownloads._sum.downloadCount || 0,
          avgViewsPerReport: totalReports > 0 ? (totalViews._sum.viewCount || 0) / totalReports : 0,
          avgDownloadsPerReport: totalReports > 0 ? (totalDownloads._sum.downloadCount || 0) / totalReports : 0,
        },
        providers: providerStats.reduce((acc, stat) => {
          acc[stat.llmProvider || 'unknown'] = stat._count._all
          return acc
        }, {} as Record<string, number>),
        statuses: statusStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count._all
          return acc
        }, {} as Record<string, number>),
        content: {
          avgWordCount: Math.round(contentStats._avg.wordCount || 0),
          avgReadingTime: Math.round(contentStats._avg.readingTime || 0),
          minWordCount: contentStats._min.wordCount || 0,
          maxWordCount: contentStats._max.wordCount || 0,
        }
      }

      const response = ApiResponseSchema(z.any()).parse({
        success: true,
        data: analytics,
      })

      return NextResponse.json(response)
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unknown action',
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in search utility operation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to perform search operation',
    }, { status: 500 })
  }
}