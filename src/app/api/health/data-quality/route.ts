import { NextResponse } from 'next/server'
import { dataQualityMonitor } from '@/lib/data-quality/monitor'
import { checkMultipleEndpoints } from '@/lib/data-quality/fetcher'

const CRITICAL_ENDPOINTS = [
  'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
  'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json',
  'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json',
  'https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json',
  'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json',
  'https://services.swpc.noaa.gov/json/ace/swepam/ace_swepam_1h.json',
  'https://services.swpc.noaa.gov/json/dscovr/dscovr_mag_1s.json',
  'https://services.swpc.noaa.gov/json/geospace/geospace_dst_1_hour.json',
  'https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json',
  'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json'
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'summary'
    const hours = parseInt(searchParams.get('hours') || '24')
    
    switch (view) {
      case 'summary': {
        // Get overall system health
        const health = dataQualityMonitor.getSystemHealth()
        
        // Check current endpoint status
        const endpointHealth = await checkMultipleEndpoints(CRITICAL_ENDPOINTS)
        
        // Get metrics summary for time range
        const endTime = new Date()
        const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000)
        const summary = dataQualityMonitor.getMetricsSummary(startTime, endTime)
        
        // Calculate endpoint availability
        const availability = Array.from(endpointHealth.values())
          .filter(h => h.healthy).length / endpointHealth.size
        
        return NextResponse.json({
          status: health.overallHealth,
          timestamp: health.timestamp,
          availability: {
            percentage: (availability * 100).toFixed(1),
            healthy: Array.from(endpointHealth.values()).filter(h => h.healthy).length,
            total: endpointHealth.size
          },
          metrics: {
            period: `${hours} hours`,
            totalRequests: summary.totalRequests,
            successRate: (summary.successRate * 100).toFixed(1),
            averageResponseTime: Math.round(summary.averageResponseTime),
            averageQuality: summary.averageQuality.toFixed(1),
            cacheHitRate: (summary.cacheHitRate * 100).toFixed(1),
            fallbackRate: (summary.fallbackRate * 100).toFixed(1)
          },
          activeAlerts: health.alerts.length,
          recommendations: health.recommendations,
          topErrors: summary.topErrors
        })
      }
      
      case 'endpoints': {
        // Get detailed endpoint statistics
        const stats = dataQualityMonitor.getAllEndpointStats()
        const health = await checkMultipleEndpoints(
          stats.map(s => s.url)
        )
        
        const endpoints = stats.map(stat => ({
          url: stat.url,
          status: stat.health,
          currentHealth: health.get(stat.url)?.healthy || false,
          latency: health.get(stat.url)?.latency || 0,
          stats: {
            requests: stat.totalRequests,
            successRate: (stat.successRate * 100).toFixed(1),
            avgResponseTime: Math.round(stat.averageResponseTime),
            avgQuality: stat.averageQuality.toFixed(1),
            lastSuccess: stat.lastSuccess,
            lastFailure: stat.lastFailure
          }
        }))
        
        return NextResponse.json({
          timestamp: new Date(),
          endpoints: endpoints.sort((a, b) => {
            // Sort by health status, then by success rate
            const healthOrder = { healthy: 0, degraded: 1, unhealthy: 2 }
            const healthDiff = healthOrder[a.status] - healthOrder[b.status]
            if (healthDiff !== 0) return healthDiff
            return parseFloat(b.stats.successRate) - parseFloat(a.stats.successRate)
          })
        })
      }
      
      case 'alerts': {
        // Get alert history
        const alerts = dataQualityMonitor.getAlertHistory(hours)
        
        return NextResponse.json({
          timestamp: new Date(),
          period: `${hours} hours`,
          total: alerts.length,
          active: alerts.filter(a => !a.resolved).length,
          resolved: alerts.filter(a => a.resolved).length,
          bySeverity: {
            critical: alerts.filter(a => a.severity === 'critical').length,
            error: alerts.filter(a => a.severity === 'error').length,
            warning: alerts.filter(a => a.severity === 'warning').length,
            info: alerts.filter(a => a.severity === 'info').length
          },
          alerts: alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        })
      }
      
      case 'realtime': {
        // Get real-time health check
        const checks = await Promise.all(
          CRITICAL_ENDPOINTS.map(async (url) => {
            const start = Date.now()
            try {
              const response = await fetch(url, {
                signal: AbortSignal.timeout(5000)
              })
              
              const latency = Date.now() - start
              const data = await response.json()
              const hasData = Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0
              
              return {
                url,
                status: response.ok ? 'online' : 'error',
                statusCode: response.status,
                latency,
                hasData,
                dataPoints: Array.isArray(data) ? data.length : undefined
              }
            } catch (error) {
              return {
                url,
                status: 'offline',
                statusCode: 0,
                latency: Date.now() - start,
                hasData: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          })
        )
        
        const online = checks.filter(c => c.status === 'online').length
        const avgLatency = checks.reduce((sum, c) => sum + c.latency, 0) / checks.length
        
        return NextResponse.json({
          timestamp: new Date(),
          summary: {
            online,
            offline: checks.length - online,
            availability: ((online / checks.length) * 100).toFixed(1),
            averageLatency: Math.round(avgLatency)
          },
          endpoints: checks
        })
      }
      
      case 'export': {
        // Export metrics for analysis
        const metrics = dataQualityMonitor.exportMetrics()
        
        return NextResponse.json({
          timestamp: new Date(),
          count: metrics.length,
          metrics: metrics.slice(-1000) // Limit to last 1000 for performance
        })
      }
      
      default:
        return NextResponse.json({
          error: 'Invalid view parameter',
          validViews: ['summary', 'endpoints', 'alerts', 'realtime', 'export']
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      error: 'Failed to get health status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST endpoint to resolve alerts
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, alertId } = body
    
    if (action === 'resolve' && alertId) {
      dataQualityMonitor.resolveAlert(alertId)
      return NextResponse.json({ success: true, alertId })
    }
    
    if (action === 'reset') {
      dataQualityMonitor.reset()
      return NextResponse.json({ success: true, message: 'Monitor reset' })
    }
    
    return NextResponse.json({
      error: 'Invalid action',
      validActions: ['resolve', 'reset']
    }, { status: 400 })
    
  } catch (error) {
    console.error('Health action error:', error)
    return NextResponse.json({
      error: 'Failed to perform action',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}