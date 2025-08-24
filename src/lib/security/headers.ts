/**
 * Security Headers Configuration
 * Implements OWASP recommended security headers
 */

/**
 * Content Security Policy configuration
 * Restricts resources the browser can load
 */
export function getCSPHeader(nonce?: string): string {
  const directives = [
    // Default policy - only allow resources from same origin
    "default-src 'self'",
    
    // Scripts - self, inline with nonce, and trusted CDNs
    `script-src 'self' ${nonce ? `'nonce-${nonce}'` : "'unsafe-inline'"} 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com`,
    
    // Styles - self, inline (for styled components), and trusted CDNs  
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    
    // Images - self, data URLs, and HTTPS sources
    "img-src 'self' data: https: blob:",
    
    // Fonts - self and Google Fonts
    "font-src 'self' data: https://fonts.gstatic.com",
    
    // Connect - API endpoints and external services
    "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://services.swpc.noaa.gov https://api.nasa.gov ws://localhost:* wss://localhost:*",
    
    // Media - self and blob URLs
    "media-src 'self' blob:",
    
    // Objects - none
    "object-src 'none'",
    
    // Frames - none (prevent clickjacking)
    "frame-src 'none'",
    
    // Frame ancestors - none (prevent embedding)
    "frame-ancestors 'none'",
    
    // Base URI - self only
    "base-uri 'self'",
    
    // Form action - self only
    "form-action 'self'",
    
    // Upgrade insecure requests
    "upgrade-insecure-requests"
  ]
  
  return directives.join('; ')
}

/**
 * Get all security headers
 */
export function getSecurityHeaders(options?: {
  nonce?: string
  isDevelopment?: boolean
}): Record<string, string> {
  const { nonce, isDevelopment = process.env.NODE_ENV === 'development' } = options || {}
  
  const headers: Record<string, string> = {
    // Content Security Policy
    'Content-Security-Policy': isDevelopment 
      ? getCSPHeader(nonce).replace("'unsafe-eval'", "'unsafe-eval'") // Allow eval in dev for hot reload
      : getCSPHeader(nonce).replace(" 'unsafe-eval'", ""), // Remove unsafe-eval in production
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS filter in older browsers
    'X-XSS-Protection': '1; mode=block',
    
    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (formerly Feature Policy)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    
    // DNS prefetch control
    'X-DNS-Prefetch-Control': 'on',
    
    // Strict Transport Security (HSTS) - only in production
    ...(isDevelopment ? {} : {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // Additional security headers
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-Download-Options': 'noopen',
    'X-UA-Compatible': 'IE=edge'
  }
  
  return headers
}

/**
 * CORS configuration
 */
export function getCORSHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map(o => o.trim())
  
  // Check if origin is allowed
  const isAllowed = !origin || allowedOrigins.includes(origin) || 
                    (process.env.NODE_ENV === 'development' && origin?.startsWith('http://localhost'))
  
  if (!isAllowed) {
    return {} // Don't set CORS headers for disallowed origins
  }
  
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Expose-Headers': 'X-Total-Count, X-Page-Count'
  }
}

/**
 * Combine all headers for API routes
 */
export function getAPIHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get('origin') || undefined
  
  return {
    ...getSecurityHeaders(),
    ...getCORSHeaders(origin),
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  }
}

/**
 * Generate a CSP nonce for inline scripts
 */
export function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}