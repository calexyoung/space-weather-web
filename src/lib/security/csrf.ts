import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32
const CSRF_HEADER_NAME = 'X-CSRF-Token'
const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

// Store for CSRF tokens (in production, use Redis or database)
const csrfTokenStore = new Map<string, { token: string; expires: number }>()

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Hash a token for storage
 */
function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}

/**
 * Store CSRF token with expiration
 */
export function storeCSRFToken(sessionId: string, token: string): void {
  const hashedToken = hashToken(token)
  const expires = Date.now() + CSRF_TOKEN_EXPIRY
  
  csrfTokenStore.set(sessionId, { token: hashedToken, expires })
  
  // Clean up expired tokens
  cleanupExpiredTokens()
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokenStore.get(sessionId)
  
  if (!stored) {
    return false
  }
  
  // Check if token has expired
  if (stored.expires < Date.now()) {
    csrfTokenStore.delete(sessionId)
    return false
  }
  
  // Compare hashed tokens
  const hashedToken = hashToken(token)
  return crypto.timingSafeEqual(
    Buffer.from(stored.token),
    Buffer.from(hashedToken)
  )
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens(): void {
  const now = Date.now()
  for (const [sessionId, data] of csrfTokenStore.entries()) {
    if (data.expires < now) {
      csrfTokenStore.delete(sessionId)
    }
  }
}

/**
 * Get CSRF token from request
 */
export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  // Check header first (preferred for AJAX requests)
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  if (headerToken) {
    return headerToken
  }
  
  // Check request body for form submissions
  // This would need to be extracted from the body in the actual handler
  
  // Check query parameter as fallback
  const url = new URL(request.url)
  const queryToken = url.searchParams.get('csrf_token')
  if (queryToken) {
    return queryToken
  }
  
  return null
}

/**
 * Get session ID from request
 */
export function getSessionIdFromRequest(request: NextRequest): string | null {
  // In production, this should come from a secure session cookie
  // For now, we'll use the authorization header as a session identifier
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    // Use a hash of the auth token as session ID
    return crypto
      .createHash('sha256')
      .update(authHeader)
      .digest('hex')
      .substring(0, 32)
  }
  
  // Check for session cookie
  const cookies = request.cookies
  const sessionCookie = cookies.get('session-id')
  if (sessionCookie) {
    return sessionCookie.value
  }
  
  return null
}

/**
 * Create CSRF token for session
 */
export function createCSRFTokenForSession(sessionId: string): string {
  const token = generateCSRFToken()
  storeCSRFToken(sessionId, token)
  return token
}

/**
 * Verify CSRF protection for request
 */
export function verifyCSRFProtection(request: NextRequest): {
  valid: boolean
  error?: string
} {
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true }
  }
  
  // Get session ID
  const sessionId = getSessionIdFromRequest(request)
  if (!sessionId) {
    return { 
      valid: false, 
      error: 'No session found for CSRF validation' 
    }
  }
  
  // Get CSRF token from request
  const token = getCSRFTokenFromRequest(request)
  if (!token) {
    return { 
      valid: false, 
      error: 'CSRF token missing' 
    }
  }
  
  // Validate token
  const isValid = validateCSRFToken(sessionId, token)
  if (!isValid) {
    return { 
      valid: false, 
      error: 'Invalid or expired CSRF token' 
    }
  }
  
  return { valid: true }
}

/**
 * Middleware to check CSRF token
 */
export async function csrfProtection(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const { valid, error } = verifyCSRFProtection(request)
  
  if (!valid) {
    return NextResponse.json(
      { 
        success: false,
        error: error || 'CSRF validation failed',
        code: 'CSRF_ERROR'
      },
      { status: 403 }
    )
  }
  
  return handler(request)
}

/**
 * Add CSRF token to response
 */
export function addCSRFTokenToResponse(
  response: NextResponse,
  sessionId: string
): NextResponse {
  const token = createCSRFTokenForSession(sessionId)
  
  // Add token to response header
  response.headers.set(CSRF_HEADER_NAME, token)
  
  // Also set as httpOnly cookie for non-AJAX requests
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: false, // Must be false so JS can read it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY / 1000, // Convert to seconds
    path: '/'
  })
  
  return response
}

/**
 * Get or create CSRF token for a session
 */
export function getOrCreateCSRFToken(sessionId: string): string {
  const stored = csrfTokenStore.get(sessionId)
  
  if (stored && stored.expires > Date.now()) {
    // Return existing valid token (need to reverse the hash - store plain token instead)
    // For now, create a new one
    return createCSRFTokenForSession(sessionId)
  }
  
  return createCSRFTokenForSession(sessionId)
}