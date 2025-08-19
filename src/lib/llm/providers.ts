import { OpenAI } from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { LlmProviderEnum } from '@/lib/types/space-weather'
import { LlmConfig } from '@/lib/types/api'

// Base interface for all LLM providers
export interface LlmProviderInterface {
  generateCompletion(prompt: string, config?: Partial<LlmConfig>): Promise<string>
  generateCompletionWithTools(
    messages: Array<{ role: string; content: string }>,
    tools: Array<{ name: string; description: string; parameters: any }>,
    config?: Partial<LlmConfig>
  ): Promise<{
    content?: string
    toolCalls?: Array<{ name: string; parameters: any }>
  }>
  streamCompletion(
    prompt: string,
    onChunk: (chunk: string) => void,
    config?: Partial<LlmConfig>
  ): Promise<void>
}

// OpenAI Provider
export class OpenAiProvider implements LlmProviderInterface {
  private client: OpenAI
  private defaultModel: string

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    this.defaultModel = 'gpt-4o'
  }

  async generateCompletion(prompt: string, config?: Partial<LlmConfig>): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: config?.model || this.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens || 2000,
    })

    return response.choices[0]?.message?.content || ''
  }

  async generateCompletionWithTools(
    messages: Array<{ role: string; content: string }>,
    tools: Array<{ name: string; description: string; parameters: any }>,
    config?: Partial<LlmConfig>
  ): Promise<{ content?: string; toolCalls?: Array<{ name: string; parameters: any }> }> {
    const response = await this.client.chat.completions.create({
      model: config?.model || this.defaultModel,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      tools: tools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: 'auto',
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens || 2000,
    })

    const choice = response.choices[0]
    if (choice?.message?.tool_calls) {
      return {
        content: choice.message.content || undefined,
        toolCalls: choice.message.tool_calls.map(tc => {
          if ('function' in tc) {
            return {
              name: tc.function.name,
              parameters: JSON.parse(tc.function.arguments),
            }
          }
          // Handle other tool call types if needed
          return {
            name: 'unknown',
            parameters: {},
          }
        }),
      }
    }

    return {
      content: choice?.message?.content || '',
    }
  }

  async streamCompletion(
    prompt: string,
    onChunk: (chunk: string) => void,
    config?: Partial<LlmConfig>
  ): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model: config?.model || this.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens || 2000,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        onChunk(content)
      }
    }
  }
}

// Anthropic Provider
export class AnthropicProvider implements LlmProviderInterface {
  private client: Anthropic
  private defaultModel: string

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
    this.defaultModel = 'claude-3-5-sonnet-20241022'
  }

  async generateCompletion(prompt: string, config?: Partial<LlmConfig>): Promise<string> {
    const response = await this.client.messages.create({
      model: config?.model || this.defaultModel,
      max_tokens: config?.maxTokens || 2000,
      temperature: config?.temperature || 0.7,
      messages: [{ role: 'user', content: prompt }],
    })

    return response.content[0]?.type === 'text' ? response.content[0].text : ''
  }

  async generateCompletionWithTools(
    messages: Array<{ role: string; content: string }>,
    tools: Array<{ name: string; description: string; parameters: any }>,
    config?: Partial<LlmConfig>
  ): Promise<{ content?: string; toolCalls?: Array<{ name: string; parameters: any }> }> {
    const response = await this.client.messages.create({
      model: config?.model || this.defaultModel,
      max_tokens: config?.maxTokens || 2000,
      temperature: config?.temperature || 0.7,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      })),
    })

    const content = response.content[0]
    if (content?.type === 'tool_use') {
      return {
        toolCalls: [{
          name: content.name,
          parameters: content.input,
        }],
      }
    }

    return {
      content: content?.type === 'text' ? content.text : '',
    }
  }

  async streamCompletion(
    prompt: string,
    onChunk: (chunk: string) => void,
    config?: Partial<LlmConfig>
  ): Promise<void> {
    const stream = this.client.messages.stream({
      model: config?.model || this.defaultModel,
      max_tokens: config?.maxTokens || 2000,
      temperature: config?.temperature || 0.7,
      messages: [{ role: 'user', content: prompt }],
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        onChunk(chunk.delta.text)
      }
    }
  }
}

// Google Provider
export class GoogleProvider implements LlmProviderInterface {
  private client: GoogleGenerativeAI
  private defaultModel: string

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
    this.defaultModel = 'gemini-1.5-flash'
  }

  async generateCompletion(prompt: string, config?: Partial<LlmConfig>): Promise<string> {
    const model = this.client.getGenerativeModel({ 
      model: config?.model || this.defaultModel,
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxTokens || 2000,
      },
    })

    const result = await model.generateContent(prompt)
    return result.response.text()
  }

  async generateCompletionWithTools(
    messages: Array<{ role: string; content: string }>,
    tools: Array<{ name: string; description: string; parameters: any }>,
    config?: Partial<LlmConfig>
  ): Promise<{ content?: string; toolCalls?: Array<{ name: string; parameters: any }> }> {
    const model = this.client.getGenerativeModel({
      model: config?.model || this.defaultModel,
      tools: [{
        functionDeclarations: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      }],
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxTokens || 2000,
      },
    })

    const chat = model.startChat()
    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    
    const response = result.response
    const functionCalls = response.functionCalls()
    
    if (functionCalls && functionCalls.length > 0) {
      return {
        toolCalls: functionCalls.map(fc => ({
          name: fc.name,
          parameters: fc.args,
        })),
      }
    }

    return {
      content: response.text(),
    }
  }

  async streamCompletion(
    prompt: string,
    onChunk: (chunk: string) => void,
    config?: Partial<LlmConfig>
  ): Promise<void> {
    const model = this.client.getGenerativeModel({ 
      model: config?.model || this.defaultModel,
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxTokens || 2000,
      },
    })

    const result = await model.generateContentStream(prompt)
    
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        onChunk(text)
      }
    }
  }
}

// Provider factory
export function createLlmProvider(provider: LlmProviderEnum): LlmProviderInterface {
  switch (provider) {
    case 'OPENAI':
      return new OpenAiProvider()
    case 'ANTHROPIC':
      return new AnthropicProvider()
    case 'GOOGLE':
      return new GoogleProvider()
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`)
  }
}

// Default provider based on environment
export function getDefaultProvider(): LlmProviderInterface {
  const defaultProvider = (process.env.DEFAULT_LLM_PROVIDER as LlmProviderEnum) || 'OPENAI'
  return createLlmProvider(defaultProvider)
}