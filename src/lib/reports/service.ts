import { PrismaClient, Prisma, ReportStatus, LlmProvider, ExportFormat } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Type definitions
export interface CreateReportData {
  combinedHeadline: string
  executiveSummary: string
  outlookNext72h: string
  markdownContent: string
  htmlContent: string
  jsonMetadata?: any
  llmProvider?: LlmProvider
  llmModel?: string
  generationTime?: number
  temperature?: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  templateId?: string
  sourceIds?: string[]
  status?: ReportStatus
}

export interface UpdateReportData extends Partial<CreateReportData> {
  version?: number
  viewCount?: number
  downloadCount?: number
}

export interface ListReportsOptions {
  page?: number
  limit?: number
  status?: ReportStatus
  llmProvider?: LlmProvider
  search?: string
  sortBy?: 'generatedAt' | 'updatedAt' | 'viewCount' | 'downloadCount' | 'relevance'
  sortOrder?: 'asc' | 'desc'
  dateFrom?: Date
  dateTo?: Date
  includeDeleted?: boolean
}

export interface SearchOptions extends ListReportsOptions {
  searchFields?: ('headline' | 'summary' | 'outlook' | 'content' | 'all')[]
  exactMatch?: boolean
  minWordCount?: number
  maxWordCount?: number
  templateId?: string
}

export interface BulkOperationResult {
  success: boolean
  affected: number
  errors?: string[]
}

export interface ReportAnalytics {
  totalReports: number
  totalViews: number
  totalDownloads: number
  avgViewsPerReport: number
  avgDownloadsPerReport: number
  providerStats: Record<string, number>
  statusStats: Record<string, number>
  contentStats: {
    avgWordCount: number
    avgReadingTime: number
    minWordCount: number
    maxWordCount: number
  }
  recentActivity: {
    reportsCreated: number
    viewsLast7Days: number
    downloadsLast7Days: number
  }
}

export interface VersionComparisonResult {
  versionA: any
  versionB: any
  differences: {
    headline: boolean
    summary: boolean
    outlook: boolean
    content: boolean
    wordCountDiff: number
    readingTimeDiff: number
  }
}

// Utility functions
export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200
  const words = text.split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

export function createSearchVector(report: any): string {
  return [
    report.combinedHeadline,
    report.executiveSummary,
    report.outlookNext72h,
    report.llmProvider,
    report.llmModel,
  ].filter(Boolean).join(' ').toLowerCase()
}

export function calculateRelevanceScore(report: any, searchTerm: string): number {
  let score = 0
  const term = searchTerm.toLowerCase()
  
  // Title matches get highest score
  if (report.combinedHeadline?.toLowerCase().includes(term)) {
    score += 10
  }
  
  // Summary matches get medium score
  if (report.executiveSummary?.toLowerCase().includes(term)) {
    score += 5
  }
  
  // Outlook matches get medium score
  if (report.outlookNext72h?.toLowerCase().includes(term)) {
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

// Main Report Service Class
export class ReportService {
  /**
   * Create a new report
   */
  static async createReport(data: CreateReportData) {
    try {
      // Calculate derived fields
      const wordCount = data.markdownContent.split(/\s+/).length
      const readingTime = calculateReadingTime(data.markdownContent)
      const searchVector = createSearchVector(data)

      const report = await prisma.spaceWeatherReport.create({
        data: {
          ...data,
          wordCount,
          readingTime,
          searchVector,
          status: data.status || 'COMPLETED',
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
              issuedAt: true,
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

      return { success: true, data: report }
    } catch (error) {
      console.error('Error creating report:', error)
      return { success: false, error: 'Failed to create report', details: error }
    }
  }

  /**
   * Get a report by ID
   */
  static async getReport(id: string, options: { includeVersions?: boolean; includeDeleted?: boolean; incrementView?: boolean } = {}) {
    try {
      const report = await prisma.spaceWeatherReport.findFirst({
        where: {
          id,
          isDeleted: options.includeDeleted ? undefined : false,
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
          parent: options.includeVersions ? {
            select: {
              id: true,
              version: true,
              generatedAt: true,
              combinedHeadline: true,
            }
          } : false,
          versions: options.includeVersions ? {
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
            take: 10,
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
        return { success: false, error: 'Report not found' }
      }

      // Increment view count if requested
      if (options.incrementView) {
        await prisma.spaceWeatherReport.update({
          where: { id },
          data: {
            viewCount: { increment: 1 },
            lastViewedAt: new Date(),
          }
        })
      }

      return { success: true, data: report }
    } catch (error) {
      console.error('Error getting report:', error)
      return { success: false, error: 'Failed to get report', details: error }
    }
  }

  /**
   * List reports with pagination and filtering
   */
  static async listReports(options: ListReportsOptions = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        llmProvider,
        search,
        sortBy = 'generatedAt',
        sortOrder = 'desc',
        dateFrom,
        dateTo,
        includeDeleted = false,
      } = options

      const where: Prisma.SpaceWeatherReportWhereInput = {
        isDeleted: includeDeleted ? undefined : false,
      }

      // Apply filters
      if (status) {
        where.status = status
      }

      if (llmProvider) {
        where.llmProvider = llmProvider
      }

      if (dateFrom || dateTo) {
        where.generatedAt = {}
        if (dateFrom) {
          where.generatedAt.gte = dateFrom
        }
        if (dateTo) {
          where.generatedAt.lte = dateTo
        }
      }

      // Handle search
      if (search) {
        where.OR = [
          {
            combinedHeadline: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            executiveSummary: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            outlookNext72h: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            searchVector: {
              contains: search.toLowerCase()
            }
          }
        ]
      }

      // Calculate pagination
      const skip = (page - 1) * limit
      const take = limit

      // Get total count for pagination
      const total = await prisma.spaceWeatherReport.count({ where })

      // Fetch reports
      const reports = await prisma.spaceWeatherReport.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
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

      const pages = Math.ceil(total / limit)

      return {
        success: true,
        data: reports,
        pagination: {
          page,
          limit,
          total,
          pages,
        }
      }
    } catch (error) {
      console.error('Error listing reports:', error)
      return { success: false, error: 'Failed to list reports', details: error }
    }
  }

  /**
   * Update a report
   */
  static async updateReport(id: string, data: UpdateReportData, options: { createVersion?: boolean } = {}) {
    try {
      // Check if report exists
      const existingReport = await prisma.spaceWeatherReport.findFirst({
        where: { id, isDeleted: false }
      })

      if (!existingReport) {
        return { success: false, error: 'Report not found' }
      }

      // Prepare update data
      const updateData: any = { ...data }

      // Recalculate derived fields if content changed
      if (data.markdownContent) {
        updateData.wordCount = data.markdownContent.split(/\s+/).length
        updateData.readingTime = calculateReadingTime(data.markdownContent)
        updateData.searchVector = createSearchVector({ ...existingReport, ...data })
      }

      // Check if this is a significant update that should create a new version
      const isSignificantUpdate = data.combinedHeadline || 
                                  data.executiveSummary || 
                                  data.outlookNext72h || 
                                  data.markdownContent

      if (isSignificantUpdate && options.createVersion) {
        // Create new version
        const newVersion = await this.createVersion(id, updateData)
        return newVersion
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

        return { success: true, data: updatedReport }
      }
    } catch (error) {
      console.error('Error updating report:', error)
      return { success: false, error: 'Failed to update report', details: error }
    }
  }

  /**
   * Delete a report (soft delete by default)
   */
  static async deleteReport(id: string, permanent: boolean = false) {
    try {
      const report = await prisma.spaceWeatherReport.findFirst({
        where: { id }
      })

      if (!report) {
        return { success: false, error: 'Report not found' }
      }

      if (permanent) {
        // Delete exports first
        await prisma.reportExport.deleteMany({
          where: { reportId: id }
        })

        // Delete the report
        await prisma.spaceWeatherReport.delete({
          where: { id }
        })

        return { 
          success: true, 
          data: { 
            id, 
            deleted: true, 
            permanent: true 
          } 
        }
      } else {
        // Soft delete
        const deletedReport = await prisma.spaceWeatherReport.update({
          where: { id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          }
        })

        return { 
          success: true, 
          data: { 
            id, 
            deleted: true, 
            permanent: false, 
            deletedAt: deletedReport.deletedAt 
          } 
        }
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      return { success: false, error: 'Failed to delete report', details: error }
    }
  }

  /**
   * Bulk operations on multiple reports
   */
  static async bulkOperation(action: string, reportIds: string[], data?: any): Promise<BulkOperationResult> {
    try {
      let result: any
      const errors: string[] = []

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
            return { success: false, affected: 0, errors: ['Update data is required'] }
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

        case 'permanent_delete':
          // Delete exports first
          await prisma.reportExport.deleteMany({
            where: { reportId: { in: reportIds } }
          })

          result = await prisma.spaceWeatherReport.deleteMany({
            where: { id: { in: reportIds } }
          })
          break

        default:
          return { success: false, affected: 0, errors: [`Unknown action: ${action}`] }
      }

      return {
        success: true,
        affected: result.count,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      console.error('Error in bulk operation:', error)
      return { success: false, affected: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] }
    }
  }

  /**
   * Search reports with advanced options
   */
  static async searchReports(query: string, options: SearchOptions = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        searchFields = ['all'],
        exactMatch = false,
        sortBy = 'generatedAt',
        sortOrder = 'desc',
        includeDeleted = false,
        minWordCount,
        maxWordCount,
        templateId,
        status,
        llmProvider,
        dateFrom,
        dateTo,
      } = options

      const where: Prisma.SpaceWeatherReportWhereInput = {
        isDeleted: includeDeleted ? undefined : false,
      }

      // Apply filters
      if (status) where.status = status
      if (llmProvider) where.llmProvider = llmProvider
      if (templateId) where.templateId = templateId

      if (dateFrom || dateTo) {
        where.generatedAt = {}
        if (dateFrom) where.generatedAt.gte = dateFrom
        if (dateTo) where.generatedAt.lte = dateTo
      }

      if (minWordCount || maxWordCount) {
        where.wordCount = {}
        if (minWordCount) where.wordCount.gte = minWordCount
        if (maxWordCount) where.wordCount.lte = maxWordCount
      }

      // Handle search fields
      const searchConditions: Prisma.SpaceWeatherReportWhereInput[] = []
      const searchMode = exactMatch ? 'insensitive' : 'insensitive'

      if (searchFields.includes('all') || searchFields.includes('headline')) {
        searchConditions.push({
          combinedHeadline: { contains: query, mode: searchMode }
        })
      }

      if (searchFields.includes('all') || searchFields.includes('summary')) {
        searchConditions.push({
          executiveSummary: { contains: query, mode: searchMode }
        })
      }

      if (searchFields.includes('all') || searchFields.includes('outlook')) {
        searchConditions.push({
          outlookNext72h: { contains: query, mode: searchMode }
        })
      }

      if (searchFields.includes('all') || searchFields.includes('content')) {
        searchConditions.push({
          markdownContent: { contains: query, mode: searchMode }
        })
      }

      if (searchFields.includes('all')) {
        searchConditions.push({
          searchVector: { contains: query.toLowerCase() }
        })
      }

      if (searchConditions.length > 0) {
        where.OR = searchConditions
      }

      // Calculate pagination
      const skip = (page - 1) * limit
      const take = limit

      // Get total count
      const total = await prisma.spaceWeatherReport.count({ where })

      // Fetch reports
      let orderBy: Prisma.SpaceWeatherReportOrderByWithRelationInput = {}
      if (sortBy === 'relevance') {
        orderBy = { generatedAt: sortOrder }
      } else {
        orderBy = { [sortBy]: sortOrder }
      }

      const reports = await prisma.spaceWeatherReport.findMany({
        where,
        skip: sortBy === 'relevance' ? 0 : skip,
        take: sortBy === 'relevance' ? undefined : take,
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
      if (sortBy === 'relevance') {
        const scoredReports = reports.map(report => ({
          ...report,
          _relevanceScore: calculateRelevanceScore(report, query)
        }))
        
        scoredReports.sort((a, b) => {
          return sortOrder === 'desc' ? b._relevanceScore - a._relevanceScore : a._relevanceScore - b._relevanceScore
        })

        finalReports = scoredReports.slice(skip, skip + take)
      }

      const pages = Math.ceil(total / limit)

      return {
        success: true,
        data: finalReports,
        pagination: {
          page,
          limit,
          total,
          pages,
        }
      }
    } catch (error) {
      console.error('Error searching reports:', error)
      return { success: false, error: 'Failed to search reports', details: error }
    }
  }

  /**
   * Get report analytics
   */
  static async getAnalytics(dateFrom?: Date, dateTo?: Date): Promise<{ success: boolean; data?: ReportAnalytics; error?: string }> {
    try {
      const where: Prisma.SpaceWeatherReportWhereInput = {
        isDeleted: false,
      }

      if (dateFrom || dateTo) {
        where.generatedAt = {}
        if (dateFrom) where.generatedAt.gte = dateFrom
        if (dateTo) where.generatedAt.lte = dateTo
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const [
        totalReports,
        totalViews,
        totalDownloads,
        providerStats,
        statusStats,
        contentStats,
        recentReports,
        recentViews,
        recentDownloads
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
        }),
        prisma.spaceWeatherReport.count({
          where: {
            ...where,
            generatedAt: { gte: sevenDaysAgo }
          }
        }),
        prisma.spaceWeatherReport.aggregate({
          where: {
            ...where,
            lastViewedAt: { gte: sevenDaysAgo }
          },
          _sum: { viewCount: true }
        }),
        prisma.spaceWeatherReport.aggregate({
          where: {
            ...where,
            lastDownloadedAt: { gte: sevenDaysAgo }
          },
          _sum: { downloadCount: true }
        })
      ])

      const analytics: ReportAnalytics = {
        totalReports,
        totalViews: totalViews._sum.viewCount || 0,
        totalDownloads: totalDownloads._sum.downloadCount || 0,
        avgViewsPerReport: totalReports > 0 ? (totalViews._sum.viewCount || 0) / totalReports : 0,
        avgDownloadsPerReport: totalReports > 0 ? (totalDownloads._sum.downloadCount || 0) / totalReports : 0,
        providerStats: providerStats.reduce((acc, stat) => {
          acc[stat.llmProvider || 'unknown'] = stat._count._all
          return acc
        }, {} as Record<string, number>),
        statusStats: statusStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count._all
          return acc
        }, {} as Record<string, number>),
        contentStats: {
          avgWordCount: Math.round(contentStats._avg.wordCount || 0),
          avgReadingTime: Math.round(contentStats._avg.readingTime || 0),
          minWordCount: contentStats._min.wordCount || 0,
          maxWordCount: contentStats._max.wordCount || 0,
        },
        recentActivity: {
          reportsCreated: recentReports,
          viewsLast7Days: recentViews._sum.viewCount || 0,
          downloadsLast7Days: recentDownloads._sum.downloadCount || 0,
        }
      }

      return { success: true, data: analytics }
    } catch (error) {
      console.error('Error getting analytics:', error)
      return { success: false, error: 'Failed to get analytics' }
    }
  }

  /**
   * Create a new version of a report
   */
  static async createVersion(reportId: string, updateData: any) {
    try {
      const currentReport = await prisma.spaceWeatherReport.findFirst({
        where: { id: reportId, isDeleted: false }
      })

      if (!currentReport) {
        return { success: false, error: 'Report not found' }
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
        orderBy: { version: 'desc' }
      })

      const newVersionNumber = (latestVersion?.version || 1) + 1

      // Prepare new version data
      const newVersionData = {
        ...currentReport,
        id: undefined, // Let Prisma generate new ID
        ...updateData,
        parentId: rootId,
        version: newVersionNumber,
        viewCount: 0,
        downloadCount: 0,
        lastViewedAt: null,
        lastDownloadedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

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

      return { success: true, data: newVersion }
    } catch (error) {
      console.error('Error creating version:', error)
      return { success: false, error: 'Failed to create version', details: error }
    }
  }

  /**
   * Compare two versions of a report
   */
  static async compareVersions(versionAId: string, versionBId: string): Promise<{ success: boolean; data?: VersionComparisonResult; error?: string }> {
    try {
      const [versionA, versionB] = await Promise.all([
        prisma.spaceWeatherReport.findFirst({
          where: { id: versionAId, isDeleted: false }
        }),
        prisma.spaceWeatherReport.findFirst({
          where: { id: versionBId, isDeleted: false }
        })
      ])

      if (!versionA || !versionB) {
        return { success: false, error: 'One or both versions not found' }
      }

      const comparison: VersionComparisonResult = {
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

      return { success: true, data: comparison }
    } catch (error) {
      console.error('Error comparing versions:', error)
      return { success: false, error: 'Failed to compare versions' }
    }
  }

  /**
   * Get report statistics for dashboard
   */
  static async getDashboardStats() {
    try {
      const now = new Date()
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [
        totalReports,
        completedReports,
        reportsLast24h,
        reportsLast7d,
        totalViews,
        totalDownloads,
        popularReports
      ] = await Promise.all([
        prisma.spaceWeatherReport.count({
          where: { isDeleted: false }
        }),
        prisma.spaceWeatherReport.count({
          where: { isDeleted: false, status: 'COMPLETED' }
        }),
        prisma.spaceWeatherReport.count({
          where: { 
            isDeleted: false, 
            generatedAt: { gte: last24Hours }
          }
        }),
        prisma.spaceWeatherReport.count({
          where: { 
            isDeleted: false, 
            generatedAt: { gte: last7Days }
          }
        }),
        prisma.spaceWeatherReport.aggregate({
          where: { isDeleted: false },
          _sum: { viewCount: true }
        }),
        prisma.spaceWeatherReport.aggregate({
          where: { isDeleted: false },
          _sum: { downloadCount: true }
        }),
        prisma.spaceWeatherReport.findMany({
          where: { isDeleted: false, status: 'COMPLETED' },
          orderBy: [
            { viewCount: 'desc' },
            { downloadCount: 'desc' }
          ],
          take: 5,
          select: {
            id: true,
            combinedHeadline: true,
            viewCount: true,
            downloadCount: true,
            generatedAt: true,
          }
        })
      ])

      return {
        success: true,
        data: {
          totalReports,
          completedReports,
          successRate: totalReports > 0 ? Math.round((completedReports / totalReports) * 100) : 0,
          reportsLast24h,
          reportsLast7d,
          totalViews: totalViews._sum.viewCount || 0,
          totalDownloads: totalDownloads._sum.downloadCount || 0,
          avgViewsPerReport: totalReports > 0 ? Math.round((totalViews._sum.viewCount || 0) / totalReports) : 0,
          popularReports,
        }
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      return { success: false, error: 'Failed to get dashboard stats' }
    }
  }
}