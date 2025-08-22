import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'json'

export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  includeStyles?: boolean
  fileName?: string
  pageSize?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
}

export interface ExportResult {
  content: string | Blob
  mimeType: string
  fileName: string
  format: ExportFormat
}

export class ExportService {
  /**
   * Export report content in specified format
   */
  async export(
    content: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    const timestamp = new Date().toISOString().split('T')[0]
    const baseFileName = options.fileName || `space-weather-report-${timestamp}`

    switch (options.format) {
      case 'markdown':
        return this.exportMarkdown(content, baseFileName, options)
      
      case 'html':
        return await this.exportHtml(content, baseFileName, options)
      
      case 'pdf':
        return await this.exportPdf(content, baseFileName, options)
      
      case 'json':
        return this.exportJson(content, baseFileName, options)
      
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }

  /**
   * Export as Markdown
   */
  private exportMarkdown(
    content: string,
    fileName: string,
    options: ExportOptions
  ): ExportResult {
    let markdown = content

    if (options.includeMetadata) {
      const metadata = this.generateMetadata()
      markdown = `${metadata}\n\n${markdown}`
    }

    return {
      content: markdown,
      mimeType: 'text/markdown',
      fileName: `${fileName}.md`,
      format: 'markdown'
    }
  }

  /**
   * Export as HTML
   */
  private async exportHtml(
    content: string,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    // Convert markdown to HTML
    const rawHtml = await marked(content)
    const sanitizedHtml = DOMPurify.sanitize(rawHtml)

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Space Weather Report - ${new Date().toLocaleDateString()}</title>`

    if (options.includeStyles) {
      html += `
    <style>
        ${this.getDefaultStyles()}
    </style>`
    }

    html += `
</head>
<body>
    <div class="container">
        ${options.includeMetadata ? this.generateHtmlMetadata() : ''}
        <main class="report-content">
            ${sanitizedHtml}
        </main>
        <footer>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </footer>
    </div>
</body>
</html>`

    return {
      content: html,
      mimeType: 'text/html',
      fileName: `${fileName}.html`,
      format: 'html'
    }
  }

  /**
   * Export as PDF
   */
  private async exportPdf(
    content: string,
    fileName: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    // First convert to HTML
    const htmlResult = await this.exportHtml(content, fileName, {
      ...options,
      includeStyles: true
    })

    // For client-side PDF generation, we'll prepare the HTML
    // and return instructions for using a library like jsPDF or pdfmake
    // In a real implementation, you might use puppeteer on the server

    const pdfConfig = {
      html: htmlResult.content,
      pageSize: options.pageSize || 'A4',
      orientation: options.orientation || 'portrait',
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    }

    // This would be handled by a PDF library in the actual implementation
    // For now, we'll return the config that can be used by the client
    return {
      content: JSON.stringify(pdfConfig),
      mimeType: 'application/pdf',
      fileName: `${fileName}.pdf`,
      format: 'pdf'
    }
  }

  /**
   * Export as JSON
   */
  private exportJson(
    content: string,
    fileName: string,
    options: ExportOptions
  ): ExportResult {
    const sections = this.parseMarkdownToSections(content)
    
    const jsonData = {
      report: {
        generatedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0',
        sections,
        metadata: options.includeMetadata ? this.generateJsonMetadata() : undefined,
        rawMarkdown: content
      }
    }

    return {
      content: JSON.stringify(jsonData, null, 2),
      mimeType: 'application/json',
      fileName: `${fileName}.json`,
      format: 'json'
    }
  }

  /**
   * Generate metadata for exports
   */
  private generateMetadata(): string {
    return `---
title: Space Weather Report
date: ${new Date().toISOString()}
generator: Space Weather Report Generator v1.0
format: markdown
---`
  }

  private generateHtmlMetadata(): string {
    return `
    <header class="report-metadata">
        <h1>Space Weather Report</h1>
        <div class="metadata">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Format:</strong> HTML</p>
            <p><strong>Version:</strong> 1.0</p>
        </div>
    </header>`
  }

  private generateJsonMetadata(): Record<string, any> {
    return {
      title: 'Space Weather Report',
      generatedAt: new Date().toISOString(),
      generator: 'Space Weather Report Generator',
      version: '1.0',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }

  /**
   * Parse markdown content into structured sections
   */
  private parseMarkdownToSections(markdown: string): Array<{
    level: number
    title: string
    content: string
  }> {
    const lines = markdown.split('\n')
    const sections: Array<{ level: number; title: string; content: string }> = []
    let currentSection: { level: number; title: string; content: string } | null = null

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (headerMatch) {
        if (currentSection) {
          sections.push(currentSection)
        }
        
        currentSection = {
          level: headerMatch[1].length,
          title: headerMatch[2],
          content: ''
        }
      } else if (currentSection) {
        currentSection.content += line + '\n'
      }
    }

    if (currentSection) {
      sections.push(currentSection)
    }

    return sections
  }

  /**
   * Get default CSS styles for HTML export
   */
  private getDefaultStyles(): string {
    return `
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        
        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 40px;
        }
        
        h1 {
            color: #2563eb;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        
        h2 {
            color: #1e40af;
            margin-top: 30px;
            margin-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
        }
        
        h3 {
            color: #374151;
            margin-top: 25px;
            margin-bottom: 15px;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid #d1d5db;
            padding: 12px;
            text-align: left;
        }
        
        th {
            background-color: #f3f4f6;
            font-weight: 600;
            color: #111827;
        }
        
        tr:nth-child(even) {
            background-color: #f9fafb;
        }
        
        strong {
            color: #111827;
            font-weight: 600;
        }
        
        em {
            color: #6b7280;
        }
        
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 8px 0;
        }
        
        .metadata {
            background-color: #f3f4f6;
            border-left: 4px solid #2563eb;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .metadata p {
            margin: 5px 0;
        }
        
        footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        @media print {
            body {
                background-color: white;
            }
            
            .container {
                box-shadow: none;
                padding: 0;
            }
            
            h1 {
                page-break-after: avoid;
            }
            
            h2, h3 {
                page-break-after: avoid;
            }
            
            table {
                page-break-inside: avoid;
            }
        }
    `
  }

  /**
   * Create a downloadable file in the browser
   */
  createDownload(result: ExportResult): void {
    let blob: Blob
    
    if (result.content instanceof Blob) {
      blob = result.content
    } else {
      blob = new Blob([result.content], { type: result.mimeType })
    }
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.fileName
    link.click()
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  /**
   * Preview content in a new window
   */
  preview(result: ExportResult): void {
    if (result.format === 'html') {
      const previewWindow = window.open('', '_blank')
      if (previewWindow) {
        previewWindow.document.write(result.content as string)
        previewWindow.document.close()
      }
    } else {
      // For other formats, create a simple HTML preview
      const previewHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Preview - ${result.fileName}</title>
            <style>
                body { 
                    font-family: monospace; 
                    padding: 20px; 
                    background: #f5f5f5;
                }
                pre { 
                    background: white; 
                    padding: 20px; 
                    border-radius: 8px;
                    overflow: auto;
                }
            </style>
        </head>
        <body>
            <h2>Preview: ${result.fileName}</h2>
            <pre>${result.content}</pre>
        </body>
        </html>
      `
      
      const previewWindow = window.open('', '_blank')
      if (previewWindow) {
        previewWindow.document.write(previewHtml)
        previewWindow.document.close()
      }
    }
  }
}

// Export singleton instance
export const exportService = new ExportService()

export default ExportService