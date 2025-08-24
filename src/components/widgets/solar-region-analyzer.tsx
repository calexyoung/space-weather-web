'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, AlertTriangle, Sun, Target, Activity, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SolarRegionData {
  activeRegions: Array<{
    number: number
    location: string
    latitude: number
    longitude: number
    area: number
    spotClass: string
    magneticClass: string
    numSunspots: number
    flareActivity: {
      last24h: {
        c: number
        m: number
        x: number
      }
      potential: string
    }
    history: string
    threat: string
    isEarthFacing?: boolean
  }>
  statistics: {
    totalRegions: number
    totalSunspots: number
    earthFacingRegions: number
    activeRegions: number
    complexRegions: number
    newRegions: number
  }
  riskAssessment: {
    overallThreat: 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Extreme'
    mClassProbability: number
    xClassProbability: number
    protonEventProbability: number
    earthDirectedRisk: number
  }
  sunspotNumber: {
    current: number
    monthly: number
    smoothed: number
  }
}

export default function SolarRegionAnalyzer() {
  const [data, setData] = useState<SolarRegionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null)

  useEffect(() => {
    fetchRegionData()
    const interval = setInterval(fetchRegionData, 3600000) // Update every hour
    return () => clearInterval(interval)
  }, [])

  const fetchRegionData = async () => {
    try {
      const response = await fetch('/api/data/solar-regions')
      if (!response.ok) throw new Error('Failed to fetch solar region data')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch solar region data')
    } finally {
      setLoading(false)
    }
  }

  const getThreatColor = (threat: string) => {
    switch (threat) {
      case 'Extreme': return 'bg-purple-600 text-white'
      case 'High': return 'bg-red-600 text-white'
      case 'Elevated': return 'bg-orange-500 text-white'
      case 'Moderate': return 'bg-yellow-500 text-black'
      case 'Low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getRegionThreatColor = (threat: string) => {
    switch (threat) {
      case 'High': return 'text-red-600'
      case 'Moderate': return 'text-orange-500'
      case 'Low': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const getMagneticClassBadgeColor = (magClass: string) => {
    if (magClass.includes('Delta')) return 'bg-red-600 text-white'
    if (magClass.includes('Gamma')) return 'bg-orange-500 text-white'
    if (magClass.includes('Beta')) return 'bg-yellow-500 text-black'
    return 'bg-gray-400 text-white'
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

  const selectedRegionData = selectedRegion 
    ? data.activeRegions.find(r => r.number === selectedRegion)
    : null

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-yellow-500" />
            <span>Solar Regions</span>
          </div>
          <Badge className={cn(getThreatColor(data.riskAssessment.overallThreat))}>
            {data.riskAssessment.overallThreat} Threat
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold">{data.statistics.totalRegions}</div>
            <div className="text-xs text-gray-500">Regions</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{data.sunspotNumber.current}</div>
            <div className="text-xs text-gray-500">Sunspot #</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-500">
              {data.statistics.complexRegions}
            </div>
            <div className="text-xs text-gray-500">Complex</div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Flare Probability (24h)</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs w-12">M-class</span>
              <Progress value={data.riskAssessment.mClassProbability} className="flex-1 h-2" />
              <span className="text-xs w-10 text-right">{data.riskAssessment.mClassProbability}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs w-12">X-class</span>
              <Progress value={data.riskAssessment.xClassProbability} className="flex-1 h-2" />
              <span className="text-xs w-10 text-right">{data.riskAssessment.xClassProbability}%</span>
            </div>
          </div>
        </div>

        {/* Earth-Directed Risk */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Earth-Directed Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={data.riskAssessment.earthDirectedRisk} className="w-20 h-2" />
            <span className="text-sm font-medium">{data.riskAssessment.earthDirectedRisk}%</span>
          </div>
        </div>

        {/* Active Regions List */}
        {data.activeRegions.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Active Regions</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {data.activeRegions.slice(0, 5).map(region => (
                <div
                  key={region.number}
                  className={cn(
                    'flex items-center justify-between p-1 rounded cursor-pointer hover:bg-gray-50',
                    selectedRegion === region.number && 'bg-blue-50'
                  )}
                  onClick={() => setSelectedRegion(region.number)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">AR{region.number}</span>
                    {region.isEarthFacing && (
                      <Target className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={cn('text-xs', getMagneticClassBadgeColor(region.magneticClass))}>
                      {region.magneticClass}
                    </Badge>
                    <span className={cn('text-xs', getRegionThreatColor(region.threat))}>
                      {region.threat}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Region Details */}
        {selectedRegionData && (
          <div className="p-2 bg-blue-50 rounded space-y-1">
            <div className="text-sm font-medium">AR{selectedRegionData.number} Details</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Location: {selectedRegionData.location}</div>
              <div>Area: {selectedRegionData.area} μh</div>
              <div>Spots: {selectedRegionData.numSunspots}</div>
              <div>Class: {selectedRegionData.spotClass}</div>
            </div>
            {(selectedRegionData.flareActivity.last24h.c > 0 || 
              selectedRegionData.flareActivity.last24h.m > 0 || 
              selectedRegionData.flareActivity.last24h.x > 0) && (
              <div className="text-xs">
                24h Flares: 
                {selectedRegionData.flareActivity.last24h.c > 0 && ` C:${selectedRegionData.flareActivity.last24h.c}`}
                {selectedRegionData.flareActivity.last24h.m > 0 && ` M:${selectedRegionData.flareActivity.last24h.m}`}
                {selectedRegionData.flareActivity.last24h.x > 0 && ` X:${selectedRegionData.flareActivity.last24h.x}`}
              </div>
            )}
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>{data.statistics.activeRegions} active</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{data.statistics.newRegions} new</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}