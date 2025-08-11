'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Zap, Sun, Clock, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { WidgetBase, Sparkline, widgetUtils } from '@/lib/widgets/widget-base'
import { useWidgetData } from '@/lib/widgets/data-fetcher'
import { XrayFluxData, WidgetConfig } from '@/lib/widgets/widget-types'

interface XrayFluxWidgetProps {
  config: WidgetConfig
  onConfigChange?: (config: Partial<WidgetConfig>) => void
}

export default function XrayFluxWidget({ config, onConfigChange }: XrayFluxWidgetProps) {
  const { data, isLoading, error, lastUpdated, isOffline, refresh } = useWidgetData<XrayFluxData>(
    'xray-flux',
    config.refreshInterval
  )

  const getFlareClassColor = (flareClass: string) => {
    switch (flareClass) {
      case 'A': return 'bg-gray-100 text-gray-800'
      case 'B': return 'bg-blue-100 text-blue-800'
      case 'C': return 'bg-green-100 text-green-800'
      case 'M': return 'bg-yellow-100 text-yellow-800'
      case 'X': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'Minimal': return 'text-green-600'
      case 'Minor': return 'text-blue-600'
      case 'Moderate': return 'text-yellow-600'
      case 'Strong': return 'text-orange-600'
      case 'Severe': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getFlareIntensity = (flareClass: string, magnitude: number) => {
    const classMultipliers = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }
    return (classMultipliers[flareClass as keyof typeof classMultipliers] || 1e-9) * magnitude
  }

  const getTrendIndicator = () => {
    if (!data) return null
    return data.trend
  }

  const handleToggleExpanded = () => {
    onConfigChange?.({ expanded: !config.expanded })
  }

  const handleExportData = () => {
    if (!data) return
    
    const exportData = [
      {
        metric: 'Short Wave',
        flux: data.shortWave.current,
        class: data.shortWave.flareClass,
        magnitude: data.shortWave.magnitude,
        level: data.shortWave.level,
      },
      {
        metric: 'Long Wave',
        flux: data.longWave.current,
        class: data.longWave.flareClass,
        magnitude: data.longWave.magnitude,
        level: data.longWave.level,
      },
      ...data.recentFlares.map(flare => ({
        metric: 'Recent Flare',
        time: format(flare.time, 'yyyy-MM-dd HH:mm'),
        peak: flare.peak,
        duration: flare.duration || 'N/A',
        location: flare.location || 'N/A',
      }))
    ]
    
    widgetUtils.exportToCSV(exportData, 'xray-flux-data')
  }

  const dataState = {
    isLoading,
    hasError: !!error,
    errorMessage: error || undefined,
    lastUpdated,
    isOffline,
  }

  // Determine primary flux level (use highest of short/long wave)
  const primaryFlux = data ? (
    getFlareIntensity(data.shortWave.flareClass, data.shortWave.magnitude) >
    getFlareIntensity(data.longWave.flareClass, data.longWave.magnitude)
    ? data.shortWave : data.longWave
  ) : null

  return (
    <WidgetBase
      config={config}
      dataState={dataState}
      onRefresh={refresh}
      onToggleExpanded={handleToggleExpanded}
      onExportData={handleExportData}
      trendIndicator={getTrendIndicator()}
      statusBadge={
        primaryFlux ? (
          <Badge className={getFlareClassColor(primaryFlux.flareClass)}>
            {primaryFlux.level}
          </Badge>
        ) : null
      }
    >
      {data && primaryFlux && (
        <div className="space-y-4">
          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">X-ray Flux</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {primaryFlux.level}
              </div>
              <p className="text-sm text-gray-600">
                {primaryFlux.current.toExponential(1)} W/m²
              </p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-1 justify-end mb-1">
                <Sun className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">Risk Level</span>
              </div>
              <div className={`text-lg font-semibold ${getRiskLevelColor(data.riskLevel)}`}>
                {data.riskLevel}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Background: {data.background}
              </p>
            </div>
          </div>

          {/* Both wavelengths comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-600 font-medium mb-1">Short Wave (0.1-0.8 nm)</div>
              <div className="text-sm font-bold text-gray-900">{data.shortWave.level}</div>
              <div className="text-xs text-gray-600">{data.shortWave.current.toExponential(1)}</div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs text-red-600 font-medium mb-1">Long Wave (0.1-0.8 nm)</div>
              <div className="text-sm font-bold text-gray-900">{data.longWave.level}</div>
              <div className="text-xs text-gray-600">{data.longWave.current.toExponential(1)}</div>
            </div>
          </div>

          {/* Recent Flares */}
          {data.recentFlares.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">Recent Activity</span>
                </div>
                <span className="text-xs text-gray-500">Last 24 hours</span>
              </div>
              
              <div className="space-y-1">
                {data.recentFlares.slice(0, config.expanded ? 10 : 3).map((flare, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center space-x-2">
                      <Badge className={getFlareClassColor(flare.peak.charAt(0))} variant="outline">
                        {flare.peak}
                      </Badge>
                      {flare.location && (
                        <span className="text-xs text-gray-600">{flare.location}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(flare.time, 'HH:mm')}
                      {flare.duration && ` (${flare.duration}m)`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expanded view */}
          {config.expanded && (
            <div className="space-y-3 border-t pt-4">
              {/* Flare Classification Scale */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-3">X-ray Flux Classification</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className={getFlareClassColor('A')} variant="outline">A</Badge>
                      <span>&lt; 10⁻⁷ W/m²</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={getFlareClassColor('B')} variant="outline">B</Badge>
                      <span>10⁻⁷ - 10⁻⁶ W/m²</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={getFlareClassColor('C')} variant="outline">C</Badge>
                      <span>10⁻⁶ - 10⁻⁵ W/m²</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className={getFlareClassColor('M')} variant="outline">M</Badge>
                      <span>10⁻⁵ - 10⁻⁴ W/m²</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className={getFlareClassColor('X')} variant="outline">X</Badge>
                      <span>&gt; 10⁻⁴ W/m²</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact Information */}
              {(primaryFlux.flareClass === 'M' || primaryFlux.flareClass === 'X') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Potential Impacts</span>
                  </div>
                  <div className="text-sm text-yellow-800 space-y-1">
                    {primaryFlux.flareClass === 'M' && (
                      <>
                        <div>• Brief radio blackouts on sunlit side of Earth</div>
                        <div>• Minor radiation storm risk</div>
                        <div>• Possible navigation degradation</div>
                      </>
                    )}
                    {primaryFlux.flareClass === 'X' && (
                      <>
                        <div>• Wide-area radio blackouts on sunlit side</div>
                        <div>• Radiation storm likely</div>
                        <div>• Satellite operations may be affected</div>
                        <div>• Navigation systems may experience degradation</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Short Wave Details</h5>
                  <div className="space-y-1 text-xs text-blue-800">
                    <div>Flux: {data.shortWave.current.toExponential(3)} W/m²</div>
                    <div>Class: {data.shortWave.flareClass}{data.shortWave.magnitude.toFixed(1)}</div>
                    <div>Wavelength: 0.05-0.4 nm</div>
                    <div>Source: GOES-16 XRS</div>
                  </div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-red-900 mb-2">Long Wave Details</h5>
                  <div className="space-y-1 text-xs text-red-800">
                    <div>Flux: {data.longWave.current.toExponential(3)} W/m²</div>
                    <div>Class: {data.longWave.flareClass}{data.longWave.magnitude.toFixed(1)}</div>
                    <div>Wavelength: 0.1-0.8 nm</div>
                    <div>Source: GOES-16 XRS</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetBase>
  )
}