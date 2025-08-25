import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth/jwt-edge'
import { getCORSHeaders } from '@/lib/security/headers'
import { applyRateLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter-edge'

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/verify',  // Allow verify to be called without auth to check tokens
  '/api/health',
  '/api/public',
  // Space weather data endpoints (read-only, rate-limited)
  '/api/donki',
  '/api/sources',
  '/api/space-weather',
  '/api/noaa',
  '/api/goes',
  '/api/data',  // Widget data endpoints
  '/api/stream',  // SSE streaming endpoints
  '/api/alerts',  // Alert monitoring endpoints
]

// Define routes that require admin role
const ADMIN_ROUTES = [
  '/api/admin',
  '/api/reports/delete',
  '/api/users',
]

// Define read-only routes (viewer role can access)
const VIEWER_ROUTES = [
  '/api/reports/[id]',
  '/api/sources',
  '/api/data',
  '/api/space-weather',
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    const corsHeaders = getCORSHeaders(origin || undefined)
    
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    })
  }
  
  // Skip rate limiting for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Has file extension
  ) {
    return NextResponse.next()
  }
  
  // Only apply rate limiting to API routes
  if (pathname.startsWith('/api')) {
    // Determine rate limit tier based on endpoint
    let rateLimitTier: 'AUTH' | 'API_READ' | 'API_WRITE' | 'REPORT_GENERATION' | 'PUBLIC' | 'HEALTH' = 'API_READ'
    
    if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
      rateLimitTier = 'AUTH'
    } else if (pathname.startsWith('/api/reports/generate')) {
      rateLimitTier = 'REPORT_GENERATION'
    } else if (pathname.startsWith('/api/health')) {
      rateLimitTier = 'HEALTH'
    } else if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
      rateLimitTier = 'PUBLIC'
    } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      rateLimitTier = 'API_WRITE'
    }
    
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, rateLimitTier)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }
  
  // Skip authentication for public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next()
    
    // Add CORS headers to public routes
    const origin = request.headers.get('origin')
    const corsHeaders = getCORSHeaders(origin || undefined)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
  
  // Skip authentication for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Has file extension
  ) {
    return NextResponse.next()
  }
  
  // Only check authentication for API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next()
  }
  
  // Extract and verify token
  const authHeader = request.headers.get('authorization')
  const token = extractTokenFromHeader(authHeader)
  
  if (!token) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      },
      { status: 401 }
    )
  }
  
  try {
    const payload = await verifyToken(token)
    
    // Check if token is access token
    if (payload.type !== 'access') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid token type',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }
    
    // Check admin routes
    if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
      if (payload.role !== 'admin') {
        return NextResponse.json(
          { 
            success: false,
            error: 'Admin access required',
            code: 'FORBIDDEN'
          },
          { status: 403 }
        )
      }
    }
    
    // Check if it's a write operation on viewer routes
    const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
    if (isWriteOperation && payload.role === 'viewer') {
      // Viewers can only read, not write
      if (!VIEWER_ROUTES.some(route => pathname.match(new RegExp(route.replace('[id]', '\\w+'))))) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Write access denied for viewer role',
            code: 'FORBIDDEN'
          },
          { status: 403 }
        )
      }
    }
    
    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.id)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-role', payload.role)
    
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    
    // Add CORS headers to authenticated responses
    const origin = request.headers.get('origin')
    const corsHeaders = getCORSHeaders(origin || undefined)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    // Add rate limit headers for API routes
    if (pathname.startsWith('/api')) {
      let tier: 'AUTH' | 'API_READ' | 'API_WRITE' | 'REPORT_GENERATION' | 'PUBLIC' | 'HEALTH' = 'API_READ'
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        tier = 'API_WRITE'
      }
      const rateLimitHeaders = getRateLimitHeaders(request, tier)
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }
    
    return response
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid token'
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        code: 'UNAUTHORIZED'
      },
      { status: 401 }
    )
  }
}

export const config = {
  matcher: [
    // Match all API routes except static files
    '/api/:path*',
    // Exclude Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}