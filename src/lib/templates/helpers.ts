import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { HazardLevelEnum } from '../types/space-weather'

// Custom Handlebars helper functions
export const templateHelpers = {
  // Date formatting helpers
  formatDate: (timestamp: Date | string, formatStr: string = 'yyyy-MM-dd HH:mm:ss UTC') => {
    try {
      const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp
      return format(date, formatStr)
    } catch (error) {
      return 'Invalid Date'
    }
  },

  formatDateRelative: (timestamp: Date | string) => {
    try {
      const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      return 'Unknown time'
    }
  },

  formatISODate: (timestamp: Date | string) => {
    try {
      const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp
      return date.toISOString()
    } catch (error) {
      return 'Invalid Date'
    }
  },

  // Date manipulation helpers
  addHours: (timestamp: Date | string, hours: number) => {
    try {
      const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp
      return new Date(date.getTime() + (hours * 60 * 60 * 1000))
    } catch (error) {
      return new Date()
    }
  },

  addDays: (timestamp: Date | string, days: number) => {
    try {
      const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp
      return new Date(date.getTime() + (days * 24 * 60 * 60 * 1000))
    } catch (error) {
      return new Date()
    }
  },

  // Number formatting helpers
  formatNumber: (value: number, decimals: number = 2) => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A'
    return value.toFixed(decimals)
  },

  formatScientific: (value: number, precision: number = 2) => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A'
    return value.toExponential(precision)
  },

  formatPercentage: (value: number, decimals: number = 1) => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A'
    return (value * 100).toFixed(decimals) + '%'
  },

  // Space weather specific helpers
  hazardLevel: (level: HazardLevelEnum | string | undefined) => {
    if (!level) return 'None'
    
    const hazardInfo = {
      // Geomagnetic storms
      G1: { name: 'Minor', color: 'green', description: 'Minor geomagnetic storm' },
      G2: { name: 'Moderate', color: 'yellow', description: 'Moderate geomagnetic storm' },
      G3: { name: 'Strong', color: 'orange', description: 'Strong geomagnetic storm' },
      G4: { name: 'Severe', color: 'red', description: 'Severe geomagnetic storm' },
      G5: { name: 'Extreme', color: 'darkred', description: 'Extreme geomagnetic storm' },
      
      // Radio blackouts
      R1: { name: 'Minor', color: 'green', description: 'Minor radio blackout' },
      R2: { name: 'Moderate', color: 'yellow', description: 'Moderate radio blackout' },
      R3: { name: 'Strong', color: 'orange', description: 'Strong radio blackout' },
      R4: { name: 'Severe', color: 'red', description: 'Severe radio blackout' },
      R5: { name: 'Extreme', color: 'darkred', description: 'Extreme radio blackout' },
      
      // Solar radiation storms
      S1: { name: 'Minor', color: 'green', description: 'Minor solar radiation storm' },
      S2: { name: 'Moderate', color: 'yellow', description: 'Moderate solar radiation storm' },
      S3: { name: 'Strong', color: 'orange', description: 'Strong solar radiation storm' },
      S4: { name: 'Severe', color: 'red', description: 'Severe solar radiation storm' },
      S5: { name: 'Extreme', color: 'darkred', description: 'Extreme solar radiation storm' },
    }

    const info = hazardInfo[level as keyof typeof hazardInfo]
    return info ? `${level} (${info.name})` : level
  },

  hazardColor: (level: HazardLevelEnum | string | undefined) => {
    const colors = {
      G1: 'green', G2: 'yellow', G3: 'orange', G4: 'red', G5: 'darkred',
      R1: 'green', R2: 'yellow', R3: 'orange', R4: 'red', R5: 'darkred',
      S1: 'green', S2: 'yellow', S3: 'orange', S4: 'red', S5: 'darkred',
    }
    return level ? colors[level as keyof typeof colors] || 'gray' : 'gray'
  },

  hazardSeverity: (level: HazardLevelEnum | string | undefined) => {
    const severity = {
      G1: 1, G2: 2, G3: 3, G4: 4, G5: 5,
      R1: 1, R2: 2, R3: 3, R4: 4, R5: 5,
      S1: 1, S2: 2, S3: 3, S4: 4, S5: 5,
    }
    return level ? severity[level as keyof typeof severity] || 0 : 0
  },

  sourceIcon: (source: string) => {
    const icons = {
      'NOAA_SWPC': '🌎',
      'UK_MET_OFFICE': '🇬🇧',
      'HELIO_UCLES': '☀️',
      'OTHER': '📊'
    }
    return icons[source as keyof typeof icons] || '📊'
  },

  confidenceBar: (score: number | undefined) => {
    if (typeof score !== 'number') return 'Unknown'
    const percentage = Math.round(score * 100)
    const bars = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10))
    return `${bars} ${percentage}%`
  },

  // Comparison helpers
  eq: (a: any, b: any) => a === b,
  ne: (a: any, b: any) => a !== b,
  gt: (a: number, b: number) => a > b,
  gte: (a: number, b: number) => a >= b,
  lt: (a: number, b: number) => a < b,
  lte: (a: number, b: number) => a <= b,

  // Logical helpers
  and: (...args: any[]) => args.slice(0, -1).every(Boolean),
  or: (...args: any[]) => args.slice(0, -1).some(Boolean),
  not: (value: any) => !value,

  // Text formatting helpers
  capitalize: (text: string) => {
    if (typeof text !== 'string') return ''
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  },

  uppercase: (text: string) => {
    if (typeof text !== 'string') return ''
    return text.toUpperCase()
  },

  lowercase: (text: string) => {
    if (typeof text !== 'string') return ''
    return text.toLowerCase()
  },

  truncate: (text: string, length: number = 100, suffix: string = '...') => {
    if (typeof text !== 'string') return ''
    return text.length > length ? text.substring(0, length) + suffix : text
  },

  // Array helpers
  length: (array: any[]) => Array.isArray(array) ? array.length : 0,
  
  first: (array: any[]) => Array.isArray(array) && array.length > 0 ? array[0] : null,
  
  last: (array: any[]) => Array.isArray(array) && array.length > 0 ? array[array.length - 1] : null,
  
  join: (array: any[], separator: string = ', ') => {
    return Array.isArray(array) ? array.join(separator) : ''
  },

  // Conditional rendering helpers
  ifCond: function(this: any, v1: any, operator: string, v2: any, options: any) {
    switch (operator) {
      case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this)
      case '===': return (v1 === v2) ? options.fn(this) : options.inverse(this)
      case '!=': return (v1 != v2) ? options.fn(this) : options.inverse(this)
      case '!==': return (v1 !== v2) ? options.fn(this) : options.inverse(this)
      case '<': return (v1 < v2) ? options.fn(this) : options.inverse(this)
      case '<=': return (v1 <= v2) ? options.fn(this) : options.inverse(this)
      case '>': return (v1 > v2) ? options.fn(this) : options.inverse(this)
      case '>=': return (v1 >= v2) ? options.fn(this) : options.inverse(this)
      case '&&': return (v1 && v2) ? options.fn(this) : options.inverse(this)
      case '||': return (v1 || v2) ? options.fn(this) : options.inverse(this)
      default: return options.inverse(this)
    }
  },

  // Markdown to HTML conversion (basic)
  markdown: (text: string) => {
    if (typeof text !== 'string') return ''
    
    return text
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n/gim, '<br>')
  },

  // JSON helpers
  json: (obj: any, indent: number = 2) => {
    try {
      return JSON.stringify(obj, null, indent)
    } catch (error) {
      return 'Invalid JSON'
    }
  },

  // Math helpers
  add: (a: number, b: number) => (typeof a === 'number' && typeof b === 'number') ? a + b : 0,
  subtract: (a: number, b: number) => (typeof a === 'number' && typeof b === 'number') ? a - b : 0,
  multiply: (a: number, b: number) => (typeof a === 'number' && typeof b === 'number') ? a * b : 0,
  divide: (a: number, b: number) => (typeof a === 'number' && typeof b === 'number' && b !== 0) ? a / b : 0,

  // Utility helpers
  default: (value: any, defaultValue: any) => value || defaultValue,
  
  debug: (value: any) => {
    console.log('Template Debug:', value)
    return ''
  },

  // Space weather trend analysis
  trendArrow: (current: number, previous: number) => {
    if (typeof current !== 'number' || typeof previous !== 'number') return '→'
    const diff = current - previous
    if (diff > 0.1) return '↗'
    if (diff < -0.1) return '↘'
    return '→'
  },

  riskIcon: (level: string) => {
    const icons = {
      'low': '🟢',
      'moderate': '🟡', 
      'high': '🟠',
      'severe': '🔴',
      'extreme': '🟣'
    }
    return icons[level?.toLowerCase() as keyof typeof icons] || '⚪'
  }
}

// Export individual helper categories for selective importing
export const dateHelpers = {
  formatDate: templateHelpers.formatDate,
  formatDateRelative: templateHelpers.formatDateRelative,
  formatISODate: templateHelpers.formatISODate,
  addHours: templateHelpers.addHours,
  addDays: templateHelpers.addDays,
}

export const numberHelpers = {
  formatNumber: templateHelpers.formatNumber,
  formatScientific: templateHelpers.formatScientific,
  formatPercentage: templateHelpers.formatPercentage,
  add: templateHelpers.add,
  subtract: templateHelpers.subtract,
  multiply: templateHelpers.multiply,
  divide: templateHelpers.divide,
}

export const spaceWeatherHelpers = {
  hazardLevel: templateHelpers.hazardLevel,
  hazardColor: templateHelpers.hazardColor,
  hazardSeverity: templateHelpers.hazardSeverity,
  sourceIcon: templateHelpers.sourceIcon,
  confidenceBar: templateHelpers.confidenceBar,
  trendArrow: templateHelpers.trendArrow,
  riskIcon: templateHelpers.riskIcon,
}

export const textHelpers = {
  capitalize: templateHelpers.capitalize,
  uppercase: templateHelpers.uppercase,
  lowercase: templateHelpers.lowercase,
  truncate: templateHelpers.truncate,
  markdown: templateHelpers.markdown,
}

export const conditionalHelpers = {
  eq: templateHelpers.eq,
  ne: templateHelpers.ne,
  gt: templateHelpers.gt,
  gte: templateHelpers.gte,
  lt: templateHelpers.lt,
  lte: templateHelpers.lte,
  and: templateHelpers.and,
  or: templateHelpers.or,
  not: templateHelpers.not,
  ifCond: templateHelpers.ifCond,
}