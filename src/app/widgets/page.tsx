'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Eye, EyeOff, GripVertical } from 'lucide-react'
import DstIndexMonitor from '@/components/widgets/dst-index-monitor'
import F107FluxTracker from '@/components/widgets/f107-flux-tracker'
import SolarRegionAnalyzer from '@/components/widgets/solar-region-analyzer'
import AviationWeather from '@/components/widgets/aviation-weather'
import EnlilModel from '@/components/widgets/enlil-model'
import SolarCycleDashboard from '@/components/widgets/solar-cycle-dashboard'
import MultiSatelliteView from '@/components/widgets/multi-satellite-view'
import AlertEngine from '@/components/widgets/alert-engine'

// Widget configuration interface
interface WidgetConfig {
  id: string
  title: string
  component: React.ComponentType
  category: string
  isVisible: boolean
  position: number
}

// Define all widgets with their configurations
const WIDGET_DEFINITIONS: Omit<WidgetConfig, 'isVisible' | 'position'>[] = [
  {
    id: 'dst-index',
    title: 'DST Index Monitor',
    component: DstIndexMonitor,
    category: 'Geomagnetic & Solar Activity'
  },
  {
    id: 'f107-flux',
    title: 'F10.7 Solar Flux Tracker',
    component: F107FluxTracker,
    category: 'Geomagnetic & Solar Activity'
  },
  {
    id: 'solar-regions',
    title: 'Solar Region Analyzer',
    component: SolarRegionAnalyzer,
    category: 'Geomagnetic & Solar Activity'
  },
  {
    id: 'aviation-weather',
    title: 'Aviation Weather',
    component: AviationWeather,
    category: 'Impact Assessment & Modeling'
  },
  {
    id: 'enlil-model',
    title: 'ENLIL Model',
    component: EnlilModel,
    category: 'Impact Assessment & Modeling'
  },
  {
    id: 'solar-cycle',
    title: 'Solar Cycle Dashboard',
    component: SolarCycleDashboard,
    category: 'Long-term Solar Activity'
  },
  {
    id: 'multi-satellite',
    title: 'Multi-Satellite View',
    component: MultiSatelliteView,
    category: 'Satellite Data Redundancy'
  },
  {
    id: 'alert-engine',
    title: 'Alert Engine',
    component: AlertEngine,
    category: 'Real-time Alert Monitoring'
  }
]

export default function WidgetsPage() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [showSettings, setShowSettings] = useState(false)

  // Initialize widgets with default configuration
  useEffect(() => {
    const defaultWidgets: WidgetConfig[] = WIDGET_DEFINITIONS.map((def, index) => ({
      ...def,
      isVisible: true,
      position: index
    }))

    // Load saved configuration from localStorage
    const savedConfig = localStorage.getItem('space-weather-widgets-page')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        // Merge saved config with defaults to handle new widgets
        const mergedWidgets = defaultWidgets.map(defaultWidget => {
          const saved = parsed.find((w: WidgetConfig) => w.id === defaultWidget.id)
          return saved ? { ...defaultWidget, isVisible: saved.isVisible, position: saved.position } : defaultWidget
        })
        setWidgets(mergedWidgets.sort((a, b) => a.position - b.position))
      } catch (error) {
        console.error('Failed to parse saved widget config:', error)
        setWidgets(defaultWidgets)
      }
    } else {
      setWidgets(defaultWidgets)
    }
  }, [])

  // Save widget configuration to localStorage
  useEffect(() => {
    if (widgets.length > 0) {
      const configToSave = widgets.map(({ id, isVisible, position }) => ({ id, isVisible, position }))
      localStorage.setItem('space-weather-widgets-page', JSON.stringify(configToSave))
    }
  }, [widgets])

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, isVisible: !widget.isVisible }
          : widget
      )
    )
  }

  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const widgetIndex = widgets.findIndex(w => w.id === widgetId)
    if (widgetIndex === -1) return

    const newWidgets = [...widgets]
    const targetIndex = direction === 'up' ? widgetIndex - 1 : widgetIndex + 1

    if (targetIndex >= 0 && targetIndex < newWidgets.length) {
      // Swap positions
      const temp = newWidgets[widgetIndex]
      newWidgets[widgetIndex] = newWidgets[targetIndex]
      newWidgets[targetIndex] = temp

      // Update position values
      newWidgets[widgetIndex].position = widgetIndex
      newWidgets[targetIndex].position = targetIndex

      setWidgets(newWidgets)
    }
  }

  const resetToDefaults = () => {
    const defaultWidgets: WidgetConfig[] = WIDGET_DEFINITIONS.map((def, index) => ({
      ...def,
      isVisible: true,
      position: index
    }))
    setWidgets(defaultWidgets)
    localStorage.removeItem('space-weather-widgets-page')
  }

  const visibleWidgets = widgets
    .filter(widget => widget.isVisible)
    .sort((a, b) => a.position - b.position)

  // Group visible widgets by category
  const widgetsByCategory = visibleWidgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = []
    }
    acc[widget.category].push(widget)
    return acc
  }, {} as Record<string, WidgetConfig[]>)

  return (
    <div className="container mx-auto p-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Space Weather Widgets</h1>
            <p className="text-gray-600">
              Real-time space weather monitoring widgets powered by NOAA SWPC data
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4 mr-2" />
            {showSettings ? 'Hide Settings' : 'Widget Settings'}
          </Button>
        </div>
      </div>

      {/* Widget Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Widget Settings - Drag to Reorder</h3>
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
          </div>
          
          <div className="space-y-2">
            {widgets.map((widget) => (
              <div key={widget.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center space-x-3">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{widget.title}</span>
                  <span className="text-sm text-gray-500">({widget.category})</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveWidget(widget.id, 'up')}
                    disabled={widget.position === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveWidget(widget.id, 'down')}
                    disabled={widget.position === widgets.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleWidgetVisibility(widget.id)}
                  >
                    {widget.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Display widgets by category */}
      {Object.entries(widgetsByCategory).map(([category, categoryWidgets]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryWidgets.map((widget) => {
              const WidgetComponent = widget.component
              return (
                <div key={widget.id} className="min-h-[400px]">
                  <WidgetComponent />
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* No Visible Widgets Message */}
      {visibleWidgets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No widgets are currently visible.</p>
          <Button onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Show Widget Settings
          </Button>
        </div>
      )}

      {/* Widget Information Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>About These Widgets</CardTitle>
          <CardDescription>
            Advanced space weather monitoring capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Data Sources</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• NOAA Space Weather Prediction Center (SWPC)</li>
                <li>• GOES Satellite X-ray and Particle Sensors</li>
                <li>• ACE/DSCOVR Solar Wind Monitors</li>
                <li>• Ground-Based Magnetometer Networks</li>
                <li>• WSA-ENLIL Solar Wind Model</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Update Frequencies</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• DST Index: Every minute</li>
                <li>• F10.7 Flux: Hourly</li>
                <li>• Solar Regions: Hourly</li>
                <li>• Aviation Weather: Every 5 minutes</li>
                <li>• ENLIL Model: Every 10 minutes</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Widget Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <strong>DST Index Monitor</strong>
                <p>Tracks geomagnetic storm intensity and provides storm probability forecasts</p>
              </div>
              <div>
                <strong>F10.7 Solar Flux</strong>
                <p>Monitors solar radio emissions and solar cycle phase</p>
              </div>
              <div>
                <strong>Solar Regions</strong>
                <p>Analyzes active regions for flare potential and Earth-directed risks</p>
              </div>
              <div>
                <strong>Aviation Weather</strong>
                <p>Provides flight-specific impacts including radiation and communication status</p>
              </div>
              <div>
                <strong>ENLIL Model</strong>
                <p>Displays solar wind predictions and CME arrival forecasts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}