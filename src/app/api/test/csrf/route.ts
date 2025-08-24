import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-helper'
import { createApiResponse } from '@/lib/validators'

// Test endpoint for CSRF protection
export const POST = withAuth(async (request: NextRequest, user) => {
  return NextResponse.json(
    createApiResponse(true, {
      message: 'CSRF validation successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      timestamp: new Date().toISOString()
    })
  )
}, { requiredRole: 'viewer' }) // Any authenticated user can test

export async function GET(request: NextRequest) {
  return NextResponse.json(
    createApiResponse(true, {
      message: 'This endpoint requires POST with CSRF token',
      instructions: [
        '1. Login to get access token and CSRF token',
        '2. Include Authorization header with Bearer token',
        '3. Include X-CSRF-Token header with CSRF token',
        '4. Send POST request to test CSRF validation'
      ]
    })
  )
}