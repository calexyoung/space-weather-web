'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Sun, Target, Activity, TrendingUp, RefreshCw, Download, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchRegionData()
    const interval = setInterval(fetchRegionData, 3600000) // Update every hour
    return () => clearInterval(interval)
  }, [])

  const fetchRegionData = async () => {
    setLoading(true)
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

  const handleExport = () => {
    if (!data) return
    
    const exportData = {
      timestamp: new Date().toISOString(),
      activeRegions: data.activeRegions,
      statistics: data.statistics,
      riskAssessment: data.riskAssessment,
      sunspotNumber: data.sunspotNumber
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `solar-regions-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
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
            <Badge className={cn(getThreatColor(data.riskAssessment.overallThreat))}>
              {data.riskAssessment.overallThreat} Threat
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
              onClick={fetchRegionData}
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

        {/* Active Regions List */}
        {data.activeRegions.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Active Regions</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {data.activeRegions.map(region => (
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

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Solar Activity Analysis</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Active regions on the solar surface are areas of intense magnetic activity that can produce solar flares and coronal mass ejections (CMEs).</p>
                <p>Current Solar Status:</p>
                <ul className="ml-4 space-y-1">
                  <li>• Total Active Regions: {data.statistics.totalRegions}</li>
                  <li>• Earth-Facing Regions: {data.statistics.earthFacingRegions}</li>
                  <li>• Complex Magnetic Regions: {data.statistics.complexRegions}</li>
                  <li>• Sunspot Number: {data.sunspotNumber.current}</li>
                  <li>• Monthly Average: {data.sunspotNumber.monthly}</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Magnetic Classification Guide</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Regions are classified by their magnetic complexity:</p>
                <ul className="ml-4 space-y-1">
                  <li>• <span className="font-medium">Alpha (α)</span>: Simple unipolar region</li>
                  <li>• <span className="font-medium">Beta (β)</span>: Bipolar region with clear polarity separation</li>
                  <li>• <span className="font-medium">Gamma (γ)</span>: Complex region with mixed polarities</li>
                  <li>• <span className="font-medium">Beta-Gamma (βγ)</span>: Bipolar with some mixing</li>
                  <li>• <span className="font-medium">Delta (δ)</span>: Opposite polarities within 2° (highest flare potential)</li>
                  <li>• <span className="font-medium">Beta-Gamma-Delta (βγδ)</span>: Most complex and dangerous</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Flare Probability Assessment</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>24-hour flare probabilities based on current active regions:</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>M-class flares (medium):</span>
                    <span className="font-medium">{data.riskAssessment.mClassProbability}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>X-class flares (extreme):</span>
                    <span className="font-medium">{data.riskAssessment.xClassProbability}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proton event probability:</span>
                    <span className="font-medium">{data.riskAssessment.protonEventProbability}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Earth-directed risk:</span>
                    <span className="font-medium">{data.riskAssessment.earthDirectedRisk}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Potential Impacts</h4>
              <div className="text-xs text-gray-600">
                {data.riskAssessment.overallThreat === 'Low' && (
                  <p>Low solar activity. No significant space weather impacts expected.</p>
                )}
                {data.riskAssessment.overallThreat === 'Moderate' && (
                  <div className="space-y-1">
                    <p>Moderate solar activity with potential for:</p>
                    <p>• Minor radio blackouts on sunlit side</p>
                    <p>• Weak degradation of HF radio communication</p>
                    <p>• Minor satellite drag variations</p>
                  </div>
                )}
                {data.riskAssessment.overallThreat === 'Elevated' && (
                  <div className="space-y-1">
                    <p>Elevated solar activity with increased risk of:</p>
                    <p>• R1-R2 radio blackouts possible</p>
                    <p>• HF radio degradation on sunlit side</p>
                    <p>• Increased satellite drag</p>
                    <p>• Minor impacts to GPS accuracy</p>
                  </div>
                )}
                {(data.riskAssessment.overallThreat === 'High' || data.riskAssessment.overallThreat === 'Extreme') && (
                  <div className="space-y-1">
                    <p className="text-red-600 font-medium">High solar activity - significant impacts likely:</p>
                    <p>• R3-R5 radio blackouts expected</p>
                    <p>• Complete HF radio blackout on sunlit side possible</p>
                    <p>• Satellite operations may be affected</p>
                    <p>• GPS navigation degraded or unavailable</p>
                    <p>• Radiation hazard to astronauts</p>
                    <p>• Possible power grid fluctuations</p>
                  </div>
                )}
              </div>
            </div>

            {data.statistics.complexRegions > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">⚠️ Complex Regions Alert</h4>
                <div className="text-xs text-gray-600">
                  <p>There are currently {data.statistics.complexRegions} magnetically complex regions on the Sun.</p>
                  <p>These regions have enhanced potential for significant solar flares and should be monitored closely.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}