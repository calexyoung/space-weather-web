'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Satellite, Shield, AlertTriangle, Zap, Radio, Navigation } from 'lucide-react'
import { WidgetBase, Sparkline, widgetUtils } from '@/lib/widgets/widget-base'
import { useWidgetData } from '@/lib/widgets/data-fetcher'
import { SatelliteEnvironment, WidgetConfig } from '@/lib/widgets/widget-types'

interface SatelliteEnvironmentWidgetProps {
  config: WidgetConfig
  onConfigChange?: (config: Partial<WidgetConfig>) => void
}

export default function SatelliteEnvironmentWidget({ config, onConfigChange }: SatelliteEnvironmentWidgetProps) {
  const { data, isLoading, error, lastUpdated, isOffline, refresh } = useWidgetData<SatelliteEnvironment>(
    'satellite-environment',
    config.refreshInterval
  )

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'None':
      case 'Minimal': return 'bg-green-100 text-green-800'
      case 'Minor':
      case 'Low': return 'bg-blue-100 text-blue-800'
      case 'Moderate': return 'bg-yellow-100 text-yellow-800'
      case 'Strong':
      case 'High': return 'bg-orange-100 text-orange-800'
      case 'Severe':
      case 'Critical':
      case 'Extreme': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Low': return <Shield className="w-4 h-4 text-green-500" />
      case 'Moderate': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'High': return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'Critical': return <Zap className="w-4 h-4 text-red-500" />
      default: return <Shield className="w-4 h-4 text-gray-500" />
    }
  }

  const getHazardIcon = (type: string) => {
    switch (type) {
      case 'Surface_Charging': return <Zap className="w-4 h-4" />
      case 'Deep_Dielectric_Charging': return <Zap className="w-4 h-4" />
      case 'Single_Event_Upset': return <AlertTriangle className="w-4 h-4" />
      case 'Atmospheric_Drag': return <Satellite className="w-4 h-4" />
      case 'Navigation_Error': return <Navigation className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getOverallRiskIndicator = () => {
    if (!data) return null
    switch (data.overallRisk) {
      case 'Minimal':
      case 'Low': return 'stable'
      case 'Moderate': return 'stable'
      case 'High': return 'up'
      case 'Critical': return 'up'
      default: return null
    }
  }

  const handleToggleExpanded = () => {
    onConfigChange?.({ expanded: !config.expanded })
  }

  const handleExportData = () => {
    if (!data) return
    
    const exportData = [
      {
        metric: 'Overall Risk',
        level: data.overallRisk,
      },
      {
        metric: 'Geomagnetic Risk',
        level: data.riskLevels.geomagnetic,
      },
      {
        metric: 'Radiation Risk',
        level: data.riskLevels.radiation,
      },
      {
        metric: 'Radio Risk',
        level: data.riskLevels.radio,
      },
      {
        metric: 'Electron Flux',
        value: data.particleFlux.electrons,
        unit: 'particles/cm²/s',
      },
      {
        metric: 'Proton Flux',
        value: data.particleFlux.protons,
        unit: 'particles/cm²/s',
      },
      {
        metric: 'Atmospheric Density',
        value: data.atmosphericDrag.density,
        unit: 'kg/m³',
      },
      ...data.hazards.map(hazard => ({
        hazard_type: hazard.type.replace('_', ' '),
        severity: hazard.severity,
        duration: hazard.duration,
        description: hazard.description,
      }))
    ]
    
    widgetUtils.exportToCSV(exportData, 'satellite-environment-data')
  }

  const dataState = {
    isLoading,
    hasError: !!error,
    errorMessage: error || undefined,
    lastUpdated: lastUpdated || undefined,
    isOffline,
  }

  // Calculate highest risk level for display
  const getHighestRiskLevel = () => {
    if (!data) return 'None'
    const levels = [data.riskLevels.geomagnetic, data.riskLevels.radiation, data.riskLevels.radio]
    const priority = ['Extreme', 'Severe', 'Strong', 'Moderate', 'Minor', 'None']
    return priority.find(level => levels.includes(level as any)) || 'None'
  }

  return (
    <WidgetBase
      config={config}
      dataState={dataState}
      onRefresh={refresh}
      onToggleExpanded={handleToggleExpanded}
      onExportData={handleExportData}
      trendIndicator={getOverallRiskIndicator()}
      statusBadge={
        data ? (
          <Badge className={getRiskLevelColor(data.overallRisk)}>
            {data.overallRisk} Risk
          </Badge>
        ) : null
      }
    >
      {data && (
        <div className="space-y-4">
          {/* Overall Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Satellite className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Overall Risk</span>
              </div>
              <div className={`text-2xl font-bold ${
                data.overallRisk === 'Critical' ? 'text-red-600' :
                data.overallRisk === 'High' ? 'text-orange-600' :
                data.overallRisk === 'Moderate' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {data.overallRisk}
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-1 justify-end mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">Active Hazards</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.hazards.filter(h => h.severity !== 'Low').length}
              </div>
              <p className="text-xs text-gray-500">
                of {data.hazards.length} total
              </p>
            </div>
          </div>

          {/* Risk Categories */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center mb-1">
                <Zap className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-xs font-medium text-red-900 mb-1">Geomagnetic</div>
              <Badge className={getRiskLevelColor(data.riskLevels.geomagnetic)} variant="outline">
                {data.riskLevels.geomagnetic}
              </Badge>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center mb-1">
                <Shield className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xs font-medium text-blue-900 mb-1">Radiation</div>
              <Badge className={getRiskLevelColor(data.riskLevels.radiation)} variant="outline">
                {data.riskLevels.radiation}
              </Badge>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center mb-1">
                <Radio className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-xs font-medium text-purple-900 mb-1">Radio</div>
              <Badge className={getRiskLevelColor(data.riskLevels.radio)} variant="outline">
                {data.riskLevels.radio}
              </Badge>
            </div>
          </div>

          {/* Active Hazards Preview */}
          {data.hazards.filter(h => h.severity !== 'Low').length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Active Hazards</span>
              <div className="space-y-1">
                {data.hazards
                  .filter(h => h.severity !== 'Low')
                  .slice(0, config.expanded ? 5 : 2)
                  .map((hazard, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center space-x-2">
                      {getSeverityIcon(hazard.severity)}
                      <span className="text-gray-900">
                        {hazard.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getRiskLevelColor(hazard.severity)} variant="outline">
                        {hazard.severity}
                      </Badge>
                      <span className="text-xs text-gray-500">{hazard.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expanded view */}
          {config.expanded && (
            <div className="space-y-3 border-t pt-4">
              {/* Particle Flux Data */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-3">Particle Environment</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">Electrons</div>
                    <div className="font-medium text-gray-900">
                      {widgetUtils.formatNumber(data.particleFlux.electrons)} p/cm²/s
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Protons</div>
                    <div className="font-medium text-gray-900">
                      {widgetUtils.formatNumber(data.particleFlux.protons)} p/cm²/s
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Neutrons</div>
                    <div className="font-medium text-gray-900">
                      {widgetUtils.formatNumber(data.particleFlux.neutrons)} p/cm²/s
                    </div>
                  </div>
                </div>
              </div>

              {/* Atmospheric Drag */}
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Atmospheric Environment</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-blue-700">Density</div>
                    <div className="font-medium text-blue-900">
                      {data.atmosphericDrag.density.toExponential(2)} kg/m³
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-700">Scale Height</div>
                    <div className="font-medium text-blue-900">
                      {Math.round(data.atmosphericDrag.scale_height)} km
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-700">Temperature</div>
                    <div className="font-medium text-blue-900">
                      {Math.round(data.atmosphericDrag.temperature)} K
                    </div>
                  </div>
                </div>
              </div>

              {/* All Hazards */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">All Identified Hazards</h4>
                <div className="space-y-2">
                  {data.hazards.map((hazard, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getHazardIcon(hazard.type)}
                          <span className="font-medium text-gray-900">
                            {hazard.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getRiskLevelColor(hazard.severity)}>
                            {hazard.severity}
                          </Badge>
                          <span className="text-xs text-gray-500">{hazard.duration}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{hazard.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Scale Reference */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900 mb-2">Risk Level Scale</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <Badge className={getRiskLevelColor('Minimal')} variant="outline">Minimal</Badge>
                    <span>Normal operations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRiskLevelColor('Low')} variant="outline">Low</Badge>
                    <span>Minor precautions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRiskLevelColor('Moderate')} variant="outline">Moderate</Badge>
                    <span>Increased monitoring</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRiskLevelColor('High')} variant="outline">High</Badge>
                    <span>Protective actions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRiskLevelColor('Critical')} variant="outline">Critical</Badge>
                    <span>Emergency protocols</span>
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