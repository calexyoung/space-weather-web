'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Settings, Eye, EyeOff, GripVertical } from 'lucide-react'
import { WidgetConfig, WidgetType, WIDGET_REGISTRY } from '@/lib/widgets/widget-types'

// Widget component mapping (only includes widgets shown on Dashboard)
// Currently all widgets are excluded and shown on dedicated pages
const WIDGET_COMPONENTS = {
  // All widgets have been moved to dedicated pages
} as const

interface WidgetManagerProps {
  className?: string
}

export default function WidgetManager({ className = '' }: WidgetManagerProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [showSettings, setShowSettings] = useState(false)

  // Initialize widgets with default configuration
  useEffect(() => {
    // Exclude specific widgets from Dashboard (they are shown on other pages)
    const excludedWidgets = ['kp-index', 'solar-wind', 'xray-flux', 'proton-flux', 'aurora-forecast', 'satellite-environment', 'python-analysis']
    
    const defaultWidgets: WidgetConfig[] = Object.entries(WIDGET_REGISTRY)
      .filter(([id]) => !excludedWidgets.includes(id))
      .map(([id, info], index) => ({
        id,
        title: info.title,
        refreshInterval: info.defaultConfig.refreshInterval || 30000,
        isVisible: true,
        position: index,
        expanded: false,
      }))

    // Load saved configuration from localStorage
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('space-weather-widgets')
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig)
          // Filter out excluded widgets and merge saved config with defaults
          const mergedWidgets = defaultWidgets.map(defaultWidget => {
            const saved = parsed.find((w: WidgetConfig) => w.id === defaultWidget.id)
            return saved ? { ...defaultWidget, ...saved } : defaultWidget
          }).filter(widget => !excludedWidgets.includes(widget.id))
          setWidgets(mergedWidgets.sort((a, b) => a.position - b.position))
        } catch (error) {
          console.error('Failed to parse saved widget config:', error)
          setWidgets(defaultWidgets)
        }
      } else {
        setWidgets(defaultWidgets)
      }
    } else {
      setWidgets(defaultWidgets)
    }
  }, [])

  // Save widget configuration to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && widgets.length > 0) {
      localStorage.setItem('space-weather-widgets', JSON.stringify(widgets))
    }
  }, [widgets])

  const updateWidget = (widgetId: string, updates: Partial<WidgetConfig>) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, ...updates }
          : widget
      )
    )
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    updateWidget(widgetId, { isVisible: !widgets.find(w => w.id === widgetId)?.isVisible })
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
    // Exclude specific widgets from Dashboard (they are shown on other pages)
    const excludedWidgets = ['kp-index', 'solar-wind', 'xray-flux', 'proton-flux', 'aurora-forecast', 'satellite-environment', 'python-analysis']
    
    const defaultWidgets: WidgetConfig[] = Object.entries(WIDGET_REGISTRY)
      .filter(([id]) => !excludedWidgets.includes(id))
      .map(([id, info], index) => ({
        id,
        title: info.title,
        refreshInterval: info.defaultConfig.refreshInterval || 30000,
        isVisible: true,
        position: index,
        expanded: false,
      }))
    setWidgets(defaultWidgets)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('space-weather-widgets')
    }
  }

  const visibleWidgets = widgets
    .filter(widget => widget.isVisible)
    .sort((a, b) => a.position - b.position)

  return (
    <div className={className}>
      {/* Widget Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Widget Settings</h3>
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

      {/* Widget Management Controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Real-time Space Weather</h2>
        <Button
          variant="outline"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-4 h-4 mr-2" />
          {showSettings ? 'Hide Settings' : 'Widget Settings'}
        </Button>
      </div>

      {/* Widget Grid with Responsive Layout */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleWidgets.map((widget) => {
          const WidgetComponent = WIDGET_COMPONENTS[widget.id as keyof typeof WIDGET_COMPONENTS]
          
          if (!WidgetComponent) {
            console.warn(`Widget component not found for: ${widget.id}`)
            return null
          }

          // Special layout handling for different widgets
          const getWidgetColSpan = (widgetId: string) => {
            switch (widgetId) {
              case 'aurora-forecast':
              case 'satellite-environment':
                return 'xl:col-span-2' // Wider widgets on larger screens
              default:
                return ''
            }
          }

          return (
            <div key={widget.id} className={`${getWidgetColSpan(widget.id)}`}>
              <WidgetComponent
                config={widget}
                onConfigChange={(updates) => updateWidget(widget.id, updates)}
              />
            </div>
          )
        })}
      </div>

      {/* No Visible Widgets Message */}
      {visibleWidgets.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Widgets Have Moved</h3>
          <p className="text-gray-600 mb-4">
            All space weather monitoring widgets are now available on dedicated pages for better organization:
          </p>
          <div className="max-w-md mx-auto text-left space-y-2 mb-6">
            <p className="text-sm text-gray-600">• <strong>Activity Page:</strong> Real-time KP Index, Solar Wind, X-ray & Proton Flux</p>
            <p className="text-sm text-gray-600">• <strong>Widgets Page:</strong> Advanced monitoring tools and forecasts</p>
            <p className="text-sm text-gray-600">• <strong>Python Analysis:</strong> AI-powered analysis and predictions</p>
          </div>
          <div className="space-x-3">
            <Button onClick={() => window.location.href = '/activity'}>
              View Activity Dashboard
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/widgets'}>
              View All Widgets
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// No widgets are currently exported from WidgetManager
// All widgets have been moved to dedicated pages