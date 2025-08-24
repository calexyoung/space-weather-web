'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plane, Radio, Navigation, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AviationWeatherData {
  radiationLevel: {
    current: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5'
    description: string
    flightRestrictions: string
    dose: number
  }
  hfCommunication: {
    status: 'Normal' | 'Minor' | 'Moderate' | 'Severe' | 'Extreme'
    polarCap: {
      affected: boolean
      severity: number
      recovery: string
    }
    midLatitude: {
      affected: boolean
      severity: number
    }
    frequency: string
  }
  gnssNavigation: {
    status: 'Operational' | 'Degraded' | 'Unreliable'
    accuracy: number
    availability: number
    polarRegions: string
    midLatitudes: string
  }
  flightRoutes: {
    polar: {
      status: 'Open' | 'Caution' | 'Avoid' | 'Closed'
      minAltitude: number
      maxLatitude: number
    }
    highLatitude: {
      status: 'Normal' | 'Monitor' | 'Caution'
      restrictions: string[]
    }
    equatorial: {
      status: 'Normal'
      restrictions: string[]
    }
  }
  recommendations: string[]
  lastUpdate: Date
}

export default function AviationWeather() {
  const [data, setData] = useState<AviationWeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAviationData()
    const interval = setInterval(fetchAviationData, 300000) // Update every 5 minutes
    return () => clearInterval(interval)
  }, [])

  const fetchAviationData = async () => {
    try {
      const response = await fetch('/api/data/aviation-weather')
      if (!response.ok) throw new Error('Failed to fetch aviation weather data')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch aviation weather data')
    } finally {
      setLoading(false)
    }
  }

  const getRadiationColor = (level: string) => {
    switch (level) {
      case 'S5': return 'bg-purple-600 text-white'
      case 'S4': return 'bg-red-600 text-white'
      case 'S3': return 'bg-red-500 text-white'
      case 'S2': return 'bg-orange-500 text-white'
      case 'S1': return 'bg-yellow-500 text-black'
      default: return 'bg-green-500 text-white'
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === 'Normal' || status === 'Operational' || status === 'Open') {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    if (status === 'Caution' || status === 'Monitor' || status === 'Degraded' || status === 'Minor' || status === 'Moderate') {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
    return <XCircle className="w-4 h-4 text-red-500" />
  }

  const getRouteStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'text-green-600'
      case 'Normal': return 'text-green-600'
      case 'Caution': return 'text-yellow-600'
      case 'Monitor': return 'text-yellow-600'
      case 'Avoid': return 'text-orange-600'
      case 'Closed': return 'text-red-600'
      default: return 'text-gray-600'
    }
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
            <Plane className="w-8 h-8 text-red-500 mx-auto mb-2" />
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
            <Plane className="w-5 h-5 text-blue-500" />
            <span>Aviation Weather</span>
          </div>
          <Badge className={cn(getRadiationColor(data.radiationLevel.current))}>
            {data.radiationLevel.current}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Radiation Level */}
        <div className="p-3 bg-gray-50 rounded space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Solar Radiation</span>
            <span className="text-xs text-gray-500">{data.radiationLevel.dose} μSv/hr</span>
          </div>
          <div className="text-xs text-gray-600">{data.radiationLevel.description}</div>
          {data.radiationLevel.current !== 'S0' && (
            <div className="text-xs font-medium text-orange-600">
              {data.radiationLevel.flightRestrictions}
            </div>
          )}
        </div>

        {/* Systems Status */}
        <div className="space-y-2">
          {/* HF Communication */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-gray-500" />
              <span className="text-sm">HF Comm</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(data.hfCommunication.status)}
              <span className="text-xs">{data.hfCommunication.status}</span>
            </div>
          </div>
          
          {/* GNSS Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-gray-500" />
              <span className="text-sm">GNSS Nav</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(data.gnssNavigation.status)}
              <span className="text-xs">{data.gnssNavigation.status}</span>
            </div>
          </div>
          
          {data.gnssNavigation.status !== 'Operational' && (
            <div className="text-xs text-gray-600 pl-6">
              Accuracy: ±{data.gnssNavigation.accuracy}m, Availability: {data.gnssNavigation.availability}%
            </div>
          )}
        </div>

        {/* Flight Routes Status */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Flight Routes</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className={cn('text-xs font-medium', getRouteStatusColor(data.flightRoutes.polar.status))}>
                {data.flightRoutes.polar.status}
              </div>
              <div className="text-xs text-gray-500">Polar</div>
              {data.flightRoutes.polar.status !== 'Open' && (
                <div className="text-xs text-gray-600">
                  ≥FL{Math.floor(data.flightRoutes.polar.minAltitude / 100)}
                </div>
              )}
            </div>
            <div>
              <div className={cn('text-xs font-medium', getRouteStatusColor(data.flightRoutes.highLatitude.status))}>
                {data.flightRoutes.highLatitude.status}
              </div>
              <div className="text-xs text-gray-500">High Lat</div>
            </div>
            <div>
              <div className={cn('text-xs font-medium', getRouteStatusColor(data.flightRoutes.equatorial.status))}>
                {data.flightRoutes.equatorial.status}
              </div>
              <div className="text-xs text-gray-500">Equatorial</div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <Alert className="p-2">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription className="text-xs">
              <div className="font-medium mb-1">Recommendations:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {data.recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Impact Summary */}
        {data.hfCommunication.polarCap.affected && (
          <div className="text-xs text-gray-600 border-t pt-2">
            <div>Polar Cap: Severity {data.hfCommunication.polarCap.severity}/5</div>
            <div>Recovery: {data.hfCommunication.polarCap.recovery}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}