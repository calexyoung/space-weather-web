import { ExportFormat } from '@prisma/client'
import { ExportMetadata } from './markdown-exporter'
import { escapeHTML, sanitizeHTML } from '@/lib/security/sanitizer'

export interface HtmlExportOptions {
  includeSources?: boolean
  includeMetadata?: boolean
  includeGenerationDetails?: boolean
  includeAnalytics?: boolean
  customStyles?: string
  theme?: 'light' | 'dark' | 'modern'
  printOptimized?: boolean
  embedStyles?: boolean
}

export class HtmlExporter {
  /**
   * Export a report to HTML format
   */
  static async exportReport(report: any, options: HtmlExportOptions = {}): Promise<{ content: string; metadata: ExportMetadata }> {
    const {
      includeSources = true,
      includeMetadata = true,
      includeGenerationDetails = true,
      includeAnalytics = false,
      theme = 'modern',
      printOptimized = false,
      embedStyles = true
    } = options

    const timestamp = new Date(report.generatedAt).toISOString().split('T')[0]
    const filename = `space-weather-report-${timestamp}.html`

    const styles = this.getStyles(theme, printOptimized, options.customStyles)
    const content = this.generateHtmlContent(report, {
      includeSources,
      includeMetadata,
      includeGenerationDetails,
      includeAnalytics,
      embedStyles,
      styles
    })

    const fileSize = Buffer.byteLength(content, 'utf8')

    return {
      content,
      metadata: {
        reportId: report.id,
        format: 'HTML',
        filename,
        fileSize,
        exportedAt: new Date(),
      }
    }
  }

  /**
   * Export multiple reports to a single HTML document
   */
  static async exportMultipleReports(reports: any[], options: HtmlExportOptions = {}): Promise<{ content: string; metadata: ExportMetadata }> {
    const {
      includeSources = true,
      includeMetadata = false,
      includeGenerationDetails = false,
      includeAnalytics = true,
      theme = 'modern',
      printOptimized = false,
      embedStyles = true
    } = options

    const dateRange = this.getDateRange(reports)
    const filename = `space-weather-reports-${dateRange}.html`
    const styles = this.getStyles(theme, printOptimized, options.customStyles)

    let content = this.generateHtmlStart(styles, embedStyles)
    
    content += `<div class="document-header">
      <h1>Space Weather Reports Collection</h1>
      <p class="meta">Collection of ${reports.length} reports</p>
    </div>`

    if (includeAnalytics) {
      content += this.generateCollectionAnalytics(reports)
    }

    content += `<hr class="section-divider">`

    // Export each report
    reports.forEach((report, index) => {
      content += `<div class="report-section" id="report-${index + 1}">
        <div class="report-header">
          <h2>Report ${index + 1}: ${this.escapeHtml(report.combinedHeadline)}</h2>
          <p class="meta">Generated on ${new Date(report.generatedAt).toLocaleString()}</p>
        </div>
        
        <div class="section">
          <h3>Executive Summary</h3>
          <div class="content-box">
            ${this.formatText(report.executiveSummary)}
          </div>
        </div>
        
        <div class="section">
          <h3>72-Hour Outlook</h3>
          <div class="content-box">
            ${this.formatText(report.outlookNext72h)}
          </div>
        </div>`

      if (includeMetadata) {
        content += this.generateBasicMetadata(report)
      }

      if (includeSources && report.sources?.length > 0) {
        content += this.generateSourcesSection(report.sources)
      }

      content += `</div><hr class="section-divider">`
    })

    content += this.generateHtmlEnd()

    const fileSize = Buffer.byteLength(content, 'utf8')

    return {
      content,
      metadata: {
        reportId: 'collection',
        format: 'HTML',
        filename,
        fileSize,
        exportedAt: new Date(),
      }
    }
  }

  /**
   * Generate complete HTML content for a single report
   */
  private static generateHtmlContent(report: any, options: any): string {
    let content = this.generateHtmlStart(options.styles, options.embedStyles)

    // Header
    content += `<div class="document-header">
      <h1>${this.escapeHtml(report.combinedHeadline)}</h1>
      <p class="meta">Generated on ${new Date(report.generatedAt).toLocaleString()}</p>`

    // Status badge
    if (report.status !== 'COMPLETED') {
      content += `<div class="status-badge status-${report.status.toLowerCase()}">${report.status}</div>`
    }

    content += `</div>`

    // Executive Summary
    content += `<div class="section">
      <h2>Executive Summary</h2>
      <div class="content-box highlight">
        ${this.formatText(report.executiveSummary)}
      </div>
    </div>`

    // 72-Hour Outlook
    content += `<div class="section">
      <h2>72-Hour Outlook</h2>
      <div class="content-box highlight">
        ${this.formatText(report.outlookNext72h)}
      </div>
    </div>`

    // Full Report Content
    if (report.htmlContent) {
      content += `<div class="section">
        <h2>Full Report</h2>
        <div class="content-box">
          ${report.htmlContent}
        </div>
      </div>`
    } else if (report.markdownContent && report.markdownContent !== report.executiveSummary) {
      content += `<div class="section">
        <h2>Full Report</h2>
        <div class="content-box">
          ${this.formatText(report.markdownContent)}
        </div>
      </div>`
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
    content += `<div class="footer">
      <p><em>This report was generated using automated space weather data analysis.</em></p>
      <p><em>Export generated on ${new Date().toLocaleString()}</em></p>
    </div>`

    content += this.generateHtmlEnd()

    return content
  }

  /**
   * Generate HTML document start
   */
  private static generateHtmlStart(styles: string, embedStyles: boolean = true): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Space Weather Report</title>
    ${embedStyles ? `<style>${styles}</style>` : ''}
    <meta name="generator" content="Space Weather Report System">
</head>
<body>`
  }

  /**
   * Generate HTML document end
   */
  private static generateHtmlEnd(): string {
    return `</body>
</html>`
  }

  /**
   * Get CSS styles based on theme
   */
  private static getStyles(theme: string = 'modern', printOptimized: boolean = false, customStyles?: string): string {
    const baseStyles = this.getBaseStyles()
    const themeStyles = this.getThemeStyles(theme)
    const printStyles = printOptimized ? this.getPrintStyles() : ''
    const customStylesStr = customStyles || ''

    return `${baseStyles}\n${themeStyles}\n${printStyles}\n${customStylesStr}`
  }

  /**
   * Base CSS styles
   */
  private static getBaseStyles(): string {
    return `
      * {
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .document-header {
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 3px solid var(--primary-color);
      }
      
      .document-header h1 {
        margin: 0 0 0.5rem 0;
        color: var(--primary-color);
        font-size: 2rem;
        font-weight: 700;
      }
      
      .meta {
        color: var(--text-muted);
        font-style: italic;
        margin: 0;
      }
      
      .section {
        margin-bottom: 2rem;
      }
      
      .section h2 {
        color: var(--secondary-color);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
        margin-bottom: 1rem;
        font-size: 1.5rem;
      }
      
      .section h3 {
        color: var(--secondary-color);
        margin-bottom: 0.75rem;
        font-size: 1.25rem;
      }
      
      .content-box {
        background: var(--content-bg);
        padding: 1.5rem;
        border-radius: 8px;
        margin: 1rem 0;
        border-left: 4px solid var(--border-color);
      }
      
      .content-box.highlight {
        border-left-color: var(--primary-color);
        background: var(--highlight-bg);
      }
      
      .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        margin-top: 0.5rem;
      }
      
      .status-completed { background: #d4edda; color: #155724; }
      .status-failed { background: #f8d7da; color: #721c24; }
      .status-generating { background: #fff3cd; color: #856404; }
      .status-draft { background: #e2e3e5; color: #383d41; }
      .status-archived { background: #d1ecf1; color: #0c5460; }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
      }
      
      .stat-item {
        background: var(--stat-bg);
        padding: 1rem;
        border-radius: 8px;
        text-align: center;
      }
      
      .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary-color);
        display: block;
      }
      
      .stat-label {
        color: var(--text-muted);
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }
      
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }
      
      .data-table th,
      .data-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
      }
      
      .data-table th {
        background: var(--table-header-bg);
        font-weight: 600;
        color: var(--secondary-color);
      }
      
      .data-table tr:hover {
        background: var(--table-hover-bg);
      }
      
      .sources-list {
        list-style: none;
        padding: 0;
      }
      
      .source-item {
        background: var(--content-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
      }
      
      .source-header {
        font-weight: 600;
        color: var(--secondary-color);
        margin-bottom: 0.5rem;
      }
      
      .source-details {
        font-size: 0.875rem;
        color: var(--text-muted);
      }
      
      .section-divider {
        border: none;
        height: 2px;
        background: linear-gradient(to right, var(--primary-color), transparent);
        margin: 2rem 0;
      }
      
      .footer {
        border-top: 1px solid var(--border-color);
        margin-top: 2rem;
        padding-top: 1rem;
        text-align: center;
        font-size: 0.875rem;
        color: var(--text-muted);
      }
      
      .metadata-code {
        background: var(--code-bg);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 1rem;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 0.875rem;
        overflow-x: auto;
        white-space: pre;
      }
      
      .report-section {
        margin-bottom: 3rem;
      }
      
      .report-header {
        margin-bottom: 1.5rem;
      }
    `
  }

  /**
   * Theme-specific styles
   */
  private static getThemeStyles(theme: string): string {
    switch (theme) {
      case 'dark':
        return `
          :root {
            --primary-color: #60a5fa;
            --secondary-color: #93c5fd;
            --text-color: #f3f4f6;
            --text-muted: #9ca3af;
            --bg-color: #111827;
            --content-bg: #1f2937;
            --highlight-bg: #1e3a8a;
            --stat-bg: #374151;
            --table-header-bg: #374151;
            --table-hover-bg: #2d3748;
            --border-color: #4b5563;
            --code-bg: #0f172a;
          }
          
          body {
            background-color: var(--bg-color);
            color: var(--text-color);
          }
        `

      case 'light':
        return `
          :root {
            --primary-color: #2563eb;
            --secondary-color: #1e40af;
            --text-color: #111827;
            --text-muted: #6b7280;
            --bg-color: #ffffff;
            --content-bg: #f9fafb;
            --highlight-bg: #eff6ff;
            --stat-bg: #f3f4f6;
            --table-header-bg: #f9fafb;
            --table-hover-bg: #f3f4f6;
            --border-color: #d1d5db;
            --code-bg: #f8fafc;
          }
          
          body {
            background-color: var(--bg-color);
            color: var(--text-color);
          }
        `

      case 'modern':
      default:
        return `
          :root {
            --primary-color: #0ea5e9;
            --secondary-color: #0284c7;
            --text-color: #0f172a;
            --text-muted: #64748b;
            --bg-color: #ffffff;
            --content-bg: #f8fafc;
            --highlight-bg: #e0f2fe;
            --stat-bg: #f1f5f9;
            --table-header-bg: #f8fafc;
            --table-hover-bg: #f1f5f9;
            --border-color: #e2e8f0;
            --code-bg: #f8fafc;
          }
          
          body {
            background-color: var(--bg-color);
            color: var(--text-color);
          }
          
          .document-header {
            background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            border: none;
          }
          
          .content-box {
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            border: 1px solid var(--border-color);
          }
          
          .stat-item {
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            border: 1px solid var(--border-color);
          }
        `
    }
  }

  /**
   * Print-optimized styles
   */
  private static getPrintStyles(): string {
    return `
      @media print {
        body {
          font-size: 12pt;
          line-height: 1.4;
          color: #000;
          background: #fff;
        }
        
        .document-header {
          page-break-after: avoid;
        }
        
        .section {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .content-box {
          background: #fff !important;
          border: 1px solid #ccc;
          box-shadow: none;
        }
        
        .status-badge {
          border: 1px solid #000;
        }
        
        .section-divider {
          background: #000;
          height: 1px;
        }
        
        a {
          text-decoration: none;
          color: #000;
        }
        
        a:after {
          content: " (" attr(href) ")";
          font-size: 10pt;
          color: #666;
        }
      }
    `
  }

  /**
   * Generate sources section HTML
   */
  private static generateSourcesSection(sources: any[]): string {
    let content = `<div class="section">
      <h2>Data Sources</h2>
      <ul class="sources-list">`

    sources.forEach((source, index) => {
      content += `<li class="source-item">
        <div class="source-header">${index + 1}. ${this.escapeHtml(source.source)}</div>
        <div class="source-details">
          <strong>Headline:</strong> ${this.escapeHtml(source.headline)}<br>`

      if (source.summary) {
        content += `<strong>Summary:</strong> ${this.escapeHtml(source.summary)}<br>`
      }

      if (source.sourceUrl) {
        content += `<strong>URL:</strong> <a href="${source.sourceUrl}" target="_blank">${source.sourceUrl}</a><br>`
      }

      content += `<strong>Issued:</strong> ${new Date(source.issuedAt).toLocaleString()}<br>
          <strong>Fetched:</strong> ${new Date(source.fetchedAt).toLocaleString()}`

      if (source.geomagneticLevel || source.radioBlackoutLevel || source.radiationStormLevel) {
        content += `<br><strong>Hazard Levels:</strong> `
        const levels = []
        if (source.geomagneticLevel) levels.push(`Geomagnetic: ${source.geomagneticLevel}`)
        if (source.radioBlackoutLevel) levels.push(`Radio Blackout: ${source.radioBlackoutLevel}`)
        if (source.radiationStormLevel) levels.push(`Radiation Storm: ${source.radiationStormLevel}`)
        content += levels.join(', ')
      }

      content += `</div>
      </li>`
    })

    content += `</ul></div>`
    return content
  }

  /**
   * Generate generation details section HTML
   */
  private static generateGenerationDetails(report: any): string {
    let content = `<div class="section">
      <h2>Generation Details</h2>
      <table class="data-table">
        <tbody>
          <tr><td><strong>LLM Provider</strong></td><td>${report.llmProvider || 'Unknown'}</td></tr>
          <tr><td><strong>Model</strong></td><td>${report.llmModel || 'Unknown'}</td></tr>
          <tr><td><strong>Generation Time</strong></td><td>${report.generationTime || 'Unknown'}ms</td></tr>`

    if (report.temperature) {
      content += `<tr><td><strong>Temperature</strong></td><td>${report.temperature}</td></tr>`
    }

    if (report.promptTokens) {
      content += `<tr><td><strong>Prompt Tokens</strong></td><td>${report.promptTokens.toLocaleString()}</td></tr>`
    }

    if (report.completionTokens) {
      content += `<tr><td><strong>Completion Tokens</strong></td><td>${report.completionTokens.toLocaleString()}</td></tr>`
    }

    if (report.totalTokens) {
      content += `<tr><td><strong>Total Tokens</strong></td><td>${report.totalTokens.toLocaleString()}</td></tr>`
    }

    content += `<tr><td><strong>Version</strong></td><td>${report.version}</td></tr>
          <tr><td><strong>Status</strong></td><td><span class="status-badge status-${report.status.toLowerCase()}">${report.status}</span></td></tr>
        </tbody>
      </table>`

    if (report.template) {
      content += `<p><strong>Template Used:</strong> ${this.escapeHtml(report.template.name)}</p>`
      if (report.template.description) {
        content += `<p><em>${this.escapeHtml(report.template.description)}</em></p>`
      }
    }

    content += `</div>`
    return content
  }

  /**
   * Generate analytics section HTML
   */
  private static generateAnalyticsSection(report: any): string {
    let content = `<div class="section">
      <h2>Analytics</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">${(report.wordCount || 0).toLocaleString()}</span>
          <div class="stat-label">Words</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">${report.readingTime || 0}</span>
          <div class="stat-label">Minutes to Read</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">${(report.viewCount || 0).toLocaleString()}</span>
          <div class="stat-label">Views</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">${(report.downloadCount || 0).toLocaleString()}</span>
          <div class="stat-label">Downloads</div>
        </div>
      </div>`

    if (report.lastViewedAt || report.lastDownloadedAt) {
      content += `<table class="data-table">`
      if (report.lastViewedAt) {
        content += `<tr><td><strong>Last Viewed</strong></td><td>${new Date(report.lastViewedAt).toLocaleString()}</td></tr>`
      }
      if (report.lastDownloadedAt) {
        content += `<tr><td><strong>Last Downloaded</strong></td><td>${new Date(report.lastDownloadedAt).toLocaleString()}</td></tr>`
      }
      content += `</table>`
    }

    if (report._count?.exports > 0) {
      content += `<p><strong>Export History:</strong> ${report._count.exports} export(s)</p>`
    }

    content += `</div>`
    return content
  }

  /**
   * Generate metadata section HTML
   */
  private static generateMetadataSection(report: any): string {
    const metadata = {
      id: report.id,
      generated_at: report.generatedAt,
      created_at: report.createdAt,
      updated_at: report.updatedAt,
      version: report.version,
      status: report.status,
      parent_id: report.parentId,
      template_id: report.templateId,
      custom_metadata: report.jsonMetadata
    }

    const content = `<div class="section">
      <h2>Metadata</h2>
      <div class="metadata-code">${this.escapeHtml(JSON.stringify(metadata, null, 2))}</div>
    </div>`

    return content
  }

  /**
   * Generate basic metadata for multi-report exports
   */
  private static generateBasicMetadata(report: any): string {
    let content = `<div class="section">
      <h3>Details</h3>
      <p><strong>Version:</strong> ${report.version} | 
         <strong>Provider:</strong> ${report.llmProvider || 'Unknown'} | 
         <strong>Words:</strong> ${(report.wordCount || 0).toLocaleString()} | 
         <strong>Reading Time:</strong> ${report.readingTime || 0} minutes`

    if (report.viewCount > 0) {
      content += ` | <strong>Views:</strong> ${report.viewCount}`
    }

    content += `</p></div>`
    return content
  }

  /**
   * Generate collection analytics HTML
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

    let content = `<div class="section">
      <h2>Collection Analytics</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">${reports.length}</span>
          <div class="stat-label">Total Reports</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">${totalWords.toLocaleString()}</span>
          <div class="stat-label">Total Words</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">${totalReadingTime}</span>
          <div class="stat-label">Total Minutes</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">${totalViews.toLocaleString()}</span>
          <div class="stat-label">Total Views</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">${totalDownloads.toLocaleString()}</span>
          <div class="stat-label">Total Downloads</div>
        </div>
        <div class="stat-item">
          <span class="stat-value">${Math.round(totalWords / reports.length).toLocaleString()}</span>
          <div class="stat-label">Avg Words/Report</div>
        </div>
      </div>
      
      <h3>Providers Used</h3>
      <p>${providers.join(', ') || 'Unknown'}</p>
      
      <h3>Status Distribution</h3>
      <ul>`

    Object.entries(statuses).forEach(([status, count]) => {
      content += `<li><span class="status-badge status-${status.toLowerCase()}">${status}</span>: ${count}</li>`
    })

    content += `</ul></div>`
    return content
  }

  /**
   * Utility functions
   */
  private static escapeHtml(text: string): string {
    // Use the secure HTML escaping function
    return escapeHTML(text)
  }

  private static formatText(text: string): string {
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
  }

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