import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getLlmService } from '@/lib/llm/service'
import { createApiResponse, createApiError } from '@/lib/validators'
import { LlmProvider } from '@/lib/types/space-weather'

// Request schemas
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional(),
  reportId: z.string().optional(),
  userId: z.string().optional(),
  provider: LlmProvider.optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  streaming: z.boolean().default(false),
})

const StreamChatRequestSchema = ChatRequestSchema.extend({
  streaming: z.literal(true),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedRequest = ChatRequestSchema.parse(body)

    // Check if we have valid API keys configured
    const hasValidKeys = (
      (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) ||
      (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) ||
      (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.length > 10)
    )

    // If no valid API keys and it's a demo/development scenario, return mock response
    if (!hasValidKeys) {
      if (validatedRequest.streaming) {
        return handleMockStreamingChat(validatedRequest)
      } else {
        return NextResponse.json(createApiResponse({
          content: "🤖 **Demo Mode**: This is a simulated AI response since no valid API keys are configured.\n\nTo enable real AI chat functionality, please add valid API keys to your `.env` file:\n- `OPENAI_API_KEY` for OpenAI\n- `ANTHROPIC_API_KEY` for Anthropic Claude\n- `GOOGLE_API_KEY` for Google Gemini\n\nFor space weather questions, I can help analyze solar activity, geomagnetic conditions, and space weather impacts when properly configured.",
          conversationId: validatedRequest.conversationId || `demo-${Date.now()}`,
          toolCalls: []
        }))
      }
    }

    // Handle streaming requests differently
    if (validatedRequest.streaming) {
      return handleStreamingChat(validatedRequest)
    }

    // Initialize LLM service with optional provider override
    const llmService = getLlmService(validatedRequest.provider, {
      model: validatedRequest.model,
      temperature: validatedRequest.temperature,
      streaming: false,
    })

    // Prepare chat context
    const context = {
      conversationId: validatedRequest.conversationId,
      reportId: validatedRequest.reportId,
      userId: validatedRequest.userId,
    }

    // Generate chat response
    const chatResponse = await llmService.chatWithAssistant(
      validatedRequest.message,
      context
    )

    return NextResponse.json(createApiResponse(true, {
      response: chatResponse.content,
      conversationId: chatResponse.conversationId,
      toolCalls: chatResponse.toolCalls,
      streaming: false,
    }))

  } catch (error) {
    console.error('Chat API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiError('Invalid request data', 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }

    return NextResponse.json(
      createApiError(
        error instanceof Error ? error.message : 'Internal server error',
        'CHAT_ERROR'
      ),
      { status: 500 }
    )
  }
}

async function handleStreamingChat(request: z.infer<typeof StreamChatRequestSchema>) {
  try {
    const llmService = getLlmService(request.provider, {
      model: request.model,
      temperature: request.temperature,
      streaming: true,
    })

    const context = {
      conversationId: request.conversationId,
      reportId: request.reportId,
      userId: request.userId,
    }

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = ''
          
          const response = await llmService.streamChat(
            request.message,
            (chunk: string) => {
              fullResponse += chunk
              // Send chunk as Server-Sent Event
              const data = JSON.stringify({
                type: 'chunk',
                content: chunk,
                fullContent: fullResponse,
              })
              controller.enqueue(`data: ${data}\n\n`)
            },
            context
          )

          // Send completion event
          const completionData = JSON.stringify({
            type: 'complete',
            fullContent: response,
            conversationId: context.conversationId,
          })
          controller.enqueue(`data: ${completionData}\n\n`)
          
          controller.close()
        } catch (error) {
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Streaming failed',
          })
          controller.enqueue(`data: ${errorData}\n\n`)
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error('Streaming chat error:', error)
    return NextResponse.json(
      createApiError(
        error instanceof Error ? error.message : 'Streaming setup failed',
        'STREAM_ERROR'
      ),
      { status: 500 }
    )
  }
}

async function handleMockStreamingChat(request: z.infer<typeof StreamChatRequestSchema>) {
  const mockResponse = `🤖 **Demo Mode**: This is a simulated streaming AI response since no valid API keys are configured.

To enable real AI chat functionality, please add valid API keys to your \`.env\` file:
- \`OPENAI_API_KEY\` for OpenAI  
- \`ANTHROPIC_API_KEY\` for Anthropic Claude
- \`GOOGLE_API_KEY\` for Google Gemini

Your question: "${request.message}"

In a real scenario, I would analyze space weather data, provide forecasts, and help with report generation. The system supports multiple LLM providers and can integrate with various space weather data sources like NOAA SWPC, UK Met Office, and HELIO.`

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Simulate typing by sending chunks
        const words = mockResponse.split(' ')
        let currentResponse = ''
        
        for (let i = 0; i < words.length; i++) {
          const word = words[i] + ' '
          currentResponse += word
          
          const data = JSON.stringify({
            type: 'chunk',
            content: word,
            fullContent: currentResponse,
          })
          
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
          
          // Add delay to simulate typing
          await new Promise(resolve => setTimeout(resolve, 50))
        }
        
        // Send completion event
        const completionData = JSON.stringify({
          type: 'complete',
          fullContent: currentResponse,
          conversationId: request.conversationId || `demo-${Date.now()}`
        })
        controller.enqueue(new TextEncoder().encode(`data: ${completionData}\n\n`))
        
        controller.close()
      } catch (error) {
        console.error('Mock streaming error:', error)
        controller.error(error)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}