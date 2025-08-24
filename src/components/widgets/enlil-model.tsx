'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Wind, Zap, AlertTriangle, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnlilModelData {
  solarWind: {
    currentSpeed: number
    currentDensity: number
    currentTemperature: number
    trend: 'increasing' | 'decreasing' | 'stable'
  }
  cmeEvents: Array<{
    id: string
    launchTime: Date
    earthArrival: Date | null
    speed: number
    type: 'Halo' | 'Partial Halo' | 'Non-Halo'
    earthDirected: boolean
    probability: number
    expectedSpeed: number
  }>
  modelPrediction: {
    timeRange: {
      start: Date
      end: Date
    }
    peakSpeed: number
    peakTime: Date | null
    shockArrival: Date | null
    duration: number
    confidence: 'High' | 'Medium' | 'Low'
  }
  streamStructure: {
    currentStream: 'Slow' | 'Fast' | 'Transient'
    coronalHole: {
      present: boolean
      latitude: number | null
      influence: number
    }
    sectorBoundary: {
      crossing: boolean
      time: Date | null
    }
  }
  impacts: {
    magnetosphere: {
      compression: 'None' | 'Minor' | 'Moderate' | 'Strong'
      stormProbability: number
      expectedKp: number
    }
    radiation: {
      enhancement: boolean
      sepProbability: number
    }
  }
  visualization: {
    velocityMap: Array<{
      angle: number
      distance: number
      velocity: number
    }>
  }
}

export default function EnlilModel() {
  const [data, setData] = useState<EnlilModelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEnlilData()
    const interval = setInterval(fetchEnlilData, 600000) // Update every 10 minutes
    return () => clearInterval(interval)
  }, [])

  const fetchEnlilData = async () => {
    try {
      const response = await fetch('/api/data/enlil-model')
      if (!response.ok) throw new Error('Failed to fetch ENLIL model data')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ENLIL model data')
    } finally {
      setLoading(false)
    }
  }

  const getStreamColor = (stream: string) => {
    switch (stream) {
      case 'Fast': return 'bg-red-500 text-white'
      case 'Transient': return 'bg-orange-500 text-white'
      case 'Slow': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getCompressionColor = (compression: string) => {
    switch (compression) {
      case 'Strong': return 'text-red-600'
      case 'Moderate': return 'text-orange-500'
      case 'Minor': return 'text-yellow-500'
      default: return 'text-green-500'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-green-500" />
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />
      default: return null
    }
  }

  const getSpeedCategory = (speed: number) => {
    if (speed < 350) return { level: 'Slow', color: 'text-green-500' }
    if (speed < 500) return { level: 'Ambient', color: 'text-blue-500' }
    if (speed < 600) return { level: 'Elevated', color: 'text-yellow-500' }
    if (speed < 700) return { level: 'Fast', color: 'text-orange-500' }
    return { level: 'High Speed', color: 'text-red-500' }
  }

  const formatTimeToArrival = (arrival: Date | null) => {
    if (!arrival) return 'N/A'
    const now = new Date()
    const arrivalTime = new Date(arrival)
    const hoursToArrival = (arrivalTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursToArrival < 0) return 'Arrived'
    if (hoursToArrival < 24) return `${Math.round(hoursToArrival)}h`
    return `${Math.round(hoursToArrival / 24)}d`
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
            <Wind className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error || 'No data available'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const speedCategory = getSpeedCategory(data.solarWind.currentSpeed)

  // Create mini velocity visualization
  const createVelocityVisualization = () => {
    const width = 200
    const height = 60
    const centerX = width / 2
    const centerY = height / 2
    
    // Filter for Earth-line velocities (angle near 0)
    const earthLineData = data.visualization.velocityMap
      .filter(d => Math.abs(d.angle) < 30 && d.distance <= 1.2)
      .sort((a, b) => a.distance - b.distance)
    
    if (earthLineData.length === 0) return null
    
    const maxVelocity = Math.max(...earthLineData.map(d => d.velocity))
    const minVelocity = Math.min(...earthLineData.map(d => d.velocity))
    
    return (
      <svg width={width} height={height} className="inline-block">
        {/* Earth position */}
        <circle cx={centerX + 70} cy={centerY} r="4" fill="#3b82f6" />
        <text x={centerX + 70} y={centerY - 8} className="text-xs fill-gray-500" textAnchor="middle">
          Earth
        </text>
        
        {/* Sun position */}
        <circle cx={20} cy={centerY} r="6" fill="#eab308" />
        <text x={20} y={centerY - 10} className="text-xs fill-gray-500" textAnchor="middle">
          Sun
        </text>
        
        {/* Velocity gradient bars */}
        {earthLineData.map((d, i) => {
          const x = 40 + (d.distance - 0.5) * 100
          const colorIntensity = (d.velocity - minVelocity) / (maxVelocity - minVelocity)
          const height = 10 + colorIntensity * 20
          const color = `hsl(${30 - colorIntensity * 30}, 100%, 50%)`
          
          return (
            <rect
              key={i}
              x={x}
              y={centerY - height / 2}
              width={8}
              height={height}
              fill={color}
              opacity={0.7}
            />
          )
        })}
      </svg>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-blue-500" />
            <span>ENLIL Model</span>
          </div>
          <Badge className={cn(getStreamColor(data.streamStructure.currentStream))}>
            {data.streamStructure.currentStream} Stream
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Solar Wind */}
        <div className="text-center">
          <div className="text-3xl font-bold">{data.solarWind.currentSpeed}</div>
          <div className="text-sm text-gray-500">km/s</div>
          <div className={cn('text-sm font-medium', speedCategory.color)}>
            {speedCategory.level}
          </div>
        </div>

        {/* Solar Wind Parameters */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-500">Density</div>
            <div className="font-semibold">{data.solarWind.currentDensity}</div>
            <div className="text-xs text-gray-400">p/cm³</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Trend</div>
            <div className="flex justify-center mt-1">
              {getTrendIcon(data.solarWind.trend)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Temp</div>
            <div className="font-semibold">{(data.solarWind.currentTemperature / 1000).toFixed(0)}</div>
            <div className="text-xs text-gray-400">×10³ K</div>
          </div>
        </div>

        {/* CME Events */}
        {data.cmeEvents.length > 0 && (
          <Alert className="p-2">
            <Zap className="h-3 w-3" />
            <AlertDescription className="text-xs">
              <div className="font-medium">CME Inbound</div>
              <div>ETA: {formatTimeToArrival(data.cmeEvents[0].earthArrival)}</div>
              <div>Speed: {data.cmeEvents[0].speed} km/s</div>
              <div>Impact: {data.cmeEvents[0].probability}% probability</div>
            </AlertDescription>
          </Alert>
        )}

        {/* Impact Assessment */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Expected Impacts</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Storm Probability</span>
              <div className="flex items-center gap-2">
                <Progress value={data.impacts.magnetosphere.stormProbability} className="w-20 h-2" />
                <span>{data.impacts.magnetosphere.stormProbability}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Magnetosphere</span>
              <span className={cn('font-medium', getCompressionColor(data.impacts.magnetosphere.compression))}>
                {data.impacts.magnetosphere.compression}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Expected Kp</span>
              <span className="font-medium">{data.impacts.magnetosphere.expectedKp}</span>
            </div>
          </div>
        </div>

        {/* Velocity Visualization */}
        {data.visualization.velocityMap.length > 0 && (
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Solar Wind Flow</div>
            {createVelocityVisualization()}
          </div>
        )}

        {/* Coronal Hole Influence */}
        {data.streamStructure.coronalHole.present && (
          <div className="p-2 bg-blue-50 rounded">
            <div className="flex items-center gap-2 text-xs">
              <Target className="w-3 h-3 text-blue-500" />
              <span className="font-medium">Coronal Hole Stream</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Influence: {data.streamStructure.coronalHole.influence}%
              {data.streamStructure.coronalHole.latitude && (
                <span> at {Math.abs(data.streamStructure.coronalHole.latitude)}°
                  {data.streamStructure.coronalHole.latitude > 0 ? 'N' : 'S'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Model Confidence */}
        <div className="flex justify-between text-xs text-gray-500 border-t pt-2">
          <span>Model: WSA-ENLIL</span>
          <span>Confidence: {data.modelPrediction.confidence}</span>
        </div>
      </CardContent>
    </Card>
  )
}