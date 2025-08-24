import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/jwt'
import { createApiResponse, createApiError } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    // Get user from request (uses Authorization header)
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        createApiError('Invalid or missing token', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }
    
    // Return user information
    return NextResponse.json(
      createApiResponse(true, {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        },
      })
    )
    
  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      createApiError('Token verification failed', 'VERIFICATION_ERROR'),
      { status: 401 }
    )
  }
}