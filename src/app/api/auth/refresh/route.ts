import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyToken, generateAccessToken, extractTokenFromHeader } from '@/lib/auth/jwt'
import { createApiResponse, createApiError } from '@/lib/validators'

// Refresh request schema
const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request
    const validatedData = RefreshSchema.parse(body)
    
    // Verify refresh token
    const payload = await verifyToken(validatedData.refreshToken)
    
    // Check if it's a refresh token
    if (payload.type !== 'refresh') {
      return NextResponse.json(
        createApiError('Invalid token type', 'INVALID_TOKEN'),
        { status: 401 }
      )
    }
    
    // Generate new access token
    const accessToken = generateAccessToken({
      id: payload.id,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    })
    
    // Return new access token
    return NextResponse.json(
      createApiResponse(true, {
        accessToken,
        user: {
          id: payload.id,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions,
        },
      })
    )
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        createApiError('Invalid request data', 'VALIDATION_ERROR', error.issues),
        { status: 400 }
      )
    }
    
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        return NextResponse.json(
          createApiError('Refresh token expired', 'TOKEN_EXPIRED'),
          { status: 401 }
        )
      }
      
      if (error.message === 'Invalid token') {
        return NextResponse.json(
          createApiError('Invalid refresh token', 'INVALID_TOKEN'),
          { status: 401 }
        )
      }
    }
    
    console.error('Token refresh error:', error)
    return NextResponse.json(
      createApiError('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}