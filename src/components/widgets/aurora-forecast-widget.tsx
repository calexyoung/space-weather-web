'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Sparkles, MapPin, Clock, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { WidgetBase, Sparkline, widgetUtils } from '@/lib/widgets/widget-base'
import { useWidgetData } from '@/lib/widgets/data-fetcher'
import { AuroraForecast, WidgetConfig } from '@/lib/widgets/widget-types'

interface AuroraForecastWidgetProps {
  config: WidgetConfig
  onConfigChange?: (config: Partial<WidgetConfig>) => void
}

export default function AuroraForecastWidget({ config, onConfigChange }: AuroraForecastWidgetProps) {
  const { data, isLoading, error, lastUpdated, isOffline, refresh } = useWidgetData<AuroraForecast>(
    'aurora-forecast',
    config.refreshInterval
  )

  const getActivityColor = (activity: string) => {
    switch (activity.toLowerCase()) {
      case 'quiet': return 'bg-green-100 text-green-800'
      case 'unsettled': return 'bg-blue-100 text-blue-800'
      case 'minor': return 'bg-yellow-100 text-yellow-800'
      case 'moderate': return 'bg-orange-100 text-orange-800'
      case 'strong':
      case 'severe':
      case 'extreme': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getVisibilityColor = (probability: number) => {
    if (probability >= 70) return 'text-green-600'
    if (probability >= 40) return 'text-yellow-600'
    if (probability >= 10) return 'text-orange-600'
    return 'text-gray-600'
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'text-green-600'
      case 'Medium': return 'text-yellow-600'
      case 'Low': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const handleToggleExpanded = () => {
    onConfigChange?.({ expanded: !config.expanded })
  }

  const handleExportData = () => {
    if (!data) return
    
    const exportData = [
      {
        metric: 'Current Activity',
        value: data.currentActivity,
        northern_visibility: data.visibility.northern.probability,
        southern_visibility: data.visibility.southern.probability,
        confidence: data.confidence,
      },
      ...data.forecast24h.slice(0, 12).map(forecast => ({
        time: format(forecast.time, 'yyyy-MM-dd HH:mm'),
        activity: forecast.activity,
        northern_visibility: forecast.visibility.northern,
        southern_visibility: forecast.visibility.southern,
      }))
    ]
    
    widgetUtils.exportToCSV(exportData, 'aurora-forecast-data')
  }

  const dataState = {
    isLoading,
    hasError: !!error,
    errorMessage: error || undefined,
    lastUpdated: lastUpdated || undefined,
    isOffline,
  }

  const maxVisibility = data ? Math.max(data.visibility.northern.probability, data.visibility.southern.probability) : 0

  return (
    <WidgetBase
      config={config}
      dataState={dataState}
      onRefresh={refresh}
      onToggleExpanded={handleToggleExpanded}
      onExportData={handleExportData}
      statusBadge={
        data ? (
          <Badge className={getActivityColor(data.currentActivity)}>
            {data.currentActivity}
          </Badge>
        ) : null
      }
    >
      {data && (
        <div className="space-y-4">
          {/* Current Activity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Sparkles className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Activity</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.currentActivity}
              </div>
              <p className={`text-sm ${getConfidenceColor(data.confidence)}`}>
                {data.confidence} Confidence
              </p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-1 justify-end mb-1">
                <Eye className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Best Visibility</span>
              </div>
              <div className={`text-2xl font-bold ${getVisibilityColor(maxVisibility)}`}>
                {maxVisibility.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500">
                {data.visibility.northern.probability >= data.visibility.southern.probability ? 'Northern' : 'Southern'}
              </p>
            </div>
          </div>

          {/* Hemisphere Visibility */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-900">Northern</span>
              </div>
              <div className={`text-lg font-bold ${getVisibilityColor(data.visibility.northern.probability)}`}>
                {data.visibility.northern.probability.toFixed(1)}%
              </div>
              <div className="text-xs text-blue-700 mt-1">
                Latitude: {Math.abs(data.visibility.northern.latitudeThreshold).toFixed(1)}°N+
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-red-900">Southern</span>
              </div>
              <div className={`text-lg font-bold ${getVisibilityColor(data.visibility.southern.probability)}`}>
                {data.visibility.southern.probability.toFixed(1)}%
              </div>
              <div className="text-xs text-red-700 mt-1">
                Latitude: {Math.abs(data.visibility.southern.latitudeThreshold).toFixed(1)}°S+
              </div>
            </div>
          </div>

          {/* 24-hour forecast sparkline */}
          {data.forecast24h.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">24-hour Forecast</span>
                <span className="text-xs text-gray-500">Northern visibility %</span>
              </div>
              <Sparkline
                data={data.forecast24h.slice(0, 24).map(f => f.visibility.northern)}
                color="#3b82f6"
                height={50}
                unit="%"
                showLastValue={false}
              />
            </div>
          )}

          {/* Peak Time */}
          {data.peakTime && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Peak Activity Expected</span>
              </div>
              <div className="text-lg font-bold text-purple-900">
                {format(data.peakTime, 'PPp')}
              </div>
            </div>
          )}

          {/* Expanded view */}
          {config.expanded && (
            <div className="space-y-3 border-t pt-4">
              {/* Visible Locations */}
              {(data.visibility.northern.locations.length > 0 || data.visibility.southern.locations.length > 0) && (
                <div className="space-y-3">
                  {data.visibility.northern.locations.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Northern Visibility</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {data.visibility.northern.locations.map((location, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {location}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {data.visibility.southern.locations.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-900">Southern Visibility</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {data.visibility.southern.locations.map((location, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {location}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hourly Forecast */}
              {data.forecast24h.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">12-Hour Forecast</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {data.forecast24h.slice(0, 12).map((forecast, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded-lg text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          {format(forecast.time, 'HH:mm')}
                        </div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {forecast.activity}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className={`font-medium ${getVisibilityColor(forecast.visibility.northern)}`}>
                            N: {forecast.visibility.northern.toFixed(1)}%
                          </div>
                          <div className={`font-medium ${getVisibilityColor(forecast.visibility.southern)}`}>
                            S: {forecast.visibility.southern.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aurora Information */}
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm font-medium text-green-900 mb-2">Aurora Viewing Tips</div>
                <div className="space-y-1 text-xs text-green-800">
                  <div>• Best viewing: 1-3 hours after local midnight</div>
                  <div>• Look north (or south) away from city lights</div>
                  <div>• Activity can change rapidly - check frequently</div>
                  <div>• Green and red are most common colors</div>
                  {maxVisibility > 50 && (
                    <div className="font-medium text-green-900 mt-2">
                      ⭐ Good viewing conditions expected!
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Scale */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900 mb-2">Geomagnetic Activity Scale</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <Badge className={getActivityColor('Quiet')} variant="outline">Quiet</Badge>
                    <span className="ml-1">Kp 0-2</span>
                  </div>
                  <div>
                    <Badge className={getActivityColor('Unsettled')} variant="outline">Unsettled</Badge>
                    <span className="ml-1">Kp 3</span>
                  </div>
                  <div>
                    <Badge className={getActivityColor('Active')} variant="outline">Active</Badge>
                    <span className="ml-1">Kp 4</span>
                  </div>
                  <div>
                    <Badge className={getActivityColor('Minor')} variant="outline">Minor</Badge>
                    <span className="ml-1">Kp 5</span>
                  </div>
                  <div>
                    <Badge className={getActivityColor('Moderate')} variant="outline">Moderate</Badge>
                    <span className="ml-1">Kp 6-7</span>
                  </div>
                  <div>
                    <Badge className={getActivityColor('Strong')} variant="outline">Strong</Badge>
                    <span className="ml-1">Kp 7-8</span>
                  </div>
                  <div>
                    <Badge className={getActivityColor('Severe')} variant="outline">Severe</Badge>
                    <span className="ml-1">Kp 8-9</span>
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