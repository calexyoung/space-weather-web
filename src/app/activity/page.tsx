'use client'

import React, { useState, useCallback } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import DstIndexMonitor from '@/components/widgets/dst-index-monitor'
import SolarRegionAnalyzer from '@/components/widgets/solar-region-analyzer'
import XrayFluxWidget from '@/components/widgets/xray-flux-widget'
import SolarWindWidget from '@/components/widgets/solar-wind-widget'
import ProtonFluxWidget from '@/components/widgets/proton-flux-widget'
import KpIndexWidget from '@/components/widgets/kp-index-widget'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetItem {
  id: string
  title: string
  component: React.ComponentType<any>
  config?: any
}

interface DraggableWidgetProps {
  widget: WidgetItem
  index: number
  moveWidget: (dragIndex: number, hoverIndex: number) => void
  onConfigChange: (widgetId: string, config: any) => void
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({ widget, index, moveWidget, onConfigChange }) => {
  const [{ isDragging }, dragRef, preview] = useDrag({
    type: 'widget',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [{ isOver }, dropRef] = useDrop({
    accept: 'widget',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveWidget(item.index, index)
        item.index = index
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  const Component = widget.component

  // Combine refs
  const ref = React.useRef<HTMLDivElement>(null)
  const dragHandleRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    if (ref.current) {
      preview(dropRef(ref.current))
    }
    if (dragHandleRef.current) {
      dragRef(dragHandleRef.current)
    }
  }, [preview, dropRef, dragRef])

  const handleConfigChange = (updates: any) => {
    onConfigChange(widget.id, updates)
  }

  return (
    <div
      ref={ref}
      className={cn(
        'lg:col-span-1 relative transition-all duration-200',
        isDragging && 'opacity-50',
        isOver && 'ring-2 ring-blue-500 ring-offset-2 rounded-lg'
      )}
    >
      <div className="absolute top-2 right-2 z-10">
        <div
          ref={dragHandleRef}
          className="cursor-move p-1 rounded hover:bg-gray-200/80 bg-white/80 backdrop-blur-sm"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4 text-gray-600" />
        </div>
      </div>
      {widget.config ? <Component config={widget.config} onConfigChange={handleConfigChange} /> : <Component />}
    </div>
  )
}

export default function ActivityPage() {
  // Widget configurations
  const initialWidgets: WidgetItem[] = [
    {
      id: 'dst-index',
      title: 'DST Index Monitor',
      component: DstIndexMonitor,
    },
    {
      id: 'solar-regions',
      title: 'Solar Region Analyzer',
      component: SolarRegionAnalyzer,
    },
    {
      id: 'xray-flux',
      title: 'X-ray Flux Monitor',
      component: XrayFluxWidget,
      config: {
        title: 'X-ray Flux Monitor',
        id: 'xray-flux',
        refreshInterval: 60000,
        isVisible: true,
        position: 2,
        expanded: false
      }
    },
    {
      id: 'solar-wind',
      title: 'Solar Wind Parameters',
      component: SolarWindWidget,
      config: {
        title: 'Solar Wind Parameters',
        id: 'solar-wind',
        refreshInterval: 60000,
        isVisible: true,
        position: 3,
        expanded: false
      }
    },
    {
      id: 'proton-flux',
      title: 'Proton Monitor',
      component: ProtonFluxWidget,
      config: {
        title: 'Proton Monitor',
        id: 'proton-flux',
        refreshInterval: 60000,
        isVisible: true,
        position: 4,
        expanded: false
      }
    },
    {
      id: 'kp-index',
      title: 'Kp Index Monitor',
      component: KpIndexWidget,
      config: {
        title: 'Kp Index Monitor',
        id: 'kp-index',
        refreshInterval: 60000,
        isVisible: true,
        position: 5,
        expanded: false
      }
    }
  ]

  const [widgets, setWidgets] = useState<WidgetItem[]>(initialWidgets)

  const moveWidget = useCallback((dragIndex: number, hoverIndex: number) => {
    setWidgets((prevWidgets) => {
      const newWidgets = [...prevWidgets]
      const draggedWidget = newWidgets[dragIndex]
      
      // Remove the dragged widget
      newWidgets.splice(dragIndex, 1)
      // Insert it at the new position
      newWidgets.splice(hoverIndex, 0, draggedWidget)
      
      // Update positions in configs if they exist
      return newWidgets.map((widget, index) => ({
        ...widget,
        config: widget.config ? { ...widget.config, position: index } : undefined
      }))
    })
  }, [])

  const handleConfigChange = useCallback((widgetId: string, updates: any) => {
    setWidgets((prevWidgets) => 
      prevWidgets.map((widget) => {
        if (widget.id === widgetId && widget.config) {
          return {
            ...widget,
            config: { ...widget.config, ...updates }
          }
        }
        return widget
      })
    )
  }, [])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Activity</h1>
            <p className="text-gray-600 mt-2">
              Real-time space weather activity monitoring - Drag widgets to reorder
            </p>
          </div>

          {/* Widgets Grid - 3 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {widgets.map((widget, index) => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                index={index}
                moveWidget={moveWidget}
                onConfigChange={handleConfigChange}
              />
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  )
}