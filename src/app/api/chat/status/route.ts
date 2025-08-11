import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check environment variables
    const hasOpenAI = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_key_here'
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_key_here'  
    const hasGoogle = !!process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY !== 'your_google_key_here'
    
    const defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'openai'
    
    return NextResponse.json({
      success: true,
      providers: {
        openai: {
          configured: hasOpenAI,
          default: defaultProvider === 'openai'
        },
        anthropic: {
          configured: hasAnthropic,
          default: defaultProvider === 'anthropic'
        },
        google: {
          configured: hasGoogle,
          default: defaultProvider === 'google'
        }
      },
      defaultProvider,
      recommendations: {
        ...((!hasOpenAI && defaultProvider === 'openai') && { 
          warning: 'Default provider is OpenAI but API key is not configured' 
        }),
        ...((!hasAnthropic && defaultProvider === 'anthropic') && { 
          warning: 'Default provider is Anthropic but API key is not configured' 
        }),
        ...((!hasGoogle && defaultProvider === 'google') && { 
          warning: 'Default provider is Google but API key is not configured' 
        }),
        ...(!hasOpenAI && !hasAnthropic && !hasGoogle && {
          error: 'No LLM providers are configured. Please add valid API keys to your .env file.'
        })
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check chat status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}