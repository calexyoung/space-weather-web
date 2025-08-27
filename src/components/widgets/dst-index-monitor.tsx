'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DstIndexData {
  current: number
  currentLevel: 'Quiet' | 'Unsettled' | 'Minor Storm' | 'Moderate Storm' | 'Strong Storm' | 'Severe Storm' | 'Extreme Storm'
  min24h: number
  max24h: number
  average24h: number
  trend: 'recovering' | 'intensifying' | 'stable'
  history: Array<{
    time: Date
    value: number
  }>
  stormProbability: {
    minor: number
    moderate: number
    strong: number
    severe: number
  }
}

export default function DstIndexMonitor() {
  const [data, setData] = useState<DstIndexData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchDstData()
    const interval = setInterval(fetchDstData, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const fetchDstData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/data/dst-index')
      if (!response.ok) throw new Error('Failed to fetch DST data')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch DST data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!data) return
    
    const exportData = {
      timestamp: new Date().toISOString(),
      current: data.current,
      level: data.currentLevel,
      trend: data.trend,
      statistics_24h: {
        min: data.min24h,
        max: data.max24h,
        average: data.average24h
      },
      storm_probability: data.stormProbability,
      history: data.history
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dst-index-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Quiet': return 'bg-green-500'
      case 'Unsettled': return 'bg-yellow-500'
      case 'Minor Storm': return 'bg-orange-500'
      case 'Moderate Storm': return 'bg-red-500'
      case 'Strong Storm': return 'bg-red-600'
      case 'Severe Storm': return 'bg-purple-600'
      case 'Extreme Storm': return 'bg-purple-800'
      default: return 'bg-gray-500'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'recovering': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'intensifying': return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />
      default: return null
    }
  }

  const formatValue = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)} nT`
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

  // Create sparkline SVG from history
  const createSparkline = () => {
    if (!data.history || data.history.length < 2) return null
    
    const width = 200
    const height = 40
    const padding = 2
    
    const values = data.history.map(h => h.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    
    const points = data.history.map((h, i) => {
      const x = (i / (data.history.length - 1)) * (width - 2 * padding) + padding
      const y = height - ((h.value - min) / range) * (height - 2 * padding) - padding
      return `${x},${y}`
    }).join(' ')
    
    return (
      <svg width={width} height={height} className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-blue-500"
        />
      </svg>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>DST Index Monitor</span>
            <Badge className={cn(getLevelColor(data.currentLevel), 'text-white')}>
              {data.currentLevel}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleExport}
              title="Export data"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={fetchDstData}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Value */}
        <div className="text-center">
          <div className="text-3xl font-bold">
            {formatValue(data.current)}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            {getTrendIcon(data.trend)}
            <span className="text-sm text-gray-600 capitalize">{data.trend}</span>
          </div>
        </div>

        {/* 24h Statistics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-500">Min 24h</div>
            <div className="font-semibold">{formatValue(data.min24h)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Avg 24h</div>
            <div className="font-semibold">{formatValue(data.average24h)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Max 24h</div>
            <div className="font-semibold">{formatValue(data.max24h)}</div>
          </div>
        </div>

        {/* Sparkline */}
        {data.history && data.history.length > 0 && (
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">48-Hour Trend</div>
            {createSparkline()}
          </div>
        )}

        {/* Storm Probabilities */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Storm Probability (24h)</div>
          {Object.entries(data.stormProbability).map(([level, probability]) => (
            <div key={level} className="flex items-center gap-2">
              <span className="text-xs w-20 capitalize">{level}</span>
              <Progress value={probability} className="flex-1 h-2" />
              <span className="text-xs w-10 text-right">{probability}%</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="text-xs text-gray-500 border-t pt-2">
          <div>DST measures ring current strength</div>
          <div>More negative = stronger storm</div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">DST Index Details</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>The Disturbance Storm Time (DST) index monitors the intensity of the ring current that encircles Earth during geomagnetic storms.</p>
                <p>Values are measured in nanoteslas (nT):</p>
                <ul className="ml-4 space-y-1">
                  <li>• {'>'} -30 nT: Quiet conditions</li>
                  <li>• -30 to -50 nT: Unsettled</li>
                  <li>• -50 to -100 nT: Minor storm (G1)</li>
                  <li>• -100 to -200 nT: Moderate storm (G2)</li>
                  <li>• -200 to -300 nT: Strong storm (G3)</li>
                  <li>• -300 to -400 nT: Severe storm (G4)</li>
                  <li>• {'<'} -400 nT: Extreme storm (G5)</li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Conditions Analysis</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Current DST: {formatValue(data.current)}</p>
                <p>Storm Level: {data.currentLevel}</p>
                <p>Trend: {data.trend === 'recovering' ? 'Field recovering (improving)' : 
                         data.trend === 'intensifying' ? 'Field intensifying (worsening)' : 
                         'Field stable'}</p>
                <p>24-hour range: {formatValue(data.min24h)} to {formatValue(data.max24h)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Potential Impacts</h4>
              <div className="text-xs text-gray-600">
                {data.currentLevel === 'Quiet' && (
                  <p>No significant impacts expected. Normal operations for all systems.</p>
                )}
                {data.currentLevel === 'Unsettled' && (
                  <p>Minor fluctuations possible in power grids at high latitudes. Satellite operations normal.</p>
                )}
                {(data.currentLevel === 'Minor Storm' || data.currentLevel === 'Moderate Storm') && (
                  <div className="space-y-1">
                    <p>• Power systems: Voltage fluctuations possible</p>
                    <p>• Satellites: Increased drag on low-Earth orbit satellites</p>
                    <p>• Navigation: GPS accuracy may be degraded</p>
                    <p>• Aurora visible at higher latitudes</p>
                  </div>
                )}
                {(data.currentLevel === 'Strong Storm' || data.currentLevel === 'Severe Storm' || data.currentLevel === 'Extreme Storm') && (
                  <div className="space-y-1">
                    <p className="text-red-600 font-medium">Significant impacts likely:</p>
                    <p>• Power grids: Possible widespread voltage control problems</p>
                    <p>• Satellites: Surface charging, orientation problems</p>
                    <p>• Navigation: GPS may be unreliable for hours</p>
                    <p>• Communications: HF radio propagation issues</p>
                    <p>• Aurora visible at mid-latitudes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}