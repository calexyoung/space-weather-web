import { ExportFormat } from '@prisma/client'
import { ExportMetadata } from './markdown-exporter'

export interface JsonExportOptions {
  includeSources?: boolean
  includeMetadata?: boolean
  includeGenerationDetails?: boolean
  includeAnalytics?: boolean
  includeRawContent?: boolean
  includeVersionHistory?: boolean
  minifyJson?: boolean
  schemaVersion?: string
}

export interface JsonExportSchema {
  schema_version: string
  export_info: {
    exported_at: string
    format: string
    options: JsonExportOptions
  }
  report: {
    id: string
    headline: string
    executive_summary: string
    outlook_72h: string
    content: {
      markdown?: string
      html?: string
    }
    metadata?: any
    generated_at: string
    status: string
    version: number
    parent_id?: string
  }
  generation: {
    llm_provider?: string
    llm_model?: string
    generation_time?: number
    temperature?: number
    tokens?: {
      prompt?: number
      completion?: number
      total?: number
    }
  }
  analytics: {
    word_count?: number
    reading_time?: number
    view_count: number
    download_count: number
    last_viewed_at?: string
    last_downloaded_at?: string
  }
  sources?: Array<{
    id: string
    type: string
    url?: string
    headline: string
    summary?: string
    details?: string
    issued_at: string
    fetched_at: string
    hazard_levels?: {
      geomagnetic?: string
      radio_blackout?: string
      radiation_storm?: string
    }
  }>
  template?: {
    id: string
    name: string
    description?: string
  }
  version_history?: Array<{
    id: string
    version: number
    generated_at: string
    headline: string
    status: string
  }>
  exports?: Array<{
    id: string
    format: string
    filename: string
    file_size?: number
    created_at: string
  }>
}

export class JsonExporter {
  private static readonly SCHEMA_VERSION = '1.0.0'

  /**
   * Export a report to JSON format
   */
  static async exportReport(report: any, options: JsonExportOptions = {}): Promise<{ content: string; metadata: ExportMetadata }> {
    const {
      includeSources = true,
      includeMetadata = true,
      includeGenerationDetails = true,
      includeAnalytics = true,
      includeRawContent = true,
      includeVersionHistory = false,
      minifyJson = false,
      schemaVersion = this.SCHEMA_VERSION
    } = options

    const timestamp = new Date(report.generatedAt).toISOString().split('T')[0]
    const filename = `space-weather-report-${timestamp}.json`

    const exportData = this.buildReportJson(report, {
      includeSources,
      includeMetadata,
      includeGenerationDetails,
      includeAnalytics,
      includeRawContent,
      includeVersionHistory,
      schemaVersion
    })

    const content = minifyJson 
      ? JSON.stringify(exportData)
      : JSON.stringify(exportData, null, 2)

    const fileSize = Buffer.byteLength(content, 'utf8')

    return {
      content,
      metadata: {
        reportId: report.id,
        format: 'JSON',
        filename,
        fileSize,
        exportedAt: new Date(),
      }
    }
  }

  /**
   * Export multiple reports to JSON format
   */
  static async exportMultipleReports(reports: any[], options: JsonExportOptions = {}): Promise<{ content: string; metadata: ExportMetadata }> {
    const {
      includeSources = true,
      includeMetadata = false,
      includeGenerationDetails = false,
      includeAnalytics = true,
      includeRawContent = false,
      includeVersionHistory = false,
      minifyJson = false,
      schemaVersion = this.SCHEMA_VERSION
    } = options

    const dateRange = this.getDateRange(reports)
    const filename = `space-weather-reports-${dateRange}.json`

    const exportData = {
      schema_version: schemaVersion,
      export_info: {
        exported_at: new Date().toISOString(),
        format: 'JSON_COLLECTION',
        collection_size: reports.length,
        options
      },
      collection_analytics: this.generateCollectionAnalytics(reports),
      reports: reports.map(report => this.buildReportJson(report, {
        includeSources,
        includeMetadata,
        includeGenerationDetails,
        includeAnalytics,
        includeRawContent,
        includeVersionHistory,
        schemaVersion,
        isCollection: true
      }).report)
    }

    const content = minifyJson 
      ? JSON.stringify(exportData)
      : JSON.stringify(exportData, null, 2)

    const fileSize = Buffer.byteLength(content, 'utf8')

    return {
      content,
      metadata: {
        reportId: 'collection',
        format: 'JSON',
        filename,
        fileSize,
        exportedAt: new Date(),
      }
    }
  }

  /**
   * Export for API consumption (optimized structure)
   */
  static async exportForApi(report: any): Promise<{ content: string; metadata: ExportMetadata }> {
    const apiData = {
      id: report.id,
      headline: report.combinedHeadline,
      summary: report.executiveSummary,
      outlook: report.outlookNext72h,
      content: {
        markdown: report.markdownContent,
        html: report.htmlContent
      },
      generated_at: report.generatedAt,
      status: report.status,
      version: report.version,
      llm_provider: report.llmProvider,
      llm_model: report.llmModel,
      word_count: report.wordCount,
      reading_time: report.readingTime,
      view_count: report.viewCount || 0,
      download_count: report.downloadCount || 0,
      sources: report.sources?.map((s: any) => ({
        id: s.id,
        type: s.source,
        headline: s.headline,
        issued_at: s.issuedAt,
      })) || [],
      template: report.template ? {
        id: report.template.id,
        name: report.template.name
      } : null,
      created_at: report.createdAt,
      updated_at: report.updatedAt
    }

    const content = JSON.stringify(apiData)
    const fileSize = Buffer.byteLength(content, 'utf8')

    return {
      content,
      metadata: {
        reportId: report.id,
        format: 'JSON',
        filename: `api-report-${report.id}.json`,
        fileSize,
        exportedAt: new Date(),
      }
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(reports: any[], timeRange?: { start: Date; end: Date }): Promise<{ content: string; metadata: ExportMetadata }> {
    const analytics = {
      schema_version: this.SCHEMA_VERSION,
      export_info: {
        exported_at: new Date().toISOString(),
        format: 'ANALYTICS',
        time_range: timeRange ? {
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString()
        } : null
      },
      summary: this.generateCollectionAnalytics(reports),
      detailed_metrics: {
        by_provider: this.analyzeByProvider(reports),
        by_status: this.analyzeByStatus(reports),
        by_date: this.analyzeByDate(reports),
        performance_metrics: this.analyzePerformance(reports),
        content_metrics: this.analyzeContent(reports),
        usage_metrics: this.analyzeUsage(reports)
      },
      trends: this.analyzeTrends(reports)
    }

    const filename = `space-weather-analytics-${new Date().toISOString().split('T')[0]}.json`
    const content = JSON.stringify(analytics, null, 2)
    const fileSize = Buffer.byteLength(content, 'utf8')

    return {
      content,
      metadata: {
        reportId: 'analytics',
        format: 'JSON',
        filename,
        fileSize,
        exportedAt: new Date(),
      }
    }
  }

  /**
   * Build complete JSON structure for a report
   */
  private static buildReportJson(report: any, options: any): JsonExportSchema {
    const data: JsonExportSchema = {
      schema_version: options.schemaVersion,
      export_info: {
        exported_at: new Date().toISOString(),
        format: 'JSON',
        options
      },
      report: {
        id: report.id,
        headline: report.combinedHeadline,
        executive_summary: report.executiveSummary,
        outlook_72h: report.outlookNext72h,
        content: {},
        generated_at: report.generatedAt,
        status: report.status,
        version: report.version,
        parent_id: report.parentId || undefined
      },
      generation: {},
      analytics: {
        view_count: report.viewCount || 0,
        download_count: report.downloadCount || 0
      }
    }

    // Add content
    if (options.includeRawContent) {
      data.report.content.markdown = report.markdownContent
      data.report.content.html = report.htmlContent
    }

    // Add metadata
    if (options.includeMetadata && report.jsonMetadata) {
      data.report.metadata = report.jsonMetadata
    }

    // Add generation details
    if (options.includeGenerationDetails) {
      data.generation = {
        llm_provider: report.llmProvider,
        llm_model: report.llmModel,
        generation_time: report.generationTime,
        temperature: report.temperature,
        tokens: {
          prompt: report.promptTokens,
          completion: report.completionTokens,
          total: report.totalTokens
        }
      }
    }

    // Add analytics
    if (options.includeAnalytics) {
      data.analytics = {
        word_count: report.wordCount,
        reading_time: report.readingTime,
        view_count: report.viewCount || 0,
        download_count: report.downloadCount || 0,
        last_viewed_at: report.lastViewedAt || undefined,
        last_downloaded_at: report.lastDownloadedAt || undefined
      }
    }

    // Add sources
    if (options.includeSources && report.sources?.length > 0) {
      data.sources = report.sources.map((s: any) => ({
        id: s.id,
        type: s.source,
        url: s.sourceUrl,
        headline: s.headline,
        summary: s.summary,
        details: s.details,
        issued_at: s.issuedAt,
        fetched_at: s.fetchedAt,
        hazard_levels: {
          geomagnetic: s.geomagneticLevel,
          radio_blackout: s.radioBlackoutLevel,
          radiation_storm: s.radiationStormLevel
        }
      }))
    }

    // Add template info
    if (report.template) {
      data.template = {
        id: report.template.id,
        name: report.template.name,
        description: report.template.description
      }
    }

    // Add version history
    if (options.includeVersionHistory && report.versions?.length > 0) {
      data.version_history = report.versions.map((v: any) => ({
        id: v.id,
        version: v.version,
        generated_at: v.generatedAt,
        headline: v.combinedHeadline,
        status: v.status
      }))
    }

    // Add export history
    if (report.exports?.length > 0) {
      data.exports = report.exports.map((e: any) => ({
        id: e.id,
        format: e.format,
        filename: e.filename,
        file_size: e.fileSize,
        created_at: e.createdAt
      }))
    }

    return data
  }

  /**
   * Generate collection analytics
   */
  private static generateCollectionAnalytics(reports: any[]) {
    const totalWords = reports.reduce((sum, r) => sum + (r.wordCount || 0), 0)
    const totalViews = reports.reduce((sum, r) => sum + (r.viewCount || 0), 0)
    const totalDownloads = reports.reduce((sum, r) => sum + (r.downloadCount || 0), 0)
    const totalReadingTime = reports.reduce((sum, r) => sum + (r.readingTime || 0), 0)
    const totalGenerationTime = reports.reduce((sum, r) => sum + (r.generationTime || 0), 0)

    const providers = [...new Set(reports.map(r => r.llmProvider).filter(Boolean))]
    const statuses = reports.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total_reports: reports.length,
      total_words: totalWords,
      total_reading_time: totalReadingTime,
      total_views: totalViews,
      total_downloads: totalDownloads,
      total_generation_time: totalGenerationTime,
      average_words_per_report: reports.length > 0 ? Math.round(totalWords / reports.length) : 0,
      average_reading_time_per_report: reports.length > 0 ? Math.round(totalReadingTime / reports.length) : 0,
      average_views_per_report: reports.length > 0 ? Math.round(totalViews / reports.length) : 0,
      average_downloads_per_report: reports.length > 0 ? Math.round(totalDownloads / reports.length) : 0,
      providers_used: providers,
      status_distribution: statuses,
      success_rate: reports.length > 0 ? (statuses['COMPLETED'] || 0) / reports.length : 0
    }
  }

  /**
   * Analyze reports by provider
   */
  private static analyzeByProvider(reports: any[]) {
    const byProvider = reports.reduce((acc, report) => {
      const provider = report.llmProvider || 'unknown'
      if (!acc[provider]) {
        acc[provider] = {
          count: 0,
          total_words: 0,
          total_generation_time: 0,
          total_views: 0,
          total_downloads: 0,
          statuses: {}
        }
      }
      acc[provider].count++
      acc[provider].total_words += report.wordCount || 0
      acc[provider].total_generation_time += report.generationTime || 0
      acc[provider].total_views += report.viewCount || 0
      acc[provider].total_downloads += report.downloadCount || 0
      acc[provider].statuses[report.status] = (acc[provider].statuses[report.status] || 0) + 1
      return acc
    }, {} as Record<string, any>)

    // Calculate averages
    Object.keys(byProvider).forEach(provider => {
      const data = byProvider[provider]
      data.avg_words = Math.round(data.total_words / data.count)
      data.avg_generation_time = Math.round(data.total_generation_time / data.count)
      data.avg_views = Math.round(data.total_views / data.count)
      data.avg_downloads = Math.round(data.total_downloads / data.count)
      data.success_rate = (data.statuses['COMPLETED'] || 0) / data.count
    })

    return byProvider
  }

  /**
   * Analyze reports by status
   */
  private static analyzeByStatus(reports: any[]) {
    return reports.reduce((acc, report) => {
      if (!acc[report.status]) {
        acc[report.status] = {
          count: 0,
          total_words: 0,
          total_views: 0,
          total_downloads: 0
        }
      }
      acc[report.status].count++
      acc[report.status].total_words += report.wordCount || 0
      acc[report.status].total_views += report.viewCount || 0
      acc[report.status].total_downloads += report.downloadCount || 0
      return acc
    }, {} as Record<string, any>)
  }

  /**
   * Analyze reports by date
   */
  private static analyzeByDate(reports: any[]) {
    const byDate = reports.reduce((acc, report) => {
      const date = new Date(report.generatedAt).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          count: 0,
          statuses: {},
          providers: {}
        }
      }
      acc[date].count++
      acc[date].statuses[report.status] = (acc[date].statuses[report.status] || 0) + 1
      const provider = report.llmProvider || 'unknown'
      acc[date].providers[provider] = (acc[date].providers[provider] || 0) + 1
      return acc
    }, {} as Record<string, any>)

    return byDate
  }

  /**
   * Analyze performance metrics
   */
  private static analyzePerformance(reports: any[]) {
    const generationTimes = reports
      .filter(r => r.generationTime)
      .map(r => r.generationTime)
      .sort((a, b) => a - b)

    const tokenCounts = reports
      .filter(r => r.totalTokens)
      .map(r => r.totalTokens)
      .sort((a, b) => a - b)

    return {
      generation_time: {
        min: generationTimes.length > 0 ? generationTimes[0] : null,
        max: generationTimes.length > 0 ? generationTimes[generationTimes.length - 1] : null,
        avg: generationTimes.length > 0 ? Math.round(generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length) : null,
        median: generationTimes.length > 0 ? generationTimes[Math.floor(generationTimes.length / 2)] : null
      },
      token_usage: {
        min: tokenCounts.length > 0 ? tokenCounts[0] : null,
        max: tokenCounts.length > 0 ? tokenCounts[tokenCounts.length - 1] : null,
        avg: tokenCounts.length > 0 ? Math.round(tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length) : null,
        total: tokenCounts.reduce((a, b) => a + b, 0)
      }
    }
  }

  /**
   * Analyze content metrics
   */
  private static analyzeContent(reports: any[]) {
    const wordCounts = reports
      .filter(r => r.wordCount)
      .map(r => r.wordCount)
      .sort((a, b) => a - b)

    const readingTimes = reports
      .filter(r => r.readingTime)
      .map(r => r.readingTime)
      .sort((a, b) => a - b)

    return {
      word_count: {
        min: wordCounts.length > 0 ? wordCounts[0] : null,
        max: wordCounts.length > 0 ? wordCounts[wordCounts.length - 1] : null,
        avg: wordCounts.length > 0 ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length) : null,
        median: wordCounts.length > 0 ? wordCounts[Math.floor(wordCounts.length / 2)] : null,
        total: wordCounts.reduce((a, b) => a + b, 0)
      },
      reading_time: {
        min: readingTimes.length > 0 ? readingTimes[0] : null,
        max: readingTimes.length > 0 ? readingTimes[readingTimes.length - 1] : null,
        avg: readingTimes.length > 0 ? Math.round(readingTimes.reduce((a, b) => a + b, 0) / readingTimes.length) : null,
        total: readingTimes.reduce((a, b) => a + b, 0)
      }
    }
  }

  /**
   * Analyze usage metrics
   */
  private static analyzeUsage(reports: any[]) {
    const viewCounts = reports.map(r => r.viewCount || 0).sort((a, b) => a - b)
    const downloadCounts = reports.map(r => r.downloadCount || 0).sort((a, b) => a - b)

    const topViewed = reports
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5)
      .map(r => ({ id: r.id, headline: r.combinedHeadline, views: r.viewCount || 0 }))

    const topDownloaded = reports
      .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
      .slice(0, 5)
      .map(r => ({ id: r.id, headline: r.combinedHeadline, downloads: r.downloadCount || 0 }))

    return {
      views: {
        total: viewCounts.reduce((a, b) => a + b, 0),
        avg: viewCounts.length > 0 ? Math.round(viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length) : 0,
        max: viewCounts.length > 0 ? viewCounts[viewCounts.length - 1] : 0,
        top_reports: topViewed
      },
      downloads: {
        total: downloadCounts.reduce((a, b) => a + b, 0),
        avg: downloadCounts.length > 0 ? Math.round(downloadCounts.reduce((a, b) => a + b, 0) / downloadCounts.length) : 0,
        max: downloadCounts.length > 0 ? downloadCounts[downloadCounts.length - 1] : 0,
        top_reports: topDownloaded
      }
    }
  }

  /**
   * Analyze trends over time
   */
  private static analyzeTrends(reports: any[]) {
    // Sort reports by date
    const sortedReports = reports.sort((a, b) => 
      new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
    )

    // Group by week
    const weeklyData = sortedReports.reduce((acc, report) => {
      const date = new Date(report.generatedAt)
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!acc[weekKey]) {
        acc[weekKey] = {
          reports_count: 0,
          total_words: 0,
          total_views: 0,
          total_downloads: 0
        }
      }

      acc[weekKey].reports_count++
      acc[weekKey].total_words += report.wordCount || 0
      acc[weekKey].total_views += report.viewCount || 0
      acc[weekKey].total_downloads += report.downloadCount || 0

      return acc
    }, {} as Record<string, any>)

    return {
      weekly_data: weeklyData,
      total_weeks: Object.keys(weeklyData).length,
      avg_reports_per_week: Object.keys(weeklyData).length > 0 
        ? Math.round(reports.length / Object.keys(weeklyData).length)
        : 0
    }
  }

  /**
   * Get date range string for multiple reports
   */
  private static getDateRange(reports: any[]): string {
    const dates = reports.map(r => new Date(r.generatedAt)).sort((a, b) => a.getTime() - b.getTime())
    const first = dates[0].toISOString().split('T')[0]
    const last = dates[dates.length - 1].toISOString().split('T')[0]

    if (first === last) {
      return first
    } else {
      return `${first}_to_${last}`
    }
  }
}