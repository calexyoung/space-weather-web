import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateTokens } from '@/lib/auth/jwt'
import { verifyPassword } from '@/lib/auth/password'
import { createApiResponse, createApiError } from '@/lib/validators'
import { createCSRFTokenForSession } from '@/lib/security/csrf'
import crypto from 'crypto'

// Login request schema
const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

// Demo users for testing (in production, this would come from database)
const DEMO_USERS = [
  {
    id: '1',
    email: 'admin@spaceweather.com',
    // Password: Admin123!@# (hashed)
    passwordHash: '$2a$10$YourHashedPasswordHere', // This will be replaced with actual hash
    role: 'admin' as const,
    permissions: ['all'],
  },
  {
    id: '2',
    email: 'user@spaceweather.com',
    // Password: User123!@#
    passwordHash: '$2a$10$YourHashedPasswordHere',
    role: 'user' as const,
    permissions: ['read', 'write'],
  },
  {
    id: '3',
    email: 'viewer@spaceweather.com',
    // Password: Viewer123!@#
    passwordHash: '$2a$10$YourHashedPasswordHere',
    role: 'viewer' as const,
    permissions: ['read'],
  },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request
    const validatedData = LoginSchema.parse(body)
    
    // Find user (in production, query database)
    const user = DEMO_USERS.find(u => u.email === validatedData.email)
    
    if (!user) {
      return NextResponse.json(
        createApiError('Invalid email or password', 'INVALID_CREDENTIALS'),
        { status: 401 }
      )
    }
    
    // For demo purposes, accept any password that meets requirements
    // In production, use: const isValidPassword = await verifyPassword(validatedData.password, user.passwordHash)
    const isValidPassword = validatedData.password.length >= 8 &&
                          /[A-Z]/.test(validatedData.password) &&
                          /[a-z]/.test(validatedData.password) &&
                          /[0-9]/.test(validatedData.password) &&
                          /[!@#$%^&*()]/.test(validatedData.password)
    
    if (!isValidPassword) {
      return NextResponse.json(
        createApiError('Invalid email or password', 'INVALID_CREDENTIALS'),
        { status: 401 }
      )
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    })
    
    // Generate session ID and CSRF token
    const sessionId = crypto
      .createHash('sha256')
      .update(accessToken)
      .digest('hex')
      .substring(0, 32)
    const csrfToken = createCSRFTokenForSession(sessionId)
    
    // Create response
    const response = NextResponse.json(
      createApiResponse(true, {
        accessToken,
        refreshToken,
        csrfToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        },
      })
    )
    
    // Set CSRF token as cookie
    response.cookies.set({
      name: 'csrf-token',
      value: csrfToken,
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400, // 24 hours
      path: '/'
    })
    
    // Set session cookie
    response.cookies.set({
      name: 'session-id',
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400,
      path: '/'
    })
    
    return response
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiError('Invalid request data', 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }
    
    console.error('Login error:', error)
    return NextResponse.json(
      createApiError('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}