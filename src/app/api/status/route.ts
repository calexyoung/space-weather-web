import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse } from '@/lib/validators'
import { getSafeApiConfig, validateRequiredApiKeys, getConfiguredProviders } from '@/lib/security/api-keys'

/**
 * API Status endpoint
 * Returns configuration status without exposing sensitive data
 */
export async function GET(request: NextRequest) {
  try {
    // Get safe configuration info
    const config = getSafeApiConfig()
    const validation = validateRequiredApiKeys()
    const providers = getConfiguredProviders()
    
    // System status
    const status = {
      healthy: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      
      // API configuration (safe to expose)
      apiProviders: {
        configured: providers,
        available: {
          openai: config.hasOpenAI,
          anthropic: config.hasAnthropic,
          google: config.hasGoogle,
          nasa: config.hasNASA,
        },
        demoMode: config.isDemoMode,
      },
      
      // Security features status
      security: {
        authentication: true,
        rateLimit: true,
        csrf: true,
        cors: true,
        securityHeaders: true,
        apiKeyValidation: validation.valid,
      },
      
      // Performance metrics
      performance: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
      
      // Feature flags
      features: {
        llm: !config.isDemoMode,
        spaceWeatherData: true,
        reportGeneration: !config.isDemoMode,
        dataVisualization: true,
      }
    }
    
    // Add warnings if in development mode
    const warnings: string[] = []
    
    if (process.env.NODE_ENV !== 'production') {
      if (config.isDemoMode) {
        warnings.push('Running in demo mode - no API keys configured')
      }
      if (validation.missing.length > 0) {
        warnings.push(`Missing API keys for: ${validation.missing.join(', ')}`)
      }
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        warnings.push('Using default JWT secret - configure JWT_SECRET in production')
      }
    }
    
    return NextResponse.json(
      createApiResponse(true, {
        ...status,
        warnings: warnings.length > 0 ? warnings : undefined
      })
    )
    
  } catch (error) {
    console.error('Status endpoint error:', error)
    return NextResponse.json(
      createApiResponse(false, {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve system status'
      }),
      { status: 500 }
    )
  }
}