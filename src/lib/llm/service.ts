import { createLlmProvider, LlmProviderInterface } from './providers'
import { LlmFunctions, LlmFunctionExecutor } from './functions'
import { LlmProvider, LlmConfig, ChatMessage } from '@/lib/types/space-weather'
import { db } from '@/lib/db'

export interface ChatContext {
  conversationId?: string
  reportId?: string
  userId?: string
}

export interface ChatResponse {
  content?: string
  toolCalls?: Array<{
    name: string
    parameters: any
    result?: any
  }>
  conversationId: string
}

export class LlmService {
  private provider: LlmProviderInterface
  private functionExecutor: LlmFunctionExecutor
  private config: LlmConfig

  constructor(
    providerType: LlmProvider = 'OPENAI',
    config: Partial<LlmConfig> = {}
  ) {
    this.provider = createLlmProvider(providerType)
    this.functionExecutor = new LlmFunctionExecutor()
    this.config = {
      provider: providerType,
      model: this.getDefaultModel(providerType),
      temperature: 0.7,
      maxTokens: 2000,
      streaming: false,
      ...config
    }
  }

  private getDefaultModel(provider: LlmProvider): string {
    switch (provider) {
      case 'OPENAI':
        return 'gpt-4'
      case 'ANTHROPIC':
        return 'claude-3-haiku-20240307'
      case 'GOOGLE':
        return 'gemini-pro'
      default:
        return 'gpt-4'
    }
  }

  async generateReport(
    sources: string[],
    customInstructions?: string
  ): Promise<{
    markdownContent: string
    htmlContent: string
    metadata: any
  }> {
    try {
      // First, fetch the latest reports
      const reportsResult = await this.functionExecutor.executeFunction(
        'fetch_latest_reports',
        { sources, forceRefresh: true }
      )

      if (!reportsResult.success) {
        throw new Error(`Failed to fetch reports: ${reportsResult.error}`)
      }

      // Create report generation prompt
      const prompt = this.createReportPrompt(reportsResult.data, customInstructions)

      // Generate the report content
      const reportContent = await this.provider.generateCompletion(prompt, this.config)

      // Parse the generated content to separate markdown and create HTML
      const { markdownContent, metadata } = this.parseReportContent(reportContent)
      const htmlContent = await this.convertMarkdownToHtml(markdownContent)

      return {
        markdownContent,
        htmlContent,
        metadata: {
          ...metadata,
          sources: reportsResult.data.map((r: any) => r.source),
          generatedAt: new Date().toISOString(),
          llmProvider: this.config.provider,
          llmModel: this.config.model
        }
      }
    } catch (error) {
      throw new Error(`Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async chatWithAssistant(
    message: string,
    context: ChatContext = {}
  ): Promise<ChatResponse> {
    try {
      // Load conversation history if continuing
      let conversationHistory: ChatMessage[] = []
      let conversationId = context.conversationId

      if (conversationId) {
        const conversation = await db.chatConversation.findUnique({
          where: { id: conversationId },
          include: { messages: true }
        })

        if (conversation) {
          conversationHistory = conversation.messages.map(m => ({
            role: m.role,
            content: m.content,
            toolCalls: m.toolCalls
          }))
        }
      } else {
        // Create new conversation
        const conversation = await db.chatConversation.create({
          data: {
            reportId: context.reportId,
            provider: this.config.provider,
            model: this.config.model
          }
        })
        conversationId = conversation.id
      }

      // Add current message to history
      conversationHistory.push({
        role: 'user',
        content: message
      })

      // Prepare system message with context
      const systemMessage = this.createSystemMessage(context)
      const messages = [
        { role: 'system', content: systemMessage },
        ...conversationHistory
      ]

      // Get available functions
      const availableFunctions = Object.values(LlmFunctions)

      // Generate response with tools
      const response = await this.provider.generateCompletionWithTools(
        messages,
        availableFunctions,
        this.config
      )

      // Execute any tool calls
      const toolResults: Array<{ name: string; parameters: any; result: any }> = []
      
      if (response.toolCalls) {
        for (const toolCall of response.toolCalls) {
          try {
            const result = await this.functionExecutor.executeFunction(
              toolCall.name,
              toolCall.parameters
            )
            toolResults.push({
              name: toolCall.name,
              parameters: toolCall.parameters,
              result
            })
          } catch (error) {
            toolResults.push({
              name: toolCall.name,
              parameters: toolCall.parameters,
              result: { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            })
          }
        }
      }

      // Save messages to database
      await db.chatMessage.create({
        data: {
          conversationId,
          role: 'user',
          content: message
        }
      })

      await db.chatMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: response.content || '',
          toolCalls: toolResults.length > 0 ? toolResults : undefined
        }
      })

      return {
        content: response.content,
        toolCalls: toolResults,
        conversationId
      }
    } catch (error) {
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async streamChat(
    message: string,
    onChunk: (chunk: string) => void,
    context: ChatContext = {}
  ): Promise<string> {
    try {
      const systemMessage = this.createSystemMessage(context)
      const prompt = `${systemMessage}\n\nUser: ${message}\nAssistant:`

      let fullResponse = ''
      await this.provider.streamCompletion(
        prompt,
        (chunk) => {
          fullResponse += chunk
          onChunk(chunk)
        },
        this.config
      )

      return fullResponse
    } catch (error) {
      throw new Error(`Streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private createReportPrompt(sources: any[], customInstructions?: string): string {
    const currentDate = new Date().toLocaleDateString()
    
    return `You are a space weather analyst creating a comprehensive daily report. 

Date: ${currentDate}

Data Sources:
${sources.map((source, index) => `
${index + 1}. ${source.source} (${source.headline})
   Summary: ${source.summary}
   Details: ${source.details?.substring(0, 500)}...
   Quality Score: ${source.qualityScore || 'N/A'}
`).join('\n')}

${customInstructions ? `Special Instructions: ${customInstructions}\n` : ''}

Create a comprehensive space weather report with the following structure:

# Space Weather Daily Report - ${currentDate}

## Executive Summary
[2-3 sentences highlighting the most important space weather conditions]

## Current Conditions
### Solar Activity
[Analysis of solar flares, active regions, and solar wind]

### Geomagnetic Activity
[Current geomagnetic conditions and Kp index analysis]

### Radiation Environment
[Solar energetic particle events and radiation levels]

## 72-Hour Forecast
[Expected conditions over the next 3 days]

## Risk Assessment
### Satellite Operations
[Impact assessment for satellite systems]

### Communications
[HF radio and GPS system impacts]

### Power Systems
[Geomagnetically induced current risks]

## Recommendations
[Operational recommendations for different sectors]

---
*Report generated by AI analysis of ${sources.length} data sources*

Please format the response as clean Markdown with clear headers and professional language suitable for operational use.`
  }

  private createSystemMessage(context: ChatContext): string {
    return `You are an expert space weather analyst assistant. You help users understand space weather data, generate reports, and provide operational guidance.

Available Functions:
- fetch_latest_reports: Get current space weather data from various sources
- compose_report: Create comprehensive reports from multiple data sources  
- save_report: Save generated reports to the database
- summarize_section: Create focused summaries of specific topics
- regenerate_report: Modify existing reports with new requirements
- update_template_variable: Customize report templates

Key Capabilities:
- Analyze space weather conditions and their potential impacts
- Explain technical concepts in accessible language
- Provide operational recommendations for different sectors
- Generate reports in multiple formats (technical, executive, public)
- Help customize and refine report content

Context:
${context.reportId ? `- Currently working with report ID: ${context.reportId}` : '- No specific report context'}
${context.userId ? `- User ID: ${context.userId}` : '- Anonymous session'}

Guidelines:
- Be concise but thorough in your explanations
- Use appropriate technical terminology with clear explanations
- Provide actionable insights when possible
- Ask clarifying questions when user requests are ambiguous
- Use function calls when you need to fetch data or perform actions`
  }

  private parseReportContent(content: string): { markdownContent: string; metadata: any } {
    // Simple parsing - in production this could be more sophisticated
    const lines = content.split('\n')
    const metadata = {
      title: lines.find(line => line.startsWith('# '))?.replace('# ', '') || 'Space Weather Report',
      sections: lines.filter(line => line.startsWith('## ')).map(line => line.replace('## ', '')),
      wordCount: content.split(/\s+/).length,
      generatedAt: new Date().toISOString()
    }

    return {
      markdownContent: content,
      metadata
    }
  }

  private async convertMarkdownToHtml(markdown: string): Promise<string> {
    // Simple markdown to HTML conversion
    // In production, use a proper markdown parser like 'marked' or 'remark'
    let html = markdown
      .replace(/^# (.+$)/gm, '<h1>$1</h1>')
      .replace(/^## (.+$)/gm, '<h2>$1</h2>')
      .replace(/^### (.+$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^\- (.+$)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h123]|<li|<\/p|<p)/gm, '<p>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')

    return `<div class="space-weather-report">${html}</div>`
  }
}

// Default service instance
let defaultService: LlmService | null = null

export function getLlmService(
  provider?: LlmProvider,
  config?: Partial<LlmConfig>
): LlmService {
  if (!defaultService) {
    const defaultProvider = (process.env.DEFAULT_LLM_PROVIDER as LlmProvider) || 'OPENAI'
    defaultService = new LlmService(provider || defaultProvider, config)
  }
  return defaultService
}

// Reset service (useful for testing)
export function resetLlmService(): void {
  defaultService = null
}