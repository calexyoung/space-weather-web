'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Sun, TrendingUp, TrendingDown, Minus, Calendar, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SolarCycleData {
  currentCycle: {
    number: 25
    phase: 'Rising' | 'Maximum' | 'Declining' | 'Minimum'
    startDate: string
    expectedMaximum: string
    currentSSN: number
    smoothedSSN: number
    monthlyAverage: number
  }
  historical: {
    observed: Array<{
      date: string
      ssn: number
      smoothed: number
      f107: number
    }>
    predicted: Array<{
      date: string
      ssnPredicted: number
      ssnHigh: number
      ssnLow: number
    }>
  }
  statistics: {
    currentVsPredicted: number
    trendDirection: 'Rising' | 'Falling' | 'Stable'
    monthsToMaximum: number | null
    cycleProgress: number
  }
  f107Correlation: {
    current: number
    monthly: number
    correlation: number
  }
}

export default function SolarCycleDashboard() {
  const [data, setData] = useState<SolarCycleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'current' | 'historical'>('current')

  useEffect(() => {
    fetchSolarCycleData()
    const interval = setInterval(fetchSolarCycleData, 86400000) // Update daily
    return () => clearInterval(interval)
  }, [])

  const fetchSolarCycleData = async () => {
    try {
      const response = await fetch('/api/data/solar-cycle')
      if (!response.ok) throw new Error('Failed to fetch solar cycle data')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch solar cycle data')
    } finally {
      setLoading(false)
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Maximum': return 'bg-red-500 text-white'
      case 'Rising': return 'bg-orange-500 text-white'
      case 'Declining': return 'bg-yellow-500 text-black'
      case 'Minimum': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'Rising': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'Falling': return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'Stable': return <Minus className="w-4 h-4 text-gray-500" />
      default: return null
    }
  }

  const createHistoricalChart = () => {
    if (!data || data.historical.observed.length === 0) return null
    
    const width = 300
    const height = 100
    const padding = 10
    
    // Combine observed and predicted data
    const observed = data.historical.observed.slice(-180) // Last 6 months
    const predicted = data.historical.predicted.slice(0, 90) // Next 3 months
    
    const allValues = [...observed.map(d => d.ssn), ...predicted.map(d => d.ssnPredicted)]
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const range = max - min || 1
    
    // Create observed line
    const observedPoints = observed.map((d, i) => {
      const x = (i / (observed.length + predicted.length - 1)) * (width - 2 * padding) + padding
      const y = height - ((d.ssn - min) / range) * (height - 2 * padding) - padding
      return `${x},${y}`
    }).join(' ')
    
    // Create predicted line
    const predictedPoints = predicted.map((d, i) => {
      const x = ((observed.length + i) / (observed.length + predicted.length - 1)) * (width - 2 * padding) + padding
      const y = height - ((d.ssnPredicted - min) / range) * (height - 2 * padding) - padding
      return `${x},${y}`
    }).join(' ')
    
    // Create smoothed line
    const smoothedPoints = observed.filter(d => d.smoothed > 0).map((d, i) => {
      const x = (i / (observed.length - 1)) * (width - 2 * padding) + padding
      const y = height - ((d.smoothed - min) / range) * (height - 2 * padding) - padding
      return `${x},${y}`
    }).join(' ')
    
    return (
      <svg width={width} height={height} className="w-full">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(pct => (
          <line
            key={pct}
            x1={padding}
            y1={height - (pct / 100) * (height - 2 * padding) - padding}
            x2={width - padding}
            y2={height - (pct / 100) * (height - 2 * padding) - padding}
            stroke="currentColor"
            strokeOpacity="0.1"
            className="text-gray-400"
          />
        ))}
        
        {/* Smoothed line */}
        {smoothedPoints && (
          <polyline
            points={smoothedPoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4,2"
            className="text-blue-400"
          />
        )}
        
        {/* Observed line */}
        <polyline
          points={observedPoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-blue-600"
        />
        
        {/* Predicted line */}
        {predictedPoints && (
          <polyline
            points={predictedPoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="2,2"
            className="text-orange-500"
          />
        )}
        
        {/* Current point */}
        {observed.length > 0 && (
          <circle
            cx={(observed.length - 1) / (observed.length + predicted.length - 1) * (width - 2 * padding) + padding}
            cy={height - ((observed[observed.length - 1].ssn - min) / range) * (height - 2 * padding) - padding}
            r="3"
            fill="currentColor"
            className="text-red-500"
          />
        )}
      </svg>
    )
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-yellow-500" />
            <span>Solar Cycle {data.currentCycle.number}</span>
          </div>
          <Badge className={cn(getPhaseColor(data.currentCycle.phase))}>
            {data.currentCycle.phase}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle View */}
        <div className="flex gap-2">
          <button
            onClick={() => setView('current')}
            className={cn(
              'flex-1 px-3 py-1 rounded text-sm font-medium transition-colors',
              view === 'current' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Current Status
          </button>
          <button
            onClick={() => setView('historical')}
            className={cn(
              'flex-1 px-3 py-1 rounded text-sm font-medium transition-colors',
              view === 'historical' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Historical View
          </button>
        </div>

        {view === 'current' ? (
          <>
            {/* Current SSN */}
            <div className="text-center">
              <div className="text-3xl font-bold">{data.currentCycle.currentSSN}</div>
              <div className="text-sm text-gray-500">Sunspot Number</div>
              <div className="flex items-center justify-center gap-2 mt-1">
                {getTrendIcon(data.statistics.trendDirection)}
                <span className="text-sm text-gray-600">{data.statistics.trendDirection}</span>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-gray-500">Smoothed</div>
                <div className="font-semibold">{data.currentCycle.smoothedSSN}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Monthly Avg</div>
                <div className="font-semibold">{data.currentCycle.monthlyAverage}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">vs Predicted</div>
                <div className={cn(
                  'font-semibold',
                  data.statistics.currentVsPredicted > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {data.statistics.currentVsPredicted > 0 ? '+' : ''}{data.statistics.currentVsPredicted}%
                </div>
              </div>
            </div>

            {/* Cycle Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Cycle Progress</span>
                <span>{data.statistics.cycleProgress.toFixed(1)}%</span>
              </div>
              <Progress value={data.statistics.cycleProgress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Started: {new Date(data.currentCycle.startDate).toLocaleDateString()}</span>
                <span>Max: {new Date(data.currentCycle.expectedMaximum).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Time to Maximum */}
            {data.statistics.monthsToMaximum !== null && data.statistics.monthsToMaximum > 0 && (
              <div className="p-3 bg-blue-50 rounded">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    ~{data.statistics.monthsToMaximum} months to maximum
                  </span>
                </div>
              </div>
            )}

            {/* F10.7 Correlation */}
            <div className="p-3 bg-gray-50 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">F10.7 Flux Correlation</span>
                <Badge variant="secondary">{(data.f107Correlation.correlation * 100).toFixed(1)}%</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">F10.7 Current: </span>
                  <span className="font-medium">{data.f107Correlation.current} sfu</span>
                </div>
                <div>
                  <span className="text-gray-500">F10.7 Monthly: </span>
                  <span className="font-medium">{data.f107Correlation.monthly} sfu</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Historical Chart */}
            <div className="space-y-2">
              <div className="text-sm font-medium">6-Month History + 3-Month Forecast</div>
              {createHistoricalChart()}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-blue-600"></div>
                  <span>Observed</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-blue-400 opacity-50"></div>
                  <span>Smoothed</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-orange-500" style={{ borderTop: '2px dashed' }}></div>
                  <span>Predicted</span>
                </div>
              </div>
            </div>

            {/* Recent Values Table */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Recent Values</div>
              <div className="max-h-32 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">Date</th>
                      <th className="text-right py-1">SSN</th>
                      <th className="text-right py-1">Smoothed</th>
                      <th className="text-right py-1">F10.7</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.historical.observed.slice(-10).reverse().map((d, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-1">{new Date(d.date).toLocaleDateString()}</td>
                        <td className="text-right font-mono">{d.ssn}</td>
                        <td className="text-right font-mono">{d.smoothed.toFixed(1)}</td>
                        <td className="text-right font-mono">{d.f107.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Info Footer */}
        <div className="text-xs text-gray-500 border-t pt-2">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            11-year solar magnetic activity cycle
          </div>
        </div>
      </CardContent>
    </Card>
  )
}