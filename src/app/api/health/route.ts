import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse } from '@/lib/validators'

export async function GET(request: NextRequest) {
  return NextResponse.json(
    createApiResponse(true, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    })
  )
}

export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}