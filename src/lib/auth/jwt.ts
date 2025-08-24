import jwt from 'jsonwebtoken'
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

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: UserPayload): string {
  const payload: TokenPayload = {
    ...user,
    type: 'access'
  }
  
  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: JWT_EXPIRY,
    issuer: 'space-weather-web',
    audience: 'space-weather-api'
  })
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(user: UserPayload): string {
  const payload: TokenPayload = {
    ...user,
    type: 'refresh'
  }
  
  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'space-weather-web',
    audience: 'space-weather-api'
  })
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const decoded = jwt.verify(token, getJWTSecret(), {
      issuer: 'space-weather-web',
      audience: 'space-weather-api'
    }) as TokenPayload
    
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired')
    } else if (error instanceof jwt.JsonWebTokenError) {
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
 * Get user from request
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
 * Generate tokens for user
 */
export function generateTokens(user: UserPayload): { accessToken: string; refreshToken: string } {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user)
  }
}