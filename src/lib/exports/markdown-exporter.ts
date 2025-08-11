import { ExportFormat } from '@prisma/client'

export interface ExportMetadata {
  reportId: string
  format: ExportFormat
  filename: string
  fileSize: number
  exportedAt: Date
  requestedBy?: string
}

export interface MarkdownExportOptions {
  includeSources?: boolean
  includeMetadata?: boolean
  includeGenerationDetails?: boolean
  includeAnalytics?: boolean
  customTemplate?: string
  frontMatter?: boolean
}

export class MarkdownExporter {
  /**
   * Export a report to Markdown format
   */
  static async exportReport(report: any, options: MarkdownExportOptions = {}): Promise<{ content: string; metadata: ExportMetadata }> {
    const {
      includeSources = true,
      includeMetadata = true,
      includeGenerationDetails = true,
      includeAnalytics = false,
      frontMatter = false
    } = options

    const timestamp = new Date(report.generatedAt).toISOString().split('T')[0]
    const filename = `space-weather-report-${timestamp}.md`

    let content = ''

    // Add front matter if requested (YAML format)
    if (frontMatter) {
      content += this.generateFrontMatter(report)
    }

    // Main content
    content += this.generateMainContent(report, {
      includeSources,
      includeMetadata,
      includeGenerationDetails,
      includeAnalytics
    })

    const fileSize = Buffer.byteLength(content, 'utf8')

    return {
      content,
      metadata: {
        reportId: report.id,
        format: 'MARKDOWN',
        filename,
        fileSize,
        exportedAt: new Date(),
      }
    }
  }

  /**
   * Export multiple reports to a single Markdown document
   */
  static async exportMultipleReports(reports: any[], options: MarkdownExportOptions = {}): Promise<{ content: string; metadata: ExportMetadata }> {
    const {
      includeSources = true,
      includeMetadata = true,
      includeGenerationDetails = false,
      includeAnalytics = true,
    } = options

    const dateRange = this.getDateRange(reports)
    const filename = `space-weather-reports-${dateRange}.md`

    let content = `# Space Weather Reports Collection\n\n`
    content += `*Collection of ${reports.length} reports*\n\n`

    if (includeAnalytics) {
      content += this.generateCollectionAnalytics(reports)
    }

    content += `---\n\n`

    // Export each report
    reports.forEach((report, index) => {
      content += `## Report ${index + 1}: ${report.combinedHeadline}\n\n`
      content += `*Generated on ${new Date(report.generatedAt).toLocaleString()}*\n\n`
      
      content += `### Executive Summary\n\n`
      content += `${report.executiveSummary}\n\n`
      
      content += `### 72-Hour Outlook\n\n`
      content += `${report.outlookNext72h}\n\n`
      
      if (includeMetadata) {
        content += this.generateBasicMetadata(report)
      }
      
      if (includeSources && report.sources?.length > 0) {
        content += this.generateSourcesSection(report.sources)
      }
      
      content += `---\n\n`
    })

    const fileSize = Buffer.byteLength(content, 'utf8')

    return {
      content,
      metadata: {
        reportId: 'collection',
        format: 'MARKDOWN',
        filename,
        fileSize,
        exportedAt: new Date(),
      }
    }
  }

  /**
   * Generate YAML front matter
   */
  private static generateFrontMatter(report: any): string {
    const frontMatter = {
      title: report.combinedHeadline,
      date: report.generatedAt,
      status: report.status,
      version: report.version,
      llm_provider: report.llmProvider,
      llm_model: report.llmModel,
      word_count: report.wordCount,
      reading_time: report.readingTime,
      view_count: report.viewCount,
      download_count: report.downloadCount,
      tags: ['space-weather', 'automated-report'],
      sources: report.sources?.map((s: any) => s.source) || [],
    }

    let yaml = '---\n'
    for (const [key, value] of Object.entries(frontMatter)) {
      if (Array.isArray(value)) {
        yaml += `${key}:\n`
        value.forEach(item => yaml += `  - ${item}\n`)
      } else {
        yaml += `${key}: ${value}\n`
      }
    }
    yaml += '---\n\n'

    return yaml
  }

  /**
   * Generate main markdown content
   */
  private static generateMainContent(report: any, options: any): string {
    let content = ''

    // Title and basic info
    content += `# ${report.combinedHeadline}\n\n`
    content += `*Generated on ${new Date(report.generatedAt).toLocaleString()}*\n\n`

    // Add status badge if not completed
    if (report.status !== 'COMPLETED') {
      content += `> **Status**: ${report.status}\n\n`
    }

    // Executive Summary
    content += `## Executive Summary\n\n`
    content += `${report.executiveSummary}\n\n`

    // 72-Hour Outlook
    content += `## 72-Hour Outlook\n\n`
    content += `${report.outlookNext72h}\n\n`

    // Full Report Content
    if (report.markdownContent && report.markdownContent !== report.executiveSummary) {
      content += `## Full Report\n\n`
      content += `${report.markdownContent}\n\n`
    }

    // Sources
    if (options.includeSources && report.sources?.length > 0) {
      content += this.generateSourcesSection(report.sources)
    }

    // Generation Details
    if (options.includeGenerationDetails) {
      content += this.generateGenerationDetails(report)
    }

    // Analytics
    if (options.includeAnalytics) {
      content += this.generateAnalyticsSection(report)
    }

    // Metadata
    if (options.includeMetadata) {
      content += this.generateMetadataSection(report)
    }

    // Footer
    content += `---\n\n`
    content += `*This report was generated using automated space weather data analysis.*\n`
    content += `*Export generated on ${new Date().toLocaleString()}*\n`

    return content
  }

  /**
   * Generate sources section
   */
  private static generateSourcesSection(sources: any[]): string {
    let content = `## Data Sources\n\n`
    
    sources.forEach((source, index) => {
      content += `### ${index + 1}. ${source.source}\n\n`
      content += `- **Headline**: ${source.headline}\n`
      
      if (source.summary) {
        content += `- **Summary**: ${source.summary}\n`
      }
      
      if (source.sourceUrl) {
        content += `- **URL**: [${source.sourceUrl}](${source.sourceUrl})\n`
      }
      
      content += `- **Issued**: ${new Date(source.issuedAt).toLocaleString()}\n`
      content += `- **Fetched**: ${new Date(source.fetchedAt).toLocaleString()}\n`
      
      if (source.geomagneticLevel || source.radioBlackoutLevel || source.radiationStormLevel) {
        content += `- **Hazard Levels**:\n`
        if (source.geomagneticLevel) content += `  - Geomagnetic: ${source.geomagneticLevel}\n`
        if (source.radioBlackoutLevel) content += `  - Radio Blackout: ${source.radioBlackoutLevel}\n`
        if (source.radiationStormLevel) content += `  - Radiation Storm: ${source.radiationStormLevel}\n`
      }
      
      content += `\n`
    })
    
    return content
  }

  /**
   * Generate generation details section
   */
  private static generateGenerationDetails(report: any): string {
    let content = `## Generation Details\n\n`
    content += `| Metric | Value |\n`
    content += `|--------|-------|\n`
    content += `| **LLM Provider** | ${report.llmProvider || 'Unknown'} |\n`
    content += `| **Model** | ${report.llmModel || 'Unknown'} |\n`
    content += `| **Generation Time** | ${report.generationTime || 'Unknown'}ms |\n`
    
    if (report.temperature) {
      content += `| **Temperature** | ${report.temperature} |\n`
    }
    
    if (report.promptTokens) {
      content += `| **Prompt Tokens** | ${report.promptTokens.toLocaleString()} |\n`
    }
    
    if (report.completionTokens) {
      content += `| **Completion Tokens** | ${report.completionTokens.toLocaleString()} |\n`
    }
    
    if (report.totalTokens) {
      content += `| **Total Tokens** | ${report.totalTokens.toLocaleString()} |\n`
    }
    
    content += `| **Version** | ${report.version} |\n`
    content += `| **Status** | ${report.status} |\n\n`
    
    if (report.template) {
      content += `**Template Used**: ${report.template.name}\n`
      if (report.template.description) {
        content += `*${report.template.description}*\n`
      }
      content += `\n`
    }
    
    return content
  }

  /**
   * Generate analytics section
   */
  private static generateAnalyticsSection(report: any): string {
    let content = `## Analytics\n\n`
    content += `| Metric | Value |\n`
    content += `|--------|-------|\n`
    content += `| **Word Count** | ${(report.wordCount || 0).toLocaleString()} |\n`
    content += `| **Reading Time** | ${report.readingTime || 0} minutes |\n`
    content += `| **View Count** | ${(report.viewCount || 0).toLocaleString()} |\n`
    content += `| **Download Count** | ${(report.downloadCount || 0).toLocaleString()} |\n`
    
    if (report.lastViewedAt) {
      content += `| **Last Viewed** | ${new Date(report.lastViewedAt).toLocaleString()} |\n`
    }
    
    if (report.lastDownloadedAt) {
      content += `| **Last Downloaded** | ${new Date(report.lastDownloadedAt).toLocaleString()} |\n`
    }
    
    content += `\n`
    
    if (report._count?.exports > 0) {
      content += `**Export History**: ${report._count.exports} export(s)\n\n`
    }
    
    return content
  }

  /**
   * Generate metadata section
   */
  private static generateMetadataSection(report: any): string {
    let content = `## Metadata\n\n`
    content += `\`\`\`yaml\n`
    content += `id: ${report.id}\n`
    content += `generated_at: ${report.generatedAt}\n`
    content += `created_at: ${report.createdAt}\n`
    content += `updated_at: ${report.updatedAt}\n`
    content += `version: ${report.version}\n`
    content += `status: ${report.status}\n`
    
    if (report.parentId) {
      content += `parent_id: ${report.parentId}\n`
    }
    
    if (report.templateId) {
      content += `template_id: ${report.templateId}\n`
    }
    
    if (report.jsonMetadata) {
      content += `custom_metadata:\n`
      const jsonStr = JSON.stringify(report.jsonMetadata, null, 2)
      jsonStr.split('\n').forEach(line => {
        content += `  ${line}\n`
      })
    }
    
    content += `\`\`\`\n\n`
    
    return content
  }

  /**
   * Generate basic metadata for multi-report exports
   */
  private static generateBasicMetadata(report: any): string {
    let content = `**Details**: `
    content += `Version ${report.version} | `
    content += `${report.llmProvider || 'Unknown'} | `
    content += `${(report.wordCount || 0).toLocaleString()} words | `
    content += `${report.readingTime || 0} min read`
    
    if (report.viewCount > 0) {
      content += ` | ${report.viewCount} views`
    }
    
    content += `\n\n`
    
    return content
  }

  /**
   * Generate collection analytics
   */
  private static generateCollectionAnalytics(reports: any[]): string {
    const totalWords = reports.reduce((sum, r) => sum + (r.wordCount || 0), 0)
    const totalViews = reports.reduce((sum, r) => sum + (r.viewCount || 0), 0)
    const totalDownloads = reports.reduce((sum, r) => sum + (r.downloadCount || 0), 0)
    const totalReadingTime = reports.reduce((sum, r) => sum + (r.readingTime || 0), 0)
    
    const providers = [...new Set(reports.map(r => r.llmProvider).filter(Boolean))]
    const statuses = reports.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    let content = `## Collection Analytics\n\n`
    content += `| Metric | Value |\n`
    content += `|--------|-------|\n`
    content += `| **Total Reports** | ${reports.length} |\n`
    content += `| **Total Words** | ${totalWords.toLocaleString()} |\n`
    content += `| **Total Reading Time** | ${totalReadingTime} minutes |\n`
    content += `| **Total Views** | ${totalViews.toLocaleString()} |\n`
    content += `| **Total Downloads** | ${totalDownloads.toLocaleString()} |\n`
    content += `| **Average Words per Report** | ${Math.round(totalWords / reports.length).toLocaleString()} |\n`
    content += `| **Providers Used** | ${providers.join(', ') || 'Unknown'} |\n`
    
    content += `\n**Status Distribution**:\n`
    Object.entries(statuses).forEach(([status, count]) => {
      content += `- ${status}: ${count}\n`
    })
    
    content += `\n`
    
    return content
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

  /**
   * Create a summary report in Markdown format
   */
  static async createSummaryReport(reports: any[], title: string = 'Space Weather Report Summary'): Promise<{ content: string; metadata: ExportMetadata }> {
    const filename = `space-weather-summary-${new Date().toISOString().split('T')[0]}.md`
    
    let content = `# ${title}\n\n`
    content += `*Generated on ${new Date().toLocaleString()}*\n\n`
    
    if (reports.length === 0) {
      content += `No reports found for the specified criteria.\n`
    } else {
      content += this.generateCollectionAnalytics(reports)
      
      content += `## Recent Reports\n\n`
      
      reports.slice(0, 10).forEach((report, index) => {
        content += `### ${index + 1}. ${report.combinedHeadline}\n\n`
        content += `**Generated**: ${new Date(report.generatedAt).toLocaleString()}\n\n`
        content += `**Summary**: ${report.executiveSummary.substring(0, 200)}${report.executiveSummary.length > 200 ? '...' : ''}\n\n`
        content += `**Status**: ${report.status} | **Views**: ${report.viewCount || 0} | **Downloads**: ${report.downloadCount || 0}\n\n`
        content += `---\n\n`
      })
      
      if (reports.length > 10) {
        content += `*... and ${reports.length - 10} more reports*\n\n`
      }
    }
    
    content += `---\n\n`
    content += `*This summary was generated automatically.*\n`
    
    const fileSize = Buffer.byteLength(content, 'utf8')
    
    return {
      content,
      metadata: {
        reportId: 'summary',
        format: 'MARKDOWN',
        filename,
        fileSize,
        exportedAt: new Date(),
      }
    }
  }
}