/**
 * Secure API Key Management
 * 
 * This module provides centralized, secure access to API keys.
 * All API keys are accessed server-side only and validated before use.
 * 
 * SECURITY RULES:
 * 1. Never expose API keys to client-side code
 * 2. Never log or return API keys in responses
 * 3. Always validate API keys before using them
 * 4. Use environment variables for all sensitive data
 * 5. Provide fallbacks for development/demo mode
 */

/**
 * API Key validation patterns
 */
const API_KEY_PATTERNS = {
  OPENAI: /^sk-[A-Za-z0-9]{48,}$/,
  ANTHROPIC: /^sk-ant-[A-Za-z0-9]{48,}$/,
  GOOGLE: /^[A-Za-z0-9_-]{39}$/,
  NASA: /^[A-Za-z0-9_-]{20,}$/,
}

/**
 * API Key configuration with validation
 */
export interface ApiKeyConfig {
  provider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'NASA'
  required: boolean
  fallback?: string
}

/**
 * Check if running in server-side environment
 */
function isServerSide(): boolean {
  return typeof window === 'undefined'
}

/**
 * Validate API key format
 */
function validateApiKey(key: string | undefined, provider: keyof typeof API_KEY_PATTERNS): boolean {
  if (!key) return false
  
  const pattern = API_KEY_PATTERNS[provider]
  if (!pattern) return false
  
  return pattern.test(key)
}

/**
 * Get API key securely (server-side only)
 */
export function getApiKey(provider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'NASA'): string | null {
  // Ensure this is only called server-side
  if (!isServerSide()) {
    console.error('SECURITY ERROR: Attempted to access API keys from client-side code')
    return null
  }
  
  let key: string | undefined
  
  switch (provider) {
    case 'OPENAI':
      key = process.env.OPENAI_API_KEY
      break
    case 'ANTHROPIC':
      key = process.env.ANTHROPIC_API_KEY
      break
    case 'GOOGLE':
      key = process.env.GOOGLE_API_KEY
      break
    case 'NASA':
      key = process.env.NASA_API_KEY
      break
    default:
      return null
  }
  
  // Validate the key format
  if (key && !validateApiKey(key, provider)) {
    console.warn(`Invalid ${provider} API key format detected`)
    return null
  }
  
  return key || null
}

/**
 * Check if API key is configured and valid
 */
export function hasValidApiKey(provider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'NASA'): boolean {
  if (!isServerSide()) return false
  
  const key = getApiKey(provider)
  return key !== null && validateApiKey(key, provider)
}

/**
 * Get all configured API providers
 */
export function getConfiguredProviders(): string[] {
  if (!isServerSide()) return []
  
  const providers: string[] = []
  
  if (hasValidApiKey('OPENAI')) providers.push('OPENAI')
  if (hasValidApiKey('ANTHROPIC')) providers.push('ANTHROPIC')
  if (hasValidApiKey('GOOGLE')) providers.push('GOOGLE')
  if (hasValidApiKey('NASA')) providers.push('NASA')
  
  return providers
}

/**
 * Mask API key for logging (show only first and last 4 chars)
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 12) return '***'
  
  const first4 = key.substring(0, 4)
  const last4 = key.substring(key.length - 4)
  const masked = '*'.repeat(Math.min(key.length - 8, 20))
  
  return `${first4}${masked}${last4}`
}

/**
 * Validate all required API keys are present
 */
export function validateRequiredApiKeys(): {
  valid: boolean
  missing: string[]
  configured: string[]
} {
  if (!isServerSide()) {
    return {
      valid: false,
      missing: ['Cannot validate on client-side'],
      configured: []
    }
  }
  
  const required = ['OPENAI', 'ANTHROPIC', 'GOOGLE'] as const
  const missing: string[] = []
  const configured: string[] = []
  
  for (const provider of required) {
    if (hasValidApiKey(provider)) {
      configured.push(provider)
    } else {
      // Only mark as missing if it's actually required
      // Allow demo mode without API keys
      if (process.env.NODE_ENV === 'production') {
        missing.push(provider)
      }
    }
  }
  
  return {
    valid: missing.length === 0 || process.env.NODE_ENV !== 'production',
    missing,
    configured
  }
}

/**
 * Get safe API configuration for client-side
 * Returns only non-sensitive information
 */
export function getSafeApiConfig(): {
  hasOpenAI: boolean
  hasAnthropic: boolean
  hasGoogle: boolean
  hasNASA: boolean
  isDemoMode: boolean
} {
  // This can be called from client-side as it doesn't expose keys
  const isDemoMode = !isServerSide() || (
    !hasValidApiKey('OPENAI') &&
    !hasValidApiKey('ANTHROPIC') &&
    !hasValidApiKey('GOOGLE')
  )
  
  return {
    hasOpenAI: isServerSide() && hasValidApiKey('OPENAI'),
    hasAnthropic: isServerSide() && hasValidApiKey('ANTHROPIC'),
    hasGoogle: isServerSide() && hasValidApiKey('GOOGLE'),
    hasNASA: isServerSide() && hasValidApiKey('NASA'),
    isDemoMode
  }
}

/**
 * JWT Secret management
 */
export function getJWTSecret(): string {
  if (!isServerSide()) {
    throw new Error('SECURITY ERROR: JWT secret cannot be accessed from client-side')
  }
  
  const secret = process.env.JWT_SECRET
  
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be at least 32 characters in production')
    }
    // Use a development secret in non-production
    return 'development-secret-change-in-production-minimum-32-chars'
  }
  
  return secret
}

/**
 * Session secret management
 */
export function getSessionSecret(): string {
  if (!isServerSide()) {
    throw new Error('SECURITY ERROR: Session secret cannot be accessed from client-side')
  }
  
  const secret = process.env.SESSION_SECRET
  
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be at least 32 characters in production')
    }
    // Use JWT secret as fallback in development
    return getJWTSecret()
  }
  
  return secret
}