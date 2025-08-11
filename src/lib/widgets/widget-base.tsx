'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  AlertCircle, 
  WifiOff,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { format } from 'date-fns'
import { WidgetConfig, WidgetDataState } from './widget-types'

interface WidgetBaseProps {
  config: WidgetConfig
  dataState: WidgetDataState
  onRefresh?: () => void
  onToggleExpanded?: () => void
  onExportData?: () => void
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  statusBadge?: React.ReactNode
  trendIndicator?: 'up' | 'down' | 'stable' | null
}

export function WidgetBase({
  config,
  dataState,
  onRefresh,
  onToggleExpanded,
  onExportData,
  children,
  className = '',
  actions,
  statusBadge,
  trendIndicator,
}: WidgetBaseProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getTrendIcon = (trend: 'up' | 'down' | 'stable' | null) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    if (!dataState.isLoading && !dataState.hasError && dataState.lastUpdated) {
      return 'border-l-green-500'
    }
    if (dataState.hasError) {
      return 'border-l-red-500'
    }
    if (dataState.isOffline) {
      return 'border-l-yellow-500'
    }
    return 'border-l-blue-500'
  }

  if (!config.isVisible) {
    return null
  }

  return (
    <Card className={`border-l-4 ${getStatusColor()} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <span>{config.title}</span>
              {trendIndicator && getTrendIcon(trendIndicator)}
            </CardTitle>
            {statusBadge}
          </div>
          
          <div className="flex items-center space-x-1">
            {/* Status indicators */}
            <div className="flex items-center space-x-1">
              {dataState.isOffline && (
                <WifiOff className="w-4 h-4 text-yellow-500" title="Offline" />
              )}
              {dataState.hasError && (
                <AlertCircle className="w-4 h-4 text-red-500" title={dataState.errorMessage} />
              )}
              {dataState.isLoading && (
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" title="Loading" />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-1">
              {actions}
              
              {onExportData && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onExportData}
                  title="Export data"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onRefresh}
                  disabled={dataState.isLoading}
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${dataState.isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
              
              {onToggleExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onToggleExpanded}
                  title={config.expanded ? "Collapse" : "Expand"}
                >
                  {config.expanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Last updated info */}
        {dataState.lastUpdated && (
          <CardDescription className="text-xs">
            Updated {format(dataState.lastUpdated, 'HH:mm:ss')}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className={config.expanded ? 'pt-0' : 'pt-0'}>
        {/* Error state */}
        {dataState.hasError && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-800">Failed to load data</p>
              {dataState.errorMessage && (
                <p className="text-xs text-red-600">{dataState.errorMessage}</p>
              )}
            </div>
          </div>
        )}

        {/* Offline state */}
        {dataState.isOffline && !dataState.hasError && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <WifiOff className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              You're offline. Showing cached data.
            </p>
          </div>
        )}

        {/* Loading state */}
        {dataState.isLoading && !dataState.lastUpdated && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-600">Loading...</span>
          </div>
        )}

        {/* Widget content */}
        {!dataState.isLoading || dataState.lastUpdated ? children : null}
      </CardContent>
    </Card>
  )
}

// Simple sparkline component for trend visualization
interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  className?: string
  showLastValue?: boolean
  unit?: string
}

export function Sparkline({ 
  data, 
  color = '#3b82f6', 
  height = 40, 
  className = '',
  showLastValue = true,
  unit = ''
}: SparklineProps) {
  if (!data || data.length === 0) {
    return <div className={`w-full ${className}`} style={{ height }} />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  
  // Calculate path points
  const width = 100 // Using percentage-based width
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const lastValue = data[data.length - 1]

  return (
    <div className={`relative inline-block w-full ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Area fill */}
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        <path
          d={`M${points} L${width},${height} L0,${height} Z`}
          fill={`url(#gradient-${color.replace('#', '')})`}
        />
        
        {/* Main line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        
        {/* Last point highlight */}
        {data.length > 1 && (
          <circle
            cx={(data.length - 1) / (data.length - 1) * width}
            cy={height - ((lastValue - min) / range) * height}
            r="2.5"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
        )}
      </svg>
      
      {showLastValue && (
        <div className="absolute right-0 top-0 bg-white/80 backdrop-blur-sm px-1 py-0.5 rounded text-xs font-medium text-gray-700 border">
          {lastValue.toFixed(1)}{unit}
        </div>
      )}
    </div>
  )
}

// Advanced chart component using Recharts for detailed views
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface MiniChartProps {
  data: Array<{ timestamp: Date | string, value: number, label?: string }>
  color?: string
  height?: number
  showAxis?: boolean
  unit?: string
}

export function MiniChart({ 
  data, 
  color = '#3b82f6', 
  height = 80, 
  showAxis = false,
  unit = ''
}: MiniChartProps) {
  if (!data || data.length === 0) {
    return <div style={{ height }} className="flex items-center justify-center text-gray-400 text-sm">No data</div>
  }

  const chartData = data.map(item => ({
    ...item,
    time: typeof item.timestamp === 'string' ? item.timestamp : item.timestamp.toISOString(),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        {showAxis && (
          <>
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => new Date(value).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
            />
            <YAxis tick={{ fontSize: 10 }} width={30} />
          </>
        )}
        <Tooltip 
          labelFormatter={(value) => new Date(value).toLocaleString()}
          formatter={(value: number) => [`${value.toFixed(2)}${unit}`, 'Value']}
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, stroke: color, strokeWidth: 2, fill: 'white' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Loading skeleton for widgets
export function WidgetSkeleton({ title }: { title?: string }) {
  return (
    <Card className="border-l-4 border-l-gray-300 animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
        {title && <div className="h-3 bg-gray-200 rounded w-20 mt-1"></div>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export utility functions
export const widgetUtils = {
  formatNumber: (value: number, decimals: number = 1) => {
    if (isNaN(value) || !isFinite(value)) return 'N/A'
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(decimals)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(decimals)}K`
    }
    return value.toFixed(decimals)
  },

  getHealthColor: (value: number, thresholds: { warning: number, critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600 bg-red-100'
    if (value >= thresholds.warning) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  },

  exportToCSV: (data: any[], filename: string) => {
    if (!data.length) return

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  },
}