// Export system main entry point
import { ExportFormat } from '@prisma/client'
import { MarkdownExporter, ExportMetadata } from './markdown-exporter'
import { HtmlExporter, HtmlExportOptions } from './html-exporter'
import { JsonExporter, JsonExportOptions } from './json-exporter'
// PDF exporter would be imported here when implemented
// import { PdfExporter, PdfExportOptions } from './pdf-exporter'

export type { ExportMetadata } from './markdown-exporter'
export type { HtmlExportOptions } from './html-exporter'
export type { JsonExportOptions } from './json-exporter'

export interface UnifiedExportOptions {
  format: ExportFormat
  includeSources?: boolean
  includeMetadata?: boolean
  includeGenerationDetails?: boolean
  includeAnalytics?: boolean
  
  // Format-specific options
  markdown?: {
    frontMatter?: boolean
    customTemplate?: string
  }
  html?: {
    theme?: 'light' | 'dark' | 'modern'
    printOptimized?: boolean
    embedStyles?: boolean
    customStyles?: string
  }
  json?: {
    includeRawContent?: boolean
    includeVersionHistory?: boolean
    minifyJson?: boolean
    schemaVersion?: string
  }
  pdf?: {
    pageFormat?: 'A4' | 'Letter' | 'A3'
    orientation?: 'portrait' | 'landscape'
    margins?: { top: number; right: number; bottom: number; left: number }
    headerFooter?: boolean
  }
}

export interface BulkExportOptions extends UnifiedExportOptions {
  includeCollectionAnalytics?: boolean
  separateFiles?: boolean
  zipOutput?: boolean
}

export interface ExportResult {
  success: boolean
  content?: string
  metadata?: ExportMetadata
  error?: string
  filePath?: string
}

export interface BulkExportResult {
  success: boolean
  exports?: ExportResult[]
  zipPath?: string
  error?: string
  summary?: {
    totalReports: number
    successfulExports: number
    failedExports: number
    totalSize: number
  }
}

/**
 * Universal export service that handles all format types
 */
export class ExportService {
  /**
   * Export a single report in the specified format
   */
  static async exportReport(report: any, options: UnifiedExportOptions): Promise<ExportResult> {
    try {
      let result: { content: string; metadata: ExportMetadata }

      switch (options.format) {
        case 'MARKDOWN':
          result = await MarkdownExporter.exportReport(report, {
            includeSources: options.includeSources,
            includeMetadata: options.includeMetadata,
            includeGenerationDetails: options.includeGenerationDetails,
            includeAnalytics: options.includeAnalytics,
            frontMatter: options.markdown?.frontMatter,
            customTemplate: options.markdown?.customTemplate,
          })
          break

        case 'HTML':
          result = await HtmlExporter.exportReport(report, {
            includeSources: options.includeSources,
            includeMetadata: options.includeMetadata,
            includeGenerationDetails: options.includeGenerationDetails,
            includeAnalytics: options.includeAnalytics,
            theme: options.html?.theme,
            printOptimized: options.html?.printOptimized,
            embedStyles: options.html?.embedStyles,
            customStyles: options.html?.customStyles,
          })
          break

        case 'JSON':
          result = await JsonExporter.exportReport(report, {
            includeSources: options.includeSources,
            includeMetadata: options.includeMetadata,
            includeGenerationDetails: options.includeGenerationDetails,
            includeAnalytics: options.includeAnalytics,
            includeRawContent: options.json?.includeRawContent,
            includeVersionHistory: options.json?.includeVersionHistory,
            minifyJson: options.json?.minifyJson,
            schemaVersion: options.json?.schemaVersion,
          })
          break

        case 'PDF':
          // PDF export would be implemented here
          return {
            success: false,
            error: 'PDF export is not yet implemented'
          }

        default:
          return {
            success: false,
            error: `Unsupported export format: ${options.format}`
          }
      }

      return {
        success: true,
        content: result.content,
        metadata: result.metadata,
      }
    } catch (error) {
      console.error('Export error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      }
    }
  }

  /**
   * Export multiple reports
   */
  static async exportMultipleReports(reports: any[], options: BulkExportOptions): Promise<BulkExportResult> {
    try {
      if (options.separateFiles) {
        // Export each report as a separate file
        const exports: ExportResult[] = []
        let totalSize = 0
        let successfulExports = 0
        let failedExports = 0

        for (const report of reports) {
          const result = await this.exportReport(report, options)
          exports.push(result)

          if (result.success) {
            successfulExports++
            if (result.metadata?.fileSize) {
              totalSize += result.metadata.fileSize
            }
          } else {
            failedExports++
          }
        }

        return {
          success: true,
          exports,
          summary: {
            totalReports: reports.length,
            successfulExports,
            failedExports,
            totalSize,
          }
        }
      } else {
        // Export as a single combined file
        let result: { content: string; metadata: ExportMetadata }

        switch (options.format) {
          case 'MARKDOWN':
            result = await MarkdownExporter.exportMultipleReports(reports, {
              includeSources: options.includeSources,
              includeMetadata: options.includeMetadata,
              includeGenerationDetails: options.includeGenerationDetails,
              includeAnalytics: options.includeAnalytics || options.includeCollectionAnalytics,
            })
            break

          case 'HTML':
            result = await HtmlExporter.exportMultipleReports(reports, {
              includeSources: options.includeSources,
              includeMetadata: options.includeMetadata,
              includeGenerationDetails: options.includeGenerationDetails,
              includeAnalytics: options.includeAnalytics || options.includeCollectionAnalytics,
              theme: options.html?.theme,
              printOptimized: options.html?.printOptimized,
              embedStyles: options.html?.embedStyles,
              customStyles: options.html?.customStyles,
            })
            break

          case 'JSON':
            result = await JsonExporter.exportMultipleReports(reports, {
              includeSources: options.includeSources,
              includeMetadata: options.includeMetadata,
              includeGenerationDetails: options.includeGenerationDetails,
              includeAnalytics: options.includeAnalytics || options.includeCollectionAnalytics,
              includeRawContent: options.json?.includeRawContent,
              minifyJson: options.json?.minifyJson,
              schemaVersion: options.json?.schemaVersion,
            })
            break

          case 'PDF':
            return {
              success: false,
              error: 'PDF export for multiple reports is not yet implemented'
            }

          default:
            return {
              success: false,
              error: `Unsupported export format: ${options.format}`
            }
        }

        return {
          success: true,
          exports: [{
            success: true,
            content: result.content,
            metadata: result.metadata,
          }],
          summary: {
            totalReports: reports.length,
            successfulExports: 1,
            failedExports: 0,
            totalSize: result.metadata.fileSize,
          }
        }
      }
    } catch (error) {
      console.error('Bulk export error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown bulk export error'
      }
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(reports: any[], timeRange?: { start: Date; end: Date }): Promise<ExportResult> {
    try {
      const result = await JsonExporter.exportAnalytics(reports, timeRange)
      
      return {
        success: true,
        content: result.content,
        metadata: result.metadata,
      }
    } catch (error) {
      console.error('Analytics export error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export analytics'
      }
    }
  }

  /**
   * Export for API consumption (optimized JSON format)
   */
  static async exportForApi(report: any): Promise<ExportResult> {
    try {
      const result = await JsonExporter.exportForApi(report)
      
      return {
        success: true,
        content: result.content,
        metadata: result.metadata,
      }
    } catch (error) {
      console.error('API export error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export for API'
      }
    }
  }

  /**
   * Create a summary report
   */
  static async createSummaryReport(reports: any[], title?: string, format: ExportFormat = 'MARKDOWN'): Promise<ExportResult> {
    try {
      let result: { content: string; metadata: ExportMetadata }

      switch (format) {
        case 'MARKDOWN':
          result = await MarkdownExporter.createSummaryReport(reports, title)
          break

        case 'JSON':
          result = await JsonExporter.exportAnalytics(reports)
          break

        default:
          return {
            success: false,
            error: `Summary reports not supported for format: ${format}`
          }
      }

      return {
        success: true,
        content: result.content,
        metadata: result.metadata,
      }
    } catch (error) {
      console.error('Summary export error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create summary report'
      }
    }
  }

  /**
   * Get supported formats
   */
  static getSupportedFormats(): ExportFormat[] {
    return ['MARKDOWN', 'HTML', 'JSON'] // 'PDF' would be added when implemented
  }

  /**
   * Validate export options
   */
  static validateExportOptions(options: UnifiedExportOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.getSupportedFormats().includes(options.format)) {
      errors.push(`Unsupported format: ${options.format}`)
    }

    // Format-specific validations
    if (options.format === 'HTML' && options.html?.theme) {
      const validThemes = ['light', 'dark', 'modern']
      if (!validThemes.includes(options.html.theme)) {
        errors.push(`Invalid HTML theme: ${options.html.theme}`)
      }
    }

    if (options.format === 'PDF' && options.pdf?.pageFormat) {
      const validFormats = ['A4', 'Letter', 'A3']
      if (!validFormats.includes(options.pdf.pageFormat)) {
        errors.push(`Invalid PDF page format: ${options.pdf.pageFormat}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get default options for a format
   */
  static getDefaultOptions(format: ExportFormat): UnifiedExportOptions {
    return {
      format,
      includeSources: true,
      includeMetadata: true,
      includeGenerationDetails: true,
      includeAnalytics: false,
      markdown: {
        frontMatter: false,
      },
      html: {
        theme: 'modern',
        printOptimized: false,
        embedStyles: true,
      },
      json: {
        includeRawContent: true,
        includeVersionHistory: false,
        minifyJson: false,
        schemaVersion: '1.0.0',
      },
      pdf: {
        pageFormat: 'A4',
        orientation: 'portrait',
        headerFooter: true,
      }
    }
  }
}

// Re-export specific exporters for direct use
export { MarkdownExporter, HtmlExporter, JsonExporter }

// Default export
export default ExportService