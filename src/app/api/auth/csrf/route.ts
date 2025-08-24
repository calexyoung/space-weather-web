import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/jwt'
import { createCSRFTokenForSession, getSessionIdFromRequest } from '@/lib/security/csrf'
import { createApiResponse, createApiError } from '@/lib/validators'

/**
 * Get CSRF token for authenticated session
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from request to ensure they're authenticated
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        createApiError('Authentication required', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }
    
    // Get or create session ID
    const sessionId = getSessionIdFromRequest(request)
    
    if (!sessionId) {
      return NextResponse.json(
        createApiError('Session required for CSRF token', 'SESSION_ERROR'),
        { status: 400 }
      )
    }
    
    // Generate CSRF token for this session
    const csrfToken = createCSRFTokenForSession(sessionId)
    
    const response = NextResponse.json(
      createApiResponse(true, {
        csrfToken,
        expiresIn: 86400, // 24 hours in seconds
      })
    )
    
    // Also set the token as a cookie
    response.cookies.set({
      name: 'csrf-token',
      value: csrfToken,
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400,
      path: '/'
    })
    
    // Add token to response header
    response.headers.set('X-CSRF-Token', csrfToken)
    
    return response
    
  } catch (error) {
    console.error('CSRF token generation error:', error)
    return NextResponse.json(
      createApiError('Failed to generate CSRF token', 'CSRF_ERROR'),
      { status: 500 }
    )
  }
}