import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows safe HTML tags and attributes while removing dangerous content
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Allowed HTML tags
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'sup', 'sub'
    ],
    // Allowed attributes
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'id',
      'title', 'alt', 'style'
    ],
    // Allow data: URLs for images (if needed)
    ALLOW_DATA_ATTR: false,
    // Don't allow external scripts
    ALLOW_UNKNOWN_PROTOCOLS: false,
    // Force links to open in new window with noopener
    ADD_ATTR: ['target', 'rel'],
    // Remove dangerous tags completely
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  })
}

/**
 * Sanitize markdown content before rendering
 * Removes potential XSS vectors from markdown
 */
export function sanitizeMarkdown(markdown: string): string {
  // Remove script tags and event handlers from markdown
  let safe = markdown
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    
  return safe
}

/**
 * Convert markdown to safe HTML
 * Combines markdown conversion with HTML sanitization
 */
export function markdownToSafeHTML(markdown: string): string {
  // First sanitize the markdown
  const safeMarkdown = sanitizeMarkdown(markdown)
  
  // Simple markdown to HTML conversion
  let html = safeMarkdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br>')
  
  // Wrap in paragraph tags if not already
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`
  }
  
  // Sanitize the final HTML
  return sanitizeHTML(html)
}

/**
 * Escape HTML entities to prevent injection
 * Use when displaying user input as text (not HTML)
 */
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  
  return text.replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Validate and sanitize URLs
 * Prevents javascript: and data: URLs that could be used for XSS
 */
export function sanitizeURL(url: string): string {
  // Remove any whitespace
  const trimmed = url.trim()
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const lowerURL = trimmed.toLowerCase()
  
  for (const protocol of dangerousProtocols) {
    if (lowerURL.startsWith(protocol)) {
      return '#' // Return safe fallback
    }
  }
  
  // Ensure URL is properly encoded
  try {
    const parsed = new URL(trimmed)
    // Only allow http(s) and mailto
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '#'
    }
    return parsed.toString()
  } catch {
    // If not a valid URL, treat as relative path
    // Escape any HTML entities
    return escapeHTML(trimmed)
  }
}