'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Satellite, Circle, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MultiSatelliteData {
  satellites: {
    ace: {
      status: 'online' | 'offline' | 'degraded'
      lastUpdate: Date
      solarWind: {
        speed: number | null
        density: number | null
        temperature: number | null
      }
      magneticField: {
        bt: number | null
        bz: number | null
      }
      particles: {
        protons: number | null
        electrons: number | null
      }
      dataQuality: number
    }
    dscovr: {
      status: 'online' | 'offline' | 'degraded'
      lastUpdate: Date
      solarWind: {
        speed: number | null
        density: number | null
        temperature: number | null
      }
      magneticField: {
        bt: number | null
        bz: number | null
        phi: number | null
      }
      dataQuality: number
    }
    goes: {
      primary: {
        satellite: string
        status: 'online' | 'offline' | 'degraded'
        lastUpdate: Date
        xray: {
          shortWave: number | null
          longWave: number | null
        }
        particles: {
          protons: number | null
          electrons: number | null
        }
        magnetometer: number | null
        dataQuality: number
      }
      secondary: {
        satellite: string
        status: 'online' | 'offline' | 'degraded'
        lastUpdate: Date
        xray: {
          shortWave: number | null
          longWave: number | null
        }
        particles: {
          protons: number | null
          electrons: number | null
        }
        magnetometer: number | null
        dataQuality: number
      }
    }
    stereoA: {
      status: 'online' | 'offline' | 'degraded'
      lastUpdate: Date
      position: {
        angle: number
        distance: number
      }
      solarWind: {
        speed: number | null
        density: number | null
      }
      dataQuality: number
    }
  }
  consensus: {
    solarWindSpeed: {
      average: number
      stdDev: number
      confidence: number
      trend: 'increasing' | 'decreasing' | 'stable'
    }
    particleFlux: {
      protonAverage: number
      electronAverage: number
      risk: 'low' | 'moderate' | 'high' | 'extreme'
    }
    magneticField: {
      bzAverage: number
      stormPotential: number
    }
    overallDataQuality: number
    primarySource: string
  }
}

export default function MultiSatelliteView() {
  const [data, setData] = useState<MultiSatelliteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSatellite, setSelectedSatellite] = useState<string>('consensus')

  useEffect(() => {
    fetchMultiSatelliteData()
    const interval = setInterval(fetchMultiSatelliteData, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const fetchMultiSatelliteData = async () => {
    try {
      const response = await fetch('/api/data/multi-satellite')
      if (!response.ok) throw new Error('Failed to fetch multi-satellite data')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch multi-satellite data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'offline': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Circle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'offline': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'extreme': return 'bg-purple-600 text-white'
      case 'high': return 'bg-red-600 text-white'
      case 'moderate': return 'bg-orange-500 text-white'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const formatValue = (value: number | null, unit: string = '') => {
    if (value === null) return 'N/A'
    if (unit === 'flux' && value < 1e-6) return `${(value * 1e9).toFixed(2)} nW/m²`
    if (unit === 'flux') return `${(value * 1e6).toFixed(2)} µW/m²`
    return `${value.toFixed(1)}${unit}`
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
            <Satellite className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error || 'No data available'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderSatelliteCard = (name: string, satellite: any, hasGOES: boolean = false) => {
    const isSelected = selectedSatellite === name
    
    return (
      <div
        className={cn(
          'p-3 rounded-lg border cursor-pointer transition-all',
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
        )}
        onClick={() => setSelectedSatellite(name)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Satellite className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-sm">{hasGOES ? satellite.satellite : name}</span>
          </div>
          {getStatusIcon(satellite.status)}
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Quality</span>
            <div className="flex items-center gap-2">
              <Progress value={satellite.dataQuality} className="w-16 h-1.5" />
              <span className={cn('font-medium', getStatusColor(satellite.status))}>
                {satellite.dataQuality}%
              </span>
            </div>
          </div>
          
          {satellite.solarWind && (
            <div className="text-xs text-gray-600">
              Speed: {formatValue(satellite.solarWind.speed, ' km/s')}
            </div>
          )}
          
          {satellite.xray && (
            <div className="text-xs text-gray-600">
              X-ray: {formatValue(satellite.xray.longWave, 'flux')}
            </div>
          )}
          
          {satellite.position && (
            <div className="text-xs text-gray-600">
              Position: {satellite.position.angle}° @ {satellite.position.distance} AU
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-blue-500" />
            <span>Multi-Satellite Comparison</span>
          </div>
          <Badge className={cn('text-xs', getRiskColor(data.consensus.particleFlux.risk))}>
            {data.consensus.particleFlux.risk.toUpperCase()} RISK
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Satellite Status Grid */}
        <div className="grid grid-cols-2 gap-2">
          {renderSatelliteCard('ACE', data.satellites.ace)}
          {renderSatelliteCard('DSCOVR', data.satellites.dscovr)}
          {renderSatelliteCard('GOES-P', data.satellites.goes.primary, true)}
          {renderSatelliteCard('STEREO-A', data.satellites.stereoA)}
        </div>

        {/* Consensus View Button */}
        <button
          onClick={() => setSelectedSatellite('consensus')}
          className={cn(
            'w-full p-3 rounded-lg border transition-all',
            selectedSatellite === 'consensus' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:bg-gray-50'
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="font-medium">Consensus View</span>
          </div>
        </button>

        {/* Detailed View */}
        {selectedSatellite === 'consensus' ? (
          <div className="space-y-3">
            {/* Solar Wind Consensus */}
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium mb-2">Solar Wind Consensus</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Average Speed: </span>
                  <span className="font-medium">{data.consensus.solarWindSpeed.average} km/s</span>
                </div>
                <div>
                  <span className="text-gray-500">Std Dev: </span>
                  <span className="font-medium">±{data.consensus.solarWindSpeed.stdDev}</span>
                </div>
                <div>
                  <span className="text-gray-500">Confidence: </span>
                  <span className="font-medium">{data.consensus.solarWindSpeed.confidence}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Trend: </span>
                  <span className="font-medium capitalize">{data.consensus.solarWindSpeed.trend}</span>
                </div>
              </div>
            </div>

            {/* Magnetic Field */}
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium mb-2">Magnetic Field</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Bz Average:</span>
                  <span className={cn(
                    'font-medium',
                    data.consensus.magneticField.bzAverage < -5 ? 'text-red-600' : 'text-green-600'
                  )}>
                    {data.consensus.magneticField.bzAverage} nT
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Storm Potential</span>
                    <span>{data.consensus.magneticField.stormPotential}%</span>
                  </div>
                  <Progress value={data.consensus.magneticField.stormPotential} className="h-2" />
                </div>
              </div>
            </div>

            {/* Particle Flux */}
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium mb-2">Particle Flux</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Protons: </span>
                  <span className="font-medium">{data.consensus.particleFlux.protonAverage.toExponential(2)} pfu</span>
                </div>
                <div>
                  <span className="text-gray-500">Electrons: </span>
                  <span className="font-medium">{data.consensus.particleFlux.electronAverage.toExponential(2)}</span>
                </div>
              </div>
            </div>

            {/* Data Quality */}
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Primary Source:</span>
                <Badge variant="secondary" className="text-xs">
                  {data.consensus.primarySource}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Overall Quality:</span>
                <span className="font-medium">{data.consensus.overallDataQuality}%</span>
              </div>
            </div>
          </div>
        ) : (
          // Individual Satellite Details
          <div className="p-3 bg-gray-50 rounded">
            <div className="text-sm font-medium mb-2 capitalize">{selectedSatellite} Details</div>
            <div className="space-y-2 text-xs">
              {(() => {
                const sat = selectedSatellite === 'ACE' ? data.satellites.ace :
                           selectedSatellite === 'DSCOVR' ? data.satellites.dscovr :
                           selectedSatellite === 'GOES-P' ? data.satellites.goes.primary :
                           selectedSatellite === 'STEREO-A' ? data.satellites.stereoA :
                           null
                
                if (!sat) return null
                
                return (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-500">Status: </span>
                        <span className={cn('font-medium capitalize', getStatusColor(sat.status))}>
                          {sat.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Quality: </span>
                        <span className="font-medium">{sat.dataQuality}%</span>
                      </div>
                    </div>
                    
                    {sat.solarWind && (
                      <div className="border-t pt-2">
                        <div className="font-medium mb-1">Solar Wind</div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <div className="text-gray-500">Speed</div>
                            <div className="font-mono">{formatValue(sat.solarWind.speed, ' km/s')}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Density</div>
                            <div className="font-mono">{formatValue(sat.solarWind.density, ' p/cm³')}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Temp</div>
                            <div className="font-mono">{formatValue(sat.solarWind.temperature, ' K')}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {sat.magneticField && (
                      <div className="border-t pt-2">
                        <div className="font-medium mb-1">Magnetic Field</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-gray-500">Bt</div>
                            <div className="font-mono">{formatValue(sat.magneticField.bt, ' nT')}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Bz</div>
                            <div className="font-mono">{formatValue(sat.magneticField.bz, ' nT')}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-gray-500 pt-1">
                      Last Update: {new Date(sat.lastUpdate).toLocaleTimeString()}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}