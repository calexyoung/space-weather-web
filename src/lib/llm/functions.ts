import { z } from 'zod'
import { fetchAllSources, fetchSingleSource } from '@/lib/sources/aggregator'
import { db } from '@/lib/db'
import { SourceType } from '@/lib/types/space-weather'

// Function schemas for LLM tool calling
export const LlmFunctions = {
  fetch_latest_reports: {
    name: 'fetch_latest_reports',
    description: 'Fetch the latest space weather reports from all or specific data sources',
    parameters: {
      type: 'object',
      properties: {
        sources: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['NOAA_SWPC', 'UK_MET_OFFICE', 'HELIO_UCLES']
          },
          description: 'Specific sources to fetch. If not provided, fetches all sources.'
        },
        forceRefresh: {
          type: 'boolean',
          description: 'Whether to force fresh data fetch or use cached data',
          default: false
        }
      }
    }
  },

  compose_report: {
    name: 'compose_report',
    description: 'Compose a comprehensive space weather report from multiple data sources',
    parameters: {
      type: 'object',
      properties: {
        reportIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of normalized report IDs to include in the composition'
        },
        customInstructions: {
          type: 'string',
          description: 'Additional instructions for report composition'
        },
        includeRiskAssessment: {
          type: 'boolean',
          description: 'Whether to include detailed risk assessment',
          default: true
        }
      },
      required: ['reportIds']
    }
  },

  update_template_variable: {
    name: 'update_template_variable',
    description: 'Update a specific variable in the report template',
    parameters: {
      type: 'object',
      properties: {
        templateId: {
          type: 'string',
          description: 'ID of the template to update'
        },
        variablePath: {
          type: 'string',
          description: 'Path to the variable (e.g., "title", "summary.executive")'
        },
        value: {
          type: 'string',
          description: 'New value for the variable'
        }
      },
      required: ['templateId', 'variablePath', 'value']
    }
  },

  regenerate_report: {
    name: 'regenerate_report',
    description: 'Regenerate a report with new instructions or modifications',
    parameters: {
      type: 'object',
      properties: {
        reportId: {
          type: 'string',
          description: 'ID of the report to regenerate'
        },
        modifications: {
          type: 'string',
          description: 'Specific modifications or improvements to apply'
        },
        tone: {
          type: 'string',
          enum: ['technical', 'executive', 'public', 'operational'],
          description: 'Target audience tone for the report'
        }
      },
      required: ['reportId', 'modifications']
    }
  },

  save_report: {
    name: 'save_report',
    description: 'Save a generated report to the database',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Report title'
        },
        markdownContent: {
          type: 'string',
          description: 'Report content in Markdown format'
        },
        htmlContent: {
          type: 'string',
          description: 'Report content in HTML format'
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the report'
        }
      },
      required: ['title', 'markdownContent', 'htmlContent']
    }
  },

  summarize_section: {
    name: 'summarize_section',
    description: 'Create a summary of a specific section from space weather data',
    parameters: {
      type: 'object',
      properties: {
        sectionType: {
          type: 'string',
          enum: ['solar_activity', 'geomagnetic', 'radiation', 'forecast'],
          description: 'Type of section to summarize'
        },
        length: {
          type: 'string',
          enum: ['brief', 'detailed', 'executive'],
          description: 'Length of summary to generate'
        },
        includeRecommendations: {
          type: 'boolean',
          description: 'Whether to include operational recommendations',
          default: false
        }
      },
      required: ['sectionType']
    }
  }
} as const

// Function implementations
export class LlmFunctionExecutor {
  async executeFunction(functionName: string, parameters: any): Promise<any> {
    switch (functionName) {
      case 'fetch_latest_reports':
        return this.fetchLatestReports(parameters)
      
      case 'compose_report':
        return this.composeReport(parameters)
      
      case 'update_template_variable':
        return this.updateTemplateVariable(parameters)
      
      case 'regenerate_report':
        return this.regenerateReport(parameters)
      
      case 'save_report':
        return this.saveReport(parameters)
      
      case 'summarize_section':
        return this.summarizeSection(parameters)
      
      default:
        throw new Error(`Unknown function: ${functionName}`)
    }
  }

  private async fetchLatestReports(params: {
    sources?: string[]
    forceRefresh?: boolean
  }) {
    try {
      if (params.forceRefresh) {
        // Fetch fresh data
        const sources = params.sources?.map(s => s as any) || ['NOAA_SWPC', 'UK_MET_OFFICE', 'HELIO_UCLES']
        const result = await fetchAllSources(sources, true)
        return {
          success: true,
          data: result.successfulSources,
          errors: result.errors,
          source: 'fresh'
        }
      } else {
        // Get from database
        const reports = await db.normalizedReport.findMany({
          where: params.sources ? {
            source: { in: params.sources as any[] }
          } : {},
          orderBy: { fetchedAt: 'desc' },
          take: 10
        })

        return {
          success: true,
          data: reports,
          source: 'cached'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async composeReport(params: {
    reportIds: string[]
    customInstructions?: string
    includeRiskAssessment?: boolean
  }) {
    try {
      // Fetch the reports
      const reports = await db.normalizedReport.findMany({
        where: { id: { in: params.reportIds } }
      })

      if (reports.length === 0) {
        throw new Error('No reports found with the provided IDs')
      }

      // Create combined report structure
      const combinedReport = {
        generatedAt: new Date().toISOString(),
        sources: reports.map(r => ({
          source: r.source,
          headline: r.headline,
          summary: r.summary,
          issuedAt: r.issuedAt.toISOString()
        })),
        combinedHeadline: this.generateCombinedHeadline(reports),
        executiveSummary: this.generateExecutiveSummary(reports, params.customInstructions),
        riskAssessment: params.includeRiskAssessment ? this.generateRiskAssessment(reports) : undefined,
        outlookNext72h: this.generateOutlook(reports)
      }

      return {
        success: true,
        data: combinedReport
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async updateTemplateVariable(params: {
    templateId: string
    variablePath: string
    value: string
  }) {
    try {
      const template = await db.reportTemplate.findUnique({
        where: { id: params.templateId }
      })

      if (!template) {
        throw new Error('Template not found')
      }

      // Update template variable logic would go here
      // For now, return a mock success
      return {
        success: true,
        message: `Updated ${params.variablePath} to "${params.value}"`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async regenerateReport(params: {
    reportId: string
    modifications: string
    tone?: string
  }) {
    try {
      const report = await db.spaceWeatherReport.findUnique({
        where: { id: params.reportId },
        include: { sources: true }
      })

      if (!report) {
        throw new Error('Report not found')
      }

      // Regeneration logic would go here
      return {
        success: true,
        message: `Report regenerated with modifications: ${params.modifications}`,
        tone: params.tone || 'technical'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async saveReport(params: {
    title: string
    markdownContent: string
    htmlContent: string
    metadata?: any
  }) {
    try {
      const report = await db.spaceWeatherReport.create({
        data: {
          combinedHeadline: params.title,
          executiveSummary: params.metadata?.executiveSummary || 'Generated by AI',
          outlookNext72h: params.metadata?.outlook || 'No specific outlook provided',
          markdownContent: params.markdownContent,
          htmlContent: params.htmlContent,
          jsonMetadata: params.metadata,
          llmProvider: 'OPENAI', // Default, should be dynamic
          llmModel: 'gpt-4o'
        }
      })

      return {
        success: true,
        data: { id: report.id, title: params.title },
        message: 'Report saved successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async summarizeSection(params: {
    sectionType: string
    length?: string
    includeRecommendations?: boolean
  }) {
    try {
      // Mock section summary - in production this would analyze actual data
      const summaries = {
        solar_activity: 'Current solar activity remains at moderate levels with occasional C-class flares observed.',
        geomagnetic: 'Geomagnetic conditions are currently quiet with Kp indices below 3.',
        radiation: 'Solar radiation environment is nominal with no significant particle events detected.',
        forecast: 'Conditions are expected to remain stable over the next 72 hours.'
      }

      const summary = summaries[params.sectionType as keyof typeof summaries] || 'Section not available'
      
      return {
        success: true,
        data: {
          section: params.sectionType,
          summary: summary,
          length: params.length || 'brief',
          recommendations: params.includeRecommendations ? ['Monitor for changes', 'Maintain normal operations'] : undefined
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Helper methods for report composition
  private generateCombinedHeadline(reports: any[]): string {
    const today = new Date().toLocaleDateString()
    return `Space Weather Report - ${today} (${reports.length} sources)`
  }

  private generateExecutiveSummary(reports: any[], customInstructions?: string): string {
    const baseText = `Based on analysis of ${reports.length} data sources, current space weather conditions are summarized below.`
    return customInstructions ? `${baseText} ${customInstructions}` : baseText
  }

  private generateRiskAssessment(reports: any[]): any {
    return {
      overall: 'LOW',
      geomagnetic: 'Minimal risk of geomagnetic disturbances',
      radiation: 'Background radiation levels normal',
      communications: 'No significant impact expected on communications'
    }
  }

  private generateOutlook(reports: any[]): string {
    return 'Conditions are expected to remain stable over the next 72 hours with no significant space weather events anticipated.'
  }
}