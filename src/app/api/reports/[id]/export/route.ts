import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { ApiResponseSchema } from '@/lib/types/api'

const prisma = new PrismaClient()

const ExportQuerySchema = z.object({
  format: z.enum(['MARKDOWN', 'HTML', 'JSON', 'PDF']).default('MARKDOWN'),
  download: z.coerce.boolean().default(true),
  filename: z.string().optional(),
})

// GET /api/reports/[id]/export - Export a report in specified format
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const query = ExportQuerySchema.parse(Object.fromEntries(searchParams))

    // Get user info for tracking
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Fetch the report
    const report = await prisma.spaceWeatherReport.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        sources: {
          select: {
            id: true,
            source: true,
            sourceUrl: true,
            headline: true,
            summary: true,
            details: true,
            issuedAt: true,
            geomagneticLevel: true,
            radioBlackoutLevel: true,
            radiationStormLevel: true,
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            description: true,
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

    // Generate filename if not provided
    const timestamp = new Date(report.generatedAt).toISOString().split('T')[0]
    const defaultFilename = `space-weather-report-${timestamp}`
    const filename = query.filename || defaultFilename

    let content: string
    let mimeType: string
    let fileExtension: string

    // Generate content based on format
    switch (query.format) {
      case 'MARKDOWN':
        content = await generateMarkdownExport(report)
        mimeType = 'text/markdown'
        fileExtension = 'md'
        break

      case 'HTML':
        content = await generateHtmlExport(report)
        mimeType = 'text/html'
        fileExtension = 'html'
        break

      case 'JSON':
        content = JSON.stringify(generateJsonExport(report), null, 2)
        mimeType = 'application/json'
        fileExtension = 'json'
        break

      case 'PDF':
        // PDF export would require a PDF generation library
        // For now, we'll return an error and implement this later
        return NextResponse.json({
          success: false,
          error: 'PDF export is not yet implemented',
        }, { status: 501 })

      default:
        return NextResponse.json({
          success: false,
          error: 'Unsupported export format',
        }, { status: 400 })
    }

    const fullFilename = `${filename}.${fileExtension}`
    const fileSize = Buffer.byteLength(content, 'utf8')

    // Record the export
    await prisma.reportExport.create({
      data: {
        reportId: id,
        format: query.format,
        filename: fullFilename,
        fileSize,
        requestedBy: 'anonymous', // Could be enhanced with user auth
        ipAddress,
        userAgent,
      }
    })

    // Update report download count and timestamp
    await prisma.spaceWeatherReport.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: new Date(),
      }
    })

    // Return appropriate response
    if (query.download) {
      // Stream the file for download
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${fullFilename}"`,
          'Content-Length': fileSize.toString(),
        },
      })
    } else {
      // Return export info
      const response = ApiResponseSchema(z.any()).parse({
        success: true,
        data: {
          reportId: id,
          format: query.format,
          filename: fullFilename,
          fileSize,
          content,
          exportedAt: new Date(),
        },
      })

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Error exporting report:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid export parameters',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to export report',
    }, { status: 500 })
  }
}

// Export generation functions
async function generateMarkdownExport(report: any): Promise<string> {
  const sources = report.sources || []
  const sourceList = sources.map((s: any) => `- ${s.source}: ${s.headline}`).join('\n')
  
  return `# ${report.combinedHeadline}

*Generated on ${new Date(report.generatedAt).toLocaleString()}*

## Executive Summary

${report.executiveSummary}

## 72-Hour Outlook

${report.outlookNext72h}

---

## Full Report

${report.markdownContent}

---

## Data Sources

${sourceList}

---

## Generation Details

- **LLM Provider**: ${report.llmProvider || 'Unknown'}
- **Model**: ${report.llmModel || 'Unknown'}
- **Generation Time**: ${report.generationTime || 'Unknown'}ms
- **Word Count**: ${report.wordCount || 'Unknown'}
- **Reading Time**: ${report.readingTime || 'Unknown'} minutes
- **Version**: ${report.version}
- **Status**: ${report.status}

*This report was generated using automated space weather data analysis.*
`
}

async function generateHtmlExport(report: any): Promise<string> {
  const sources = report.sources || []
  const sourceList = sources.map((s: any) => 
    `<li><strong>${s.source}</strong>: ${s.headline}</li>`
  ).join('')
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.combinedHeadline}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            border-bottom: 3px solid #007acc;
            margin-bottom: 2em;
            padding-bottom: 1em;
        }
        .header h1 {
            color: #007acc;
            margin-bottom: 0.5em;
        }
        .meta {
            color: #666;
            font-style: italic;
        }
        .section {
            margin-bottom: 2em;
        }
        .section h2 {
            color: #005a9e;
            border-bottom: 1px solid #ddd;
            padding-bottom: 0.5em;
        }
        .highlight-box {
            background: #f8f9fa;
            border-left: 4px solid #007acc;
            padding: 1em;
            margin: 1em 0;
        }
        .sources ul {
            list-style-type: disc;
            margin-left: 1em;
        }
        .footer {
            border-top: 1px solid #ddd;
            margin-top: 2em;
            padding-top: 1em;
            font-size: 0.9em;
            color: #666;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1em;
            margin: 1em 0;
        }
        .stat-item {
            background: #f1f3f4;
            padding: 0.5em;
            border-radius: 4px;
        }
        .stat-item strong {
            color: #007acc;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.combinedHeadline}</h1>
        <p class="meta">Generated on ${new Date(report.generatedAt).toLocaleString()}</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="highlight-box">
            ${report.executiveSummary.replace(/\n/g, '<br>')}
        </div>
    </div>

    <div class="section">
        <h2>72-Hour Outlook</h2>
        <div class="highlight-box">
            ${report.outlookNext72h.replace(/\n/g, '<br>')}
        </div>
    </div>

    <div class="section">
        <h2>Full Report</h2>
        ${report.htmlContent || report.markdownContent.replace(/\n/g, '<br>')}
    </div>

    <div class="section sources">
        <h2>Data Sources</h2>
        <ul>
            ${sourceList}
        </ul>
    </div>

    <div class="section">
        <h2>Generation Details</h2>
        <div class="stats">
            <div class="stat-item">
                <strong>LLM Provider:</strong> ${report.llmProvider || 'Unknown'}
            </div>
            <div class="stat-item">
                <strong>Model:</strong> ${report.llmModel || 'Unknown'}
            </div>
            <div class="stat-item">
                <strong>Generation Time:</strong> ${report.generationTime || 'Unknown'}ms
            </div>
            <div class="stat-item">
                <strong>Word Count:</strong> ${report.wordCount || 'Unknown'}
            </div>
            <div class="stat-item">
                <strong>Reading Time:</strong> ${report.readingTime || 'Unknown'} minutes
            </div>
            <div class="stat-item">
                <strong>Version:</strong> ${report.version}
            </div>
        </div>
    </div>

    <div class="footer">
        <p><em>This report was generated using automated space weather data analysis.</em></p>
    </div>
</body>
</html>`
}

function generateJsonExport(report: any): any {
  return {
    report: {
      id: report.id,
      headline: report.combinedHeadline,
      executiveSummary: report.executiveSummary,
      outlook72h: report.outlookNext72h,
      content: {
        markdown: report.markdownContent,
        html: report.htmlContent,
      },
      metadata: report.jsonMetadata,
      generatedAt: report.generatedAt,
      status: report.status,
      version: report.version,
    },
    generation: {
      llmProvider: report.llmProvider,
      llmModel: report.llmModel,
      generationTime: report.generationTime,
      temperature: report.temperature,
      tokens: {
        prompt: report.promptTokens,
        completion: report.completionTokens,
        total: report.totalTokens,
      },
    },
    analytics: {
      wordCount: report.wordCount,
      readingTime: report.readingTime,
      viewCount: report.viewCount,
      downloadCount: report.downloadCount,
    },
    sources: report.sources?.map((s: any) => ({
      id: s.id,
      type: s.source,
      url: s.sourceUrl,
      headline: s.headline,
      summary: s.summary,
      issuedAt: s.issuedAt,
      hazardLevels: {
        geomagnetic: s.geomagneticLevel,
        radioBlackout: s.radioBlackoutLevel,
        radiationStorm: s.radiationStormLevel,
      },
    })),
    template: report.template ? {
      id: report.template.id,
      name: report.template.name,
      description: report.template.description,
    } : null,
    exported: {
      timestamp: new Date().toISOString(),
      format: 'JSON',
    },
  }
}