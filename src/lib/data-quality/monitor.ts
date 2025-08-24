import { EventEmitter } from 'events'

export interface DataQualityMetrics {
  endpoint: string
  timestamp: Date
  responseTime: number
  success: boolean
  dataQuality: number
  completeness: number
  validationErrors: string[]
  isCache: boolean
  isFallback: boolean
}

export interface EndpointStats {
  url: string
  totalRequests: number
  successCount: number
  failureCount: number
  averageResponseTime: number
  averageQuality: number
  lastSuccess: Date | null
  lastFailure: Date | null
  successRate: number
  health: 'healthy' | 'degraded' | 'unhealthy'
}

export interface SystemHealth {
  timestamp: Date
  overallHealth: 'healthy' | 'degraded' | 'critical'
  endpoints: Map<string, EndpointStats>
  alerts: Alert[]
  recommendations: string[]
}

export interface Alert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  endpoint: string
  message: string
  timestamp: Date
  resolved: boolean
}

class DataQualityMonitor extends EventEmitter {
  private metrics: DataQualityMetrics[] = []
  private endpointStats: Map<string, EndpointStats> = new Map()
  private alerts: Alert[] = []
  private maxMetricsHistory = 10000
  private metricsRetentionMs = 24 * 60 * 60 * 1000 // 24 hours
  
  // Thresholds
  private thresholds = {
    responseTime: {
      good: 1000,     // < 1s
      acceptable: 3000, // < 3s
      poor: 5000       // > 5s
    },
    successRate: {
      healthy: 0.95,   // > 95%
      degraded: 0.80,  // > 80%
      unhealthy: 0     // < 80%
    },
    dataQuality: {
      excellent: 90,   // > 90%
      good: 70,        // > 70%
      poor: 50         // < 50%
    }
  }
  
  constructor() {
    super()
    
    // Cleanup old metrics every hour
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000)
    
    // Calculate stats every minute
    setInterval(() => this.calculateStats(), 60 * 1000)
  }
  
  // Record a new metric
  recordMetric(metric: DataQualityMetrics): void {
    this.metrics.push(metric)
    
    // Update endpoint stats immediately
    this.updateEndpointStats(metric)
    
    // Check for alerts
    this.checkAlerts(metric)
    
    // Emit event
    this.emit('metric', metric)
    
    // Trim if too many metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }
  }
  
  private updateEndpointStats(metric: DataQualityMetrics): void {
    let stats = this.endpointStats.get(metric.endpoint)
    
    if (!stats) {
      stats = {
        url: metric.endpoint,
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        averageResponseTime: 0,
        averageQuality: 0,
        lastSuccess: null,
        lastFailure: null,
        successRate: 0,
        health: 'healthy'
      }
      this.endpointStats.set(metric.endpoint, stats)
    }
    
    // Update counts
    stats.totalRequests++
    if (metric.success) {
      stats.successCount++
      stats.lastSuccess = metric.timestamp
    } else {
      stats.failureCount++
      stats.lastFailure = metric.timestamp
    }
    
    // Update averages (exponential moving average)
    const alpha = 0.1 // Smoothing factor
    stats.averageResponseTime = alpha * metric.responseTime + (1 - alpha) * stats.averageResponseTime
    stats.averageQuality = alpha * metric.dataQuality + (1 - alpha) * stats.averageQuality
    
    // Calculate success rate
    stats.successRate = stats.successCount / stats.totalRequests
    
    // Determine health
    stats.health = this.determineHealth(stats)
  }
  
  private determineHealth(stats: EndpointStats): 'healthy' | 'degraded' | 'unhealthy' {
    if (stats.successRate >= this.thresholds.successRate.healthy &&
        stats.averageResponseTime < this.thresholds.responseTime.good &&
        stats.averageQuality > this.thresholds.dataQuality.good) {
      return 'healthy'
    }
    
    if (stats.successRate >= this.thresholds.successRate.degraded &&
        stats.averageResponseTime < this.thresholds.responseTime.poor) {
      return 'degraded'
    }
    
    return 'unhealthy'
  }
  
  private checkAlerts(metric: DataQualityMetrics): void {
    const stats = this.endpointStats.get(metric.endpoint)
    if (!stats) return
    
    // Check for critical failures
    if (!metric.success) {
      const recentFailures = this.getRecentMetrics(metric.endpoint, 5 * 60 * 1000) // Last 5 minutes
        .filter(m => !m.success).length
      
      if (recentFailures >= 5) {
        this.createAlert({
          severity: 'critical',
          endpoint: metric.endpoint,
          message: `Endpoint has failed ${recentFailures} times in the last 5 minutes`
        })
      }
    }
    
    // Check for poor response times
    if (metric.responseTime > this.thresholds.responseTime.poor) {
      this.createAlert({
        severity: 'warning',
        endpoint: metric.endpoint,
        message: `Response time ${metric.responseTime}ms exceeds threshold`
      })
    }
    
    // Check for low data quality
    if (metric.dataQuality < this.thresholds.dataQuality.poor) {
      this.createAlert({
        severity: 'error',
        endpoint: metric.endpoint,
        message: `Data quality ${metric.dataQuality}% is below acceptable threshold`
      })
    }
    
    // Check for validation errors
    if (metric.validationErrors.length > 0) {
      this.createAlert({
        severity: 'warning',
        endpoint: metric.endpoint,
        message: `Validation errors: ${metric.validationErrors.join(', ')}`
      })
    }
  }
  
  private createAlert(params: {
    severity: Alert['severity']
    endpoint: string
    message: string
  }): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity: params.severity,
      endpoint: params.endpoint,
      message: params.message,
      timestamp: new Date(),
      resolved: false
    }
    
    // Check if similar alert already exists
    const existing = this.alerts.find(a => 
      !a.resolved &&
      a.endpoint === alert.endpoint &&
      a.message === alert.message &&
      (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // Within 5 minutes
    )
    
    if (!existing) {
      this.alerts.push(alert)
      this.emit('alert', alert)
    }
  }
  
  // Get recent metrics for an endpoint
  getRecentMetrics(endpoint: string, timeWindowMs: number): DataQualityMetrics[] {
    const cutoff = Date.now() - timeWindowMs
    return this.metrics.filter(m => 
      m.endpoint === endpoint &&
      m.timestamp.getTime() > cutoff
    )
  }
  
  // Get endpoint statistics
  getEndpointStats(endpoint: string): EndpointStats | undefined {
    return this.endpointStats.get(endpoint)
  }
  
  // Get all endpoint statistics
  getAllEndpointStats(): EndpointStats[] {
    return Array.from(this.endpointStats.values())
  }
  
  // Get system health summary
  getSystemHealth(): SystemHealth {
    const endpoints = new Map(this.endpointStats)
    const unhealthyCount = Array.from(endpoints.values())
      .filter(s => s.health === 'unhealthy').length
    const degradedCount = Array.from(endpoints.values())
      .filter(s => s.health === 'degraded').length
    
    let overallHealth: SystemHealth['overallHealth'] = 'healthy'
    if (unhealthyCount > endpoints.size * 0.5) {
      overallHealth = 'critical'
    } else if (unhealthyCount > 0 || degradedCount > endpoints.size * 0.3) {
      overallHealth = 'degraded'
    }
    
    const recommendations: string[] = []
    
    // Generate recommendations
    for (const [url, stats] of endpoints) {
      if (stats.health === 'unhealthy') {
        if (stats.successRate < 0.5) {
          recommendations.push(`Critical: ${url} has ${(stats.successRate * 100).toFixed(1)}% success rate`)
        }
        if (stats.averageResponseTime > this.thresholds.responseTime.poor) {
          recommendations.push(`Slow: ${url} average response time is ${stats.averageResponseTime.toFixed(0)}ms`)
        }
      }
    }
    
    // Add caching recommendation if many failures
    const totalFailures = Array.from(endpoints.values())
      .reduce((sum, s) => sum + s.failureCount, 0)
    if (totalFailures > 100) {
      recommendations.push('Consider implementing aggressive caching to reduce API load')
    }
    
    return {
      timestamp: new Date(),
      overallHealth,
      endpoints,
      alerts: this.alerts.filter(a => !a.resolved),
      recommendations
    }
  }
  
  // Get metrics summary for a time range
  getMetricsSummary(startTime: Date, endTime: Date): {
    totalRequests: number
    successRate: number
    averageResponseTime: number
    averageQuality: number
    cacheHitRate: number
    fallbackRate: number
    topErrors: Array<{ error: string; count: number }>
  } {
    const metrics = this.metrics.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    )
    
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        averageQuality: 0,
        cacheHitRate: 0,
        fallbackRate: 0,
        topErrors: []
      }
    }
    
    const successful = metrics.filter(m => m.success)
    const cached = metrics.filter(m => m.isCache)
    const fallback = metrics.filter(m => m.isFallback)
    
    // Count errors
    const errorCounts = new Map<string, number>()
    for (const metric of metrics) {
      for (const error of metric.validationErrors) {
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
      }
    }
    
    const topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }))
    
    return {
      totalRequests: metrics.length,
      successRate: successful.length / metrics.length,
      averageResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
      averageQuality: metrics.reduce((sum, m) => sum + m.dataQuality, 0) / metrics.length,
      cacheHitRate: cached.length / metrics.length,
      fallbackRate: fallback.length / metrics.length,
      topErrors
    }
  }
  
  // Cleanup old metrics
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.metricsRetentionMs
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff)
    
    // Also cleanup resolved alerts older than 1 hour
    const alertCutoff = Date.now() - 60 * 60 * 1000
    this.alerts = this.alerts.filter(a => 
      !a.resolved || a.timestamp.getTime() > alertCutoff
    )
  }
  
  // Calculate aggregated statistics
  private calculateStats(): void {
    // This is called periodically to update long-term stats
    // Could be extended to store historical data in a database
    
    const health = this.getSystemHealth()
    this.emit('health-update', health)
  }
  
  // Resolve an alert
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      this.emit('alert-resolved', alert)
    }
  }
  
  // Get alert history
  getAlertHistory(hours: number = 24): Alert[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000
    return this.alerts.filter(a => a.timestamp.getTime() > cutoff)
  }
  
  // Export metrics for analysis
  exportMetrics(): DataQualityMetrics[] {
    return [...this.metrics]
  }
  
  // Reset all statistics
  reset(): void {
    this.metrics = []
    this.endpointStats.clear()
    this.alerts = []
    this.emit('reset')
  }
}

// Singleton instance
export const dataQualityMonitor = new DataQualityMonitor()

// Helper function to wrap fetch with monitoring
export async function fetchWithMonitoring(
  url: string,
  fetchFn: () => Promise<{ data: any; quality: number; errors: string[] }>
): Promise<any> {
  const startTime = Date.now()
  const metric: DataQualityMetrics = {
    endpoint: url,
    timestamp: new Date(),
    responseTime: 0,
    success: false,
    dataQuality: 0,
    completeness: 0,
    validationErrors: [],
    isCache: false,
    isFallback: false
  }
  
  try {
    const result = await fetchFn()
    
    metric.responseTime = Date.now() - startTime
    metric.success = true
    metric.dataQuality = result.quality
    metric.validationErrors = result.errors
    
    dataQualityMonitor.recordMetric(metric)
    return result.data
    
  } catch (error) {
    metric.responseTime = Date.now() - startTime
    metric.success = false
    metric.validationErrors = [error instanceof Error ? error.message : 'Unknown error']
    
    dataQualityMonitor.recordMetric(metric)
    throw error
  }
}