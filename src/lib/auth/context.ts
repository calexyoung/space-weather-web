import { NextRequest } from 'next/server'
import { getUserFromRequest, UserPayload } from './jwt'

// Extend NextRequest with user context
export interface AuthenticatedRequest extends NextRequest {
  user?: UserPayload
}

/**
 * Authentication context for API routes
 */
export class AuthContext {
  private static instance: AuthContext
  private userCache: Map<string, UserPayload> = new Map()
  
  private constructor() {}
  
  public static getInstance(): AuthContext {
    if (!AuthContext.instance) {
      AuthContext.instance = new AuthContext()
    }
    return AuthContext.instance
  }
  
  /**
   * Get user from request with caching
   */
  async getUser(request: NextRequest): Promise<UserPayload | null> {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return null
    
    // Check cache
    if (this.userCache.has(authHeader)) {
      return this.userCache.get(authHeader)!
    }
    
    // Get user from token
    const user = await getUserFromRequest(request)
    
    if (user) {
      // Cache for 5 minutes
      this.userCache.set(authHeader, user)
      setTimeout(() => {
        this.userCache.delete(authHeader)
      }, 5 * 60 * 1000)
    }
    
    return user
  }
  
  /**
   * Clear user cache
   */
  clearCache(): void {
    this.userCache.clear()
  }
}

/**
 * Get auth context instance
 */
export const authContext = AuthContext.getInstance()