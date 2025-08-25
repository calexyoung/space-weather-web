import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'
import { getJWTSecret } from '@/lib/security/api-keys'

// JWT configuration
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'

// User payload interface
export interface UserPayload {
  id: string
  email: string
  role: 'admin' | 'user' | 'viewer'
  permissions?: string[]
}

// Token payload interface
export interface TokenPayload extends UserPayload {
  iat?: number
  exp?: number
  type: 'access' | 'refresh'
}

// Convert duration string to seconds
function durationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([hdm])$/)
  if (!match) return 86400 // Default to 24 hours
  
  const value = parseInt(match[1])
  const unit = match[2]
  
  switch (unit) {
    case 'h': return value * 3600
    case 'd': return value * 86400
    case 'm': return value * 60
    default: return 86400
  }
}

// Get JWT secret as Uint8Array for jose
function getSecret(): Uint8Array {
  return new TextEncoder().encode(getJWTSecret())
}

/**
 * Generate JWT access token (Edge Runtime compatible)
 */
export async function generateAccessToken(user: UserPayload): Promise<string> {
  const payload: TokenPayload = {
    ...user,
    type: 'access'
  }
  
  const jwt = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('space-weather-web')
    .setAudience('space-weather-api')
    .setExpirationTime(`${durationToSeconds(JWT_EXPIRY)}s`)
    .sign(getSecret())
  
  return jwt
}

/**
 * Generate JWT refresh token (Edge Runtime compatible)
 */
export async function generateRefreshToken(user: UserPayload): Promise<string> {
  const payload: TokenPayload = {
    ...user,
    type: 'refresh'
  }
  
  const jwt = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('space-weather-web')
    .setAudience('space-weather-api')
    .setExpirationTime(`${durationToSeconds(REFRESH_TOKEN_EXPIRY)}s`)
    .sign(getSecret())
  
  return jwt
}

/**
 * Verify and decode JWT token (Edge Runtime compatible)
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: 'space-weather-web',
      audience: 'space-weather-api',
    })
    
    return payload as unknown as TokenPayload
  } catch (error: any) {
    if (error?.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Token expired')
    } else if (error?.code === 'ERR_JWT_INVALID') {
      throw new Error('Invalid token')
    }
    throw new Error('Token verification failed')
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
}

/**
 * Get user from request (Edge Runtime compatible)
 */
export async function getUserFromRequest(request: NextRequest): Promise<UserPayload | null> {
  const authHeader = request.headers.get('authorization')
  const token = extractTokenFromHeader(authHeader)
  
  if (!token) {
    return null
  }
  
  try {
    const payload = await verifyToken(token)
    if (payload.type !== 'access') {
      return null
    }
    
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions
    }
  } catch {
    return null
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: UserPayload, requiredRole: 'admin' | 'user' | 'viewer'): boolean {
  const roleHierarchy = {
    'admin': 3,
    'user': 2,
    'viewer': 1
  }
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}

/**
 * Check if user has required permission
 */
export function hasPermission(user: UserPayload, requiredPermission: string): boolean {
  if (user.role === 'admin') return true // Admins have all permissions
  
  return user.permissions?.includes(requiredPermission) || false
}

/**
 * Generate tokens for user (Edge Runtime compatible)
 */
export async function generateTokens(user: UserPayload): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user)
  ])
  
  return {
    accessToken,
    refreshToken
  }
}