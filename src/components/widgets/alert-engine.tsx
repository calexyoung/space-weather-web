'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertTriangle, Bell, BellOff, Shield, Zap, Radio, Satellite, Sun, Activity, Clock, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertEngineData {
  operational: boolean
  lastCheck: Date
  nextCheck: Date
  monitoredParameters: number
  activeAlerts: Array<{
    id: string
    criteriaId: string
    name: string
    category: string
    severity: 'info' | 'warning' | 'alert' | 'critical'
    message: string
    value: number
    threshold: number
    unit: string
    triggeredAt: Date
    expiresAt: Date
    dataSource: string
    recommendations: string[]
  }>
  recentAlerts: Array<{
    id: string
    criteriaId: string
    name: string
    category: string
    severity: 'info' | 'warning' | 'alert' | 'critical'
    message: string
    value: number
    threshold: number
    unit: string
    triggeredAt: Date
    expiresAt: Date
    dataSource: string
    recommendations: string[]
  }>
  statistics: {
    totalAlertsToday: number
    alertsBySeverity: {
      info: number
      warning: number
      alert: number
      critical: number
    }
    alertsByCategory: {
      solar: number
      geomagnetic: number
      radiation: number
      radio: number
      satellite: number
    }
  }
}

export default function AlertEngine() {
  const [data, setData] = useState<AlertEngineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'active' | 'recent' | 'statistics'>('active')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)

  useEffect(() => {
    fetchAlertData()
    const interval = setInterval(fetchAlertData, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Play sound for critical alerts if enabled
    if (soundEnabled && data?.activeAlerts.some(a => a.severity === 'critical')) {
      // In a real app, you'd play an actual alert sound here
      console.log('🔔 Critical alert!')
    }
  }, [data?.activeAlerts, soundEnabled])

  const fetchAlertData = async () => {
    try {
      const response = await fetch('/api/alerts/engine')
      if (!response.ok) throw new Error('Failed to fetch alert data')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alert data')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white'
      case 'alert': return 'bg-orange-600 text-white'
      case 'warning': return 'bg-yellow-500 text-black'
      case 'info': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Zap className="w-4 h-4" />
      case 'alert': return <AlertTriangle className="w-4 h-4" />
      case 'warning': return <Bell className="w-4 h-4" />
      case 'info': return <Activity className="w-4 h-4" />
      default: return <Shield className="w-4 h-4" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'solar': return <Sun className="w-4 h-4 text-yellow-500" />
      case 'geomagnetic': return <Activity className="w-4 h-4 text-purple-500" />
      case 'radiation': return <Zap className="w-4 h-4 text-red-500" />
      case 'radio': return <Radio className="w-4 h-4 text-blue-500" />
      case 'satellite': return <Satellite className="w-4 h-4 text-green-500" />
      default: return <Shield className="w-4 h-4 text-gray-500" />
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const formatTimeUntil = (date: Date) => {
    const now = new Date()
    const diff = new Date(date).getTime() - now.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m`
    return 'Expired'
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error || 'No data available'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderAlert = (alert: any, isRecent: boolean = false) => {
    const isExpanded = expandedAlert === alert.id

    return (
      <div
        key={alert.id}
        className={cn(
          "p-3 rounded-lg border transition-all cursor-pointer",
          isRecent ? "opacity-60" : "",
          isExpanded ? "bg-gray-50" : "hover:bg-gray-50"
        )}
        onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5">{getCategoryIcon(alert.category)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{alert.name}</span>
                <Badge className={cn('text-xs', getSeverityColor(alert.severity))}>
                  <span className="flex items-center gap-1">
                    {getSeverityIcon(alert.severity)}
                    {alert.severity.toUpperCase()}
                  </span>
                </Badge>
              </div>
              <p className="text-xs text-gray-600">{alert.message}</p>
              
              {isExpanded && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Value: </span>
                      <span className="font-mono font-medium">
                        {alert.value < 0.001 ? alert.value.toExponential(2) : alert.value.toFixed(2)}
                        {alert.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Threshold: </span>
                      <span className="font-mono font-medium">
                        {alert.threshold < 0.001 ? alert.threshold.toExponential(2) : alert.threshold.toFixed(2)}
                        {alert.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Source: </span>
                      <span className="font-medium">{alert.dataSource}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Expires: </span>
                      <span className="font-medium">{formatTimeUntil(alert.expiresAt)}</span>
                    </div>
                  </div>
                  
                  {alert.recommendations.length > 0 && (
                    <div className="border-t pt-2">
                      <div className="text-xs font-medium mb-1">Recommendations:</div>
                      <ul className="space-y-0.5">
                        {alert.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-gray-400">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500 text-right">
            {formatTimeAgo(alert.triggeredAt)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span>Alert Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title={soundEnabled ? "Mute alerts" : "Enable alert sounds"}
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4 text-gray-400" />}
            </button>
            <div className="flex items-center gap-1">
              {data.operational ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600">Operational</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-600">Offline</span>
                </>
              )}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Bar */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600">
                Next check: {new Date(data.nextCheck).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-gray-600">
              Monitoring <span className="font-medium">{data.monitoredParameters}</span> parameters
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.activeAlerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {data.activeAlerts.length} ACTIVE
              </Badge>
            )}
          </div>
        </div>

        {/* View Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setView('active')}
            className={cn(
              'flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
              view === 'active' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Active ({data.activeAlerts.length})
          </button>
          <button
            onClick={() => setView('recent')}
            className={cn(
              'flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
              view === 'recent' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Recent ({data.recentAlerts.length})
          </button>
          <button
            onClick={() => setView('statistics')}
            className={cn(
              'flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
              view === 'statistics' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Statistics
          </button>
        </div>

        {/* Content Area */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {view === 'active' && (
            <>
              {data.activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">All systems normal</p>
                  <p className="text-xs">No active alerts</p>
                </div>
              ) : (
                data.activeAlerts.map(alert => renderAlert(alert))
              )}
            </>
          )}

          {view === 'recent' && (
            <>
              {data.recentAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No recent alerts</p>
                </div>
              ) : (
                data.recentAlerts.map(alert => renderAlert(alert, true))
              )}
            </>
          )}

          {view === 'statistics' && (
            <div className="space-y-4">
              {/* Today's Summary */}
              <div className="p-3 bg-blue-50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Today's Activity</span>
                  <Badge variant="secondary">{data.statistics.totalAlertsToday} alerts</Badge>
                </div>
              </div>

              {/* Severity Breakdown */}
              <div className="space-y-2">
                <div className="text-sm font-medium">By Severity</div>
                {Object.entries(data.statistics.alertsBySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', getSeverityColor(severity))}>
                        {severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-1 ml-4">
                      <Progress 
                        value={(count / Math.max(data.statistics.totalAlertsToday, 1)) * 100} 
                        className="flex-1 h-2"
                      />
                      <span className="text-xs font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Category Breakdown */}
              <div className="space-y-2">
                <div className="text-sm font-medium">By Category</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(data.statistics.alertsByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <span className="text-xs capitalize">{category}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}