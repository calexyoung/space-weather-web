'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Wind, Thermometer, Zap, Activity } from 'lucide-react'
import { WidgetBase, Sparkline, widgetUtils } from '@/lib/widgets/widget-base'
import { useWidgetData } from '@/lib/widgets/data-fetcher'
import { SolarWindData, WidgetConfig } from '@/lib/widgets/widget-types'

interface SolarWindWidgetProps {
  config: WidgetConfig
  onConfigChange?: (config: Partial<WidgetConfig>) => void
}

export default function SolarWindWidget({ config, onConfigChange }: SolarWindWidgetProps) {
  const { data, isLoading, error, lastUpdated, isOffline, refresh } = useWidgetData<SolarWindData>(
    'solar-wind',
    config.refreshInterval
  )

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Low': return 'bg-blue-100 text-blue-800'
      case 'Normal': return 'bg-green-100 text-green-800'
      case 'Enhanced': return 'bg-yellow-100 text-yellow-800'
      case 'High': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSpeedStatus = (speed: number) => {
    if (speed < 300) return { level: 'Low', color: 'text-blue-600' }
    if (speed < 400) return { level: 'Normal', color: 'text-green-600' }
    if (speed < 500) return { level: 'Enhanced', color: 'text-yellow-600' }
    return { level: 'High', color: 'text-red-600' }
  }

  const getBzStatus = (bz: number) => {
    if (bz > -5) return { level: 'Stable', color: 'text-green-600' }
    if (bz > -10) return { level: 'Moderate', color: 'text-yellow-600' }
    return { level: 'Disturbed', color: 'text-red-600' }
  }

  const getTrendIndicator = () => {
    if (!data) return null
    // Prioritize speed trend as it's most impactful
    return data.trend.speed === 'stable' ? 'stable' : 
           data.trend.speed === 'increasing' ? 'up' : 'down'
  }

  const handleToggleExpanded = () => {
    onConfigChange?.({ expanded: !config.expanded })
  }

  const handleExportData = () => {
    if (!data) return
    
    const exportData = [{
      speed_km_s: data.speed,
      density_p_cm3: data.density,
      temperature_k: data.temperature,
      bt_nt: data.magneticField.bt,
      bz_nt: data.magneticField.bz,
      by_nt: data.magneticField.by,
      bx_nt: data.magneticField.bx,
      pressure_ram_pa: data.pressureRam,
      classification: data.classification,
    }]
    
    widgetUtils.exportToCSV(exportData, 'solar-wind-data')
  }

  const dataState = {
    isLoading,
    hasError: !!error,
    errorMessage: error || undefined,
    lastUpdated,
    isOffline,
  }

  return (
    <WidgetBase
      config={config}
      dataState={dataState}
      onRefresh={refresh}
      onToggleExpanded={handleToggleExpanded}
      onExportData={handleExportData}
      trendIndicator={getTrendIndicator()}
      statusBadge={
        data ? (
          <Badge className={getClassificationColor(data.classification)}>
            {data.classification}
          </Badge>
        ) : null
      }
    >
      {data && (
        <div className="space-y-4">
          {/* Primary Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Wind className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Speed</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(data.speed)}
              </div>
              <p className="text-sm text-gray-600">km/s</p>
              <p className={`text-xs ${getSpeedStatus(data.speed).color}`}>
                {getSpeedStatus(data.speed).level}
              </p>
            </div>
            
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Density</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.density.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600">p/cm³</p>
            </div>
          </div>

          {/* Magnetic Field Summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Magnetic Field</span>
              </div>
              <span className={`text-sm font-medium ${getBzStatus(data.magneticField.bz).color}`}>
                {getBzStatus(data.magneticField.bz).level}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Total (Bt):</span>
                <span className="float-right font-medium">{data.magneticField.bt.toFixed(1)} nT</span>
              </div>
              <div>
                <span className="text-gray-600">Z-comp (Bz):</span>
                <span className={`float-right font-medium ${data.magneticField.bz < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {data.magneticField.bz.toFixed(1)} nT
                </span>
              </div>
            </div>
          </div>

          {/* Expanded view */}
          {config.expanded && (
            <div className="space-y-3 border-t pt-4">
              {/* Temperature and Pressure */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Thermometer className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">Temperature</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {widgetUtils.formatNumber(data.temperature, 0)} K
                  </div>
                </div>
                
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-medium">Ram Pressure</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {data.pressureRam.toFixed(2)} nPa
                  </div>
                </div>
              </div>

              {/* Detailed Magnetic Field */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-3">Magnetic Field Components</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bx (Sun-Earth):</span>
                    <span className="text-sm font-medium">{data.magneticField.bx.toFixed(1)} nT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">By (Dawn-Dusk):</span>
                    <span className="text-sm font-medium">{data.magneticField.by.toFixed(1)} nT</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bz (North-South):</span>
                    <span className={`text-sm font-medium ${data.magneticField.bz < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {data.magneticField.bz.toFixed(1)} nT
                    </span>
                  </div>
                </div>
                
                {data.magneticField.bz < -5 && (
                  <div className="mt-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs text-yellow-800">
                    <strong>Southward Bz:</strong> Enhanced geomagnetic activity possible
                  </div>
                )}
              </div>

              {/* Trend Information */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-medium">Speed</div>
                  <div className={`capitalize ${
                    data.trend.speed === 'increasing' ? 'text-red-600' :
                    data.trend.speed === 'decreasing' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {data.trend.speed}
                  </div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="font-medium">Density</div>
                  <div className={`capitalize ${
                    data.trend.density === 'increasing' ? 'text-orange-600' :
                    data.trend.density === 'decreasing' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {data.trend.density}
                  </div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-medium">Mag Field</div>
                  <div className={`capitalize ${
                    data.trend.magneticField === 'increasing' ? 'text-red-600' :
                    data.trend.magneticField === 'decreasing' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {data.trend.magneticField}
                  </div>
                </div>
              </div>

              {/* Reference Information */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-900 mb-2">Normal Solar Wind Ranges</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                  <div>Speed: 300-800 km/s</div>
                  <div>Density: 1-10 p/cm³</div>
                  <div>Temperature: 10⁴-10⁶ K</div>
                  <div>|Bz| &gt; 5 nT: Geoeffective</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetBase>
  )
}