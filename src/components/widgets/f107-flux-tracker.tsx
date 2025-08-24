'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, TrendingDown, Minus, Sun, Activity } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface F107FluxData {
  current: number
  observed: number
  adjusted: number
  monthlyAverage: number
  trend: 'increasing' | 'decreasing' | 'stable'
  solarCyclePhase: 'minimum' | 'rising' | 'maximum' | 'declining'
  history: Array<{
    time: Date
    observed: number
    adjusted: number
  }>
  forecast: Array<{
    time: Date
    predicted: number
    uncertainty: number
  }>
  statistics: {
    min30d: number
    max30d: number
    avg30d: number
    percentile: number
  }
}

export default function F107FluxTracker() {
  const [data, setData] = useState<F107FluxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchF107Data()
    const interval = setInterval(fetchF107Data, 3600000) // Update every hour
    return () => clearInterval(interval)
  }, [])

  const fetchF107Data = async () => {
    try {
      const response = await fetch('/api/data/f107-flux')
      if (!response.ok) throw new Error('Failed to fetch F10.7 data')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch F10.7 data')
    } finally {
      setLoading(false)
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'minimum': return 'bg-blue-500'
      case 'rising': return 'bg-green-500'
      case 'maximum': return 'bg-orange-500'
      case 'declining': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />
      default: return null
    }
  }

  const getActivityLevel = (flux: number) => {
    if (flux < 70) return { level: 'Very Low', color: 'text-blue-500' }
    if (flux < 90) return { level: 'Low', color: 'text-green-500' }
    if (flux < 120) return { level: 'Moderate', color: 'text-yellow-500' }
    if (flux < 160) return { level: 'High', color: 'text-orange-500' }
    if (flux < 200) return { level: 'Very High', color: 'text-red-500' }
    return { level: 'Extreme', color: 'text-purple-500' }
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
            <Sun className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error || 'No data available'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activityLevel = getActivityLevel(data.current)

  // Create mini chart for history
  const createMiniChart = () => {
    if (!data.history || data.history.length < 2) return null
    
    const width = 200
    const height = 50
    const padding = 2
    
    const values = data.history.map(h => h.observed)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    
    const points = data.history.map((h, i) => {
      const x = (i / (data.history.length - 1)) * (width - 2 * padding) + padding
      const y = height - ((h.observed - min) / range) * (height - 2 * padding) - padding
      return `${x},${y}`
    }).join(' ')
    
    // Add reference line for monthly average
    const avgY = height - ((data.monthlyAverage - min) / range) * (height - 2 * padding) - padding
    
    return (
      <svg width={width} height={height} className="inline-block">
        <line
          x1={padding}
          y1={avgY}
          x2={width - padding}
          y2={avgY}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2,2"
          className="text-gray-400"
        />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-yellow-500"
        />
      </svg>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-yellow-500" />
            <span>F10.7 Solar Flux</span>
          </div>
          <Badge className={cn(getPhaseColor(data.solarCyclePhase), 'text-white capitalize')}>
            {data.solarCyclePhase}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Value */}
        <div className="text-center">
          <div className="text-3xl font-bold">{data.current}</div>
          <div className="text-sm text-gray-500">sfu (10⁻²² W/m²/Hz)</div>
          <div className={cn('text-sm font-medium mt-1', activityLevel.color)}>
            {activityLevel.level} Activity
          </div>
        </div>

        {/* Trend and Values */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-500">Observed</div>
            <div className="font-semibold">{data.observed}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Adjusted</div>
            <div className="font-semibold">{data.adjusted}</div>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-center gap-2">
          {getTrendIcon(data.trend)}
          <span className="text-sm text-gray-600 capitalize">{data.trend}</span>
          <span className="text-xs text-gray-500">
            (Avg: {data.monthlyAverage})
          </span>
        </div>

        {/* 30-Day Statistics */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>30-Day Range</span>
            <span>{data.statistics.min30d} - {data.statistics.max30d}</span>
          </div>
          <Progress value={data.statistics.percentile} className="h-2" />
          <div className="text-xs text-center text-gray-500">
            {data.statistics.percentile}th percentile
          </div>
        </div>

        {/* Mini Chart */}
        {data.history && data.history.length > 0 && (
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">30-Day History</div>
            {createMiniChart()}
          </div>
        )}

        {/* Forecast */}
        {data.forecast && data.forecast.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium">3-Day Forecast</div>
            {data.forecast.map((f, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-500">
                  Day {i + 1}
                </span>
                <span>
                  {f.predicted} ± {f.uncertainty}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 border-t pt-2">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Solar radio flux at 10.7 cm wavelength
          </div>
        </div>
      </CardContent>
    </Card>
  )
}