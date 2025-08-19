'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Activity, Clock, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { WidgetBase, Sparkline, widgetUtils } from '@/lib/widgets/widget-base'
import { useWidgetData } from '@/lib/widgets/data-fetcher'
import { KpIndexData, WidgetConfig } from '@/lib/widgets/widget-types'

interface KpIndexWidgetProps {
  config: WidgetConfig
  onConfigChange?: (config: Partial<WidgetConfig>) => void
}

export default function KpIndexWidget({ config, onConfigChange }: KpIndexWidgetProps) {
  const { data, isLoading, error, lastUpdated, isOffline, refresh } = useWidgetData<KpIndexData>(
    'kp-index',
    config.refreshInterval
  )

  const getKpLevelColor = (kp: number) => {
    if (kp <= 2) return 'bg-green-100 text-green-800'
    if (kp <= 3) return 'bg-yellow-100 text-yellow-800'
    if (kp <= 4) return 'bg-orange-100 text-orange-800'
    if (kp <= 6) return 'bg-red-100 text-red-800'
    return 'bg-purple-100 text-purple-800'
  }

  const getKpLevelName = (kp: number) => {
    if (kp <= 2) return 'Quiet'
    if (kp <= 3) return 'Unsettled'
    if (kp <= 4) return 'Minor Storm'
    if (kp <= 6) return 'Moderate Storm'
    if (kp <= 8) return 'Strong Storm'
    return 'Extreme Storm'
  }

  const getTrendIndicator = () => {
    if (!data) return null
    if (data.trend === 'increasing') return 'up'
    if (data.trend === 'decreasing') return 'down'
    return data.trend // 'stable' maps to 'stable'
  }

  const handleToggleExpanded = () => {
    onConfigChange?.({ expanded: !config.expanded })
  }

  const handleExportData = () => {
    if (!data) return
    
    const exportData = [
      { metric: 'Current Kp', value: data.current.toFixed(1), level: data.currentLevel },
      ...data.forecast3h.map((forecast, index) => ({
        metric: `Forecast +${(index + 1) * 3}h`,
        time: format(forecast.time, 'HH:mm'),
        kp: forecast.kp.toFixed(1),
        level: forecast.level,
      }))
    ]
    
    widgetUtils.exportToCSV(exportData, 'kp-index-data')
  }

  const dataState = {
    isLoading,
    hasError: !!error,
    errorMessage: error || undefined,
    lastUpdated: lastUpdated || undefined,
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
          <Badge className={getKpLevelColor(data.current)}>
            Kp {data.current.toFixed(1)}
          </Badge>
        ) : null
      }
    >
      {data && (
        <div className="space-y-4">
          {/* Current Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {data.current.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600">{data.currentLevel}</p>
              {data.estimated_speed && (
                <p className="text-xs text-gray-500 mt-1">
                  Est. SW Speed: {data.estimated_speed} km/s
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-end">
              <div className="text-right">
                <div className="flex items-center space-x-1 justify-end mb-1">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Geomagnetic Activity</span>
                </div>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getKpLevelColor(data.current)}`}>
                  {getKpLevelName(data.current)}
                </div>
              </div>
            </div>
          </div>

          {/* Sparkline of forecast trend */}
          {data.forecast3h.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">24-hour Trend</span>
                <span className="text-xs text-gray-500">Next 8 periods (3h each)</span>
              </div>
              <Sparkline
                data={[data.current, ...data.forecast3h.map(f => f.kp)]}
                color={data.current > 4 ? '#ef4444' : '#3b82f6'}
                height={50}
                unit=""
                showLastValue={false}
              />
            </div>
          )}

          {/* Expanded view */}
          {config.expanded && data.forecast3h.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">3-hour Forecasts</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {data.forecast3h.slice(0, 8).map((forecast, index) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-50 rounded-lg text-center"
                  >
                    <div className="text-xs text-gray-600 mb-1">
                      {format(forecast.time, 'HH:mm')}
                    </div>
                    <div className="font-semibold text-gray-900">
                      {forecast.kp.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getKpLevelName(forecast.kp)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Storm threshold indicators */}
              <div className="bg-blue-50 rounded-lg p-3 mt-4">
                <div className="text-sm font-medium text-blue-900 mb-2">Geomagnetic Storm Levels</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>G1 Minor:</span>
                      <span className="font-mono">Kp 5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>G2 Moderate:</span>
                      <span className="font-mono">Kp 6</span>
                    </div>
                    <div className="flex justify-between">
                      <span>G3 Strong:</span>
                      <span className="font-mono">Kp 7</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>G4 Severe:</span>
                      <span className="font-mono">Kp 8</span>
                    </div>
                    <div className="flex justify-between">
                      <span>G5 Extreme:</span>
                      <span className="font-mono">Kp 9</span>
                    </div>
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