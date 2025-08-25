'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Activity, Shield, AlertTriangle, Zap, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { WidgetBase, widgetUtils } from '@/lib/widgets/widget-base'
import { useWidgetData } from '@/lib/widgets/data-fetcher'
import { ProtonFluxData, WidgetConfig } from '@/lib/widgets/widget-types'
import { cn } from '@/lib/utils'

interface ProtonFluxWidgetProps {
  config: WidgetConfig
  onConfigChange?: (config: Partial<WidgetConfig>) => void
}

export default function ProtonFluxWidget({ config, onConfigChange }: ProtonFluxWidgetProps) {
  const { data, isLoading, error, lastUpdated, isOffline, refresh } = useWidgetData<ProtonFluxData>(
    'proton-flux',
    config.refreshInterval
  )

  const getStormColor = (level: string) => {
    switch (level) {
      case 'S5': return 'bg-purple-600 text-white'
      case 'S4': return 'bg-red-600 text-white'
      case 'S3': return 'bg-orange-600 text-white'
      case 'S2': return 'bg-yellow-600 text-white'
      case 'S1': return 'bg-yellow-500 text-white'
      default: return 'bg-green-600 text-white'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'Extreme':
      case 'Severe':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'Strong':
      case 'Moderate':
        return <Zap className="w-5 h-5 text-orange-500" />
      case 'Minor':
        return <Activity className="w-5 h-5 text-yellow-500" />
      default:
        return <Shield className="w-5 h-5 text-green-500" />
    }
  }

  const formatFlux = (flux: number) => {
    if (flux >= 1000) return `${(flux / 1000).toFixed(1)}k`
    if (flux >= 100) return Math.round(flux).toString()
    if (flux >= 10) return flux.toFixed(1)
    if (flux >= 1) return flux.toFixed(2)
    return flux.toExponential(1)
  }

  const getTrendIndicator = () => {
    if (!data) return null
    if (data.trend === 'increasing') return 'up'
    if (data.trend === 'decreasing') return 'down'
    return 'stable'
  }

  const handleToggleExpanded = () => {
    onConfigChange?.({ expanded: !config.expanded })
  }

  const handleExportData = () => {
    if (!data) return
    
    const exportData = [
      { metric: 'Storm Level', value: data.stormLevel, description: data.stormThreshold.description },
      { metric: 'Flux >10 MeV', value: `${formatFlux(data.current.flux10)} pfu`, trend: data.trend },
      { metric: 'Flux >50 MeV', value: `${formatFlux(data.current.flux50)} pfu` },
      { metric: 'Flux >100 MeV', value: `${formatFlux(data.current.flux100)} pfu` },
      { metric: 'Flux >500 MeV', value: `${formatFlux(data.current.flux500)} pfu` },
      { metric: 'Risk Level', value: data.riskLevel },
      { metric: '24h Probability', value: `${data.forecast.probability24h}%`, expected: data.forecast.expectedLevel || 'N/A' },
      ...data.recentEvents.map((event, i) => ({
        metric: `Event ${i + 1}`,
        time: format(event.time, 'yyyy-MM-dd HH:mm'),
        peakFlux: `${formatFlux(event.peakFlux)} pfu`,
        stormLevel: event.stormLevel,
      }))
    ]
    
    widgetUtils.exportToCSV(exportData, 'proton-flux-data')
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
          <Badge className={cn("text-sm", getStormColor(data.stormLevel))}>
            {data.stormLevel === 'None' ? 'No Storm' : data.stormLevel}
          </Badge>
        ) : null
      }
      actions={data && getRiskIcon(data.riskLevel)}
    >
      {data && (
        <div className="space-y-4">
          {/* Current Flux Values */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  &gt;10 MeV
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold">
                    {formatFlux(data.current.flux10)}
                  </span>
                  <span className="text-xs text-gray-500">pfu</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  &gt;50 MeV
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-lg font-semibold">
                    {formatFlux(data.current.flux50)}
                  </span>
                  <span className="text-xs text-gray-500">pfu</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  &gt;100 MeV
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-lg font-semibold">
                    {formatFlux(data.current.flux100)}
                  </span>
                  <span className="text-xs text-gray-500">pfu</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  &gt;500 MeV
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-lg font-semibold">
                    {formatFlux(data.current.flux500)}
                  </span>
                  <span className="text-xs text-gray-500">pfu</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Solar Flares (24h) - Always visible */}
          {data.recentFlares && data.recentFlares.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Solar Flares (24h)
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.recentFlares.slice(0, 10).map((flare, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] px-1 py-0",
                          flare.flareClass.startsWith('X') ? 'border-red-500 text-red-600' :
                          flare.flareClass.startsWith('M') ? 'border-orange-500 text-orange-600' :
                          flare.flareClass.startsWith('C') ? 'border-yellow-500 text-yellow-600' :
                          'border-gray-400 text-gray-600'
                        )}
                      >
                        {flare.flareClass}
                      </Badge>
                      <span className="text-gray-600 dark:text-gray-400">
                        {format(new Date(flare.peakTime), 'HH:mm')}
                      </span>
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-[10px]">
                      {flare.activeRegion ? (
                        <span>AR{flare.activeRegion}</span>
                      ) : flare.location ? (
                        <span>{flare.location}</span>
                      ) : (
                        <span>Unknown</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expanded view with additional details */}
          {config.expanded && (
            <div className="space-y-4 border-t pt-4">
              {/* S-Scale Reference */}
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div className="font-medium mb-1">S-Scale Reference</div>
                <div className="grid grid-cols-5 gap-1 text-center">
                  <div className={cn("rounded px-1 py-0.5", 
                    data.stormLevel === 'S1' ? 'ring-2 ring-yellow-500' : '',
                    'bg-yellow-100 dark:bg-yellow-900/30')}>
                    <div className="font-medium">S1</div>
                    <div className="text-[10px]">≥10</div>
                  </div>
                  <div className={cn("rounded px-1 py-0.5",
                    data.stormLevel === 'S2' ? 'ring-2 ring-yellow-600' : '',
                    'bg-yellow-200 dark:bg-yellow-800/30')}>
                    <div className="font-medium">S2</div>
                    <div className="text-[10px]">≥100</div>
                  </div>
                  <div className={cn("rounded px-1 py-0.5",
                    data.stormLevel === 'S3' ? 'ring-2 ring-orange-600' : '',
                    'bg-orange-200 dark:bg-orange-800/30')}>
                    <div className="font-medium">S3</div>
                    <div className="text-[10px]">≥1k</div>
                  </div>
                  <div className={cn("rounded px-1 py-0.5",
                    data.stormLevel === 'S4' ? 'ring-2 ring-red-600' : '',
                    'bg-red-200 dark:bg-red-800/30')}>
                    <div className="font-medium">S4</div>
                    <div className="text-[10px]">≥10k</div>
                  </div>
                  <div className={cn("rounded px-1 py-0.5",
                    data.stormLevel === 'S5' ? 'ring-2 ring-purple-600' : '',
                    'bg-purple-200 dark:bg-purple-800/30')}>
                    <div className="font-medium">S5</div>
                    <div className="text-[10px]">≥100k</div>
                  </div>
                </div>
                <div className="text-[10px] text-center mt-1">pfu (&gt;10 MeV)</div>
              </div>

              {/* Storm Threshold Info */}
              {data.stormLevel !== 'None' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 space-y-2">
                  <div className="font-medium text-sm">{data.stormThreshold.level}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {data.stormThreshold.description}
                  </div>
                  <div className="space-y-1">
                    {data.stormThreshold.effects.map((effect, i) => (
                      <div key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start">
                        <span className="mr-1">•</span>
                        <span>{effect}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forecast */}
              {data.forecast.probability24h > 30 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">24-hour Forecast</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Storm Probability</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{data.forecast.probability24h}%</span>
                      {data.forecast.expectedLevel && (
                        <Badge variant="outline" className="text-xs">
                          {data.forecast.expectedLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Events */}
              {data.recentEvents.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recent Solar Particle Events
                  </div>
                  <div className="space-y-2">
                    {data.recentEvents.map((event, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            {format(new Date(event.time), 'MMM dd, HH:mm')}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{formatFlux(event.peakFlux)} pfu</span>
                            <Badge variant="outline" className="text-xs">
                              {event.stormLevel}
                            </Badge>
                          </div>
                        </div>
                        {event.duration && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Duration: {event.duration} hours
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </WidgetBase>
  )
}