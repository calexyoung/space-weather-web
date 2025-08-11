'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  RefreshCw, 
  Database, 
  Clock,
  TrendingUp,
  Settings
} from 'lucide-react'
import { SourceTypeEnum } from '@/lib/types/space-weather'

interface SourceStatus {
  id: SourceTypeEnum
  name: string
  description: string
  status: 'online' | 'warning' | 'offline'
  lastUpdated?: string
  qualityScore?: number
  dataFreshness?: string
  isSelected: boolean
  responseTime?: number
}

interface SourceSelectorProps {
  selectedSources: SourceTypeEnum[]
  onSelectionChange: (sources: SourceTypeEnum[]) => void
  onRefresh?: (source: SourceTypeEnum) => void
  className?: string
}

export default function SourceSelector({
  selectedSources,
  onSelectionChange,
  onRefresh,
  className = ''
}: SourceSelectorProps) {
  const [sources, setSources] = useState<SourceStatus[]>([
    {
      id: 'NOAA_SWPC',
      name: 'NOAA Space Weather Prediction Center',
      description: 'Official US space weather forecasts and alerts',
      status: 'online',
      lastUpdated: '2 minutes ago',
      qualityScore: 0.95,
      dataFreshness: 'Fresh',
      isSelected: selectedSources.includes('NOAA_SWPC'),
      responseTime: 450
    },
    {
      id: 'UK_MET_OFFICE',
      name: 'UK Met Office Space Weather',
      description: 'European space weather analysis and predictions',
      status: 'online',
      lastUpdated: '5 minutes ago',
      qualityScore: 0.88,
      dataFreshness: 'Good',
      isSelected: selectedSources.includes('UK_MET_OFFICE'),
      responseTime: 720
    },
    {
      id: 'HELIO_UCLES',
      name: 'HELIO-UCLES Solar Monitor',
      description: 'Real-time solar activity monitoring',
      status: 'warning',
      lastUpdated: '15 minutes ago',
      qualityScore: 0.72,
      dataFreshness: 'Stale',
      isSelected: selectedSources.includes('HELIO_UCLES'),
      responseTime: 1200
    }
  ])

  const [refreshing, setRefreshing] = useState<Set<SourceTypeEnum>>(new Set())

  // Update selection status when props change
  useEffect(() => {
    setSources(prevSources => 
      prevSources.map(source => ({
        ...source,
        isSelected: selectedSources.includes(source.id)
      }))
    )
  }, [selectedSources])

  const handleSourceToggle = (sourceId: SourceTypeEnum) => {
    const newSelection = sources
      .filter(source => source.id === sourceId ? !source.isSelected : source.isSelected)
      .map(source => source.id)
    
    onSelectionChange(newSelection)
  }

  const handleRefreshSource = async (sourceId: SourceTypeEnum) => {
    if (!onRefresh) return
    
    setRefreshing(prev => new Set(prev.add(sourceId)))
    
    try {
      await onRefresh(sourceId)
      // Update source status after refresh
      setSources(prevSources =>
        prevSources.map(source =>
          source.id === sourceId
            ? {
                ...source,
                status: 'online' as const,
                lastUpdated: 'Just now',
                dataFreshness: 'Fresh'
              }
            : source
        )
      )
    } catch (error) {
      console.error(`Failed to refresh ${sourceId}:`, error)
      // Update to error state
      setSources(prevSources =>
        prevSources.map(source =>
          source.id === sourceId
            ? { ...source, status: 'offline' as const }
            : source
        )
      )
    } finally {
      setRefreshing(prev => {
        const newSet = new Set(prev)
        newSet.delete(sourceId)
        return newSet
      })
    }
  }

  const getStatusIcon = (status: SourceStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: SourceStatus['status']) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Online</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>
      case 'offline':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Offline</Badge>
    }
  }

  const getFreshnessColor = (freshness: string) => {
    switch (freshness) {
      case 'Fresh':
        return 'text-green-600'
      case 'Good':
        return 'text-blue-600'
      case 'Stale':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const selectedCount = sources.filter(s => s.isSelected).length
  const onlineCount = sources.filter(s => s.status === 'online').length

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-500" />
            <span>Data Sources</span>
          </CardTitle>
          <CardDescription>
            Select and monitor space weather data sources for report generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{selectedCount}</div>
              <div className="text-sm text-gray-600">Selected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
              <div className="text-sm text-gray-600">Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{sources.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>

          {/* Source List */}
          <div className="space-y-3">
            {sources.map(source => (
              <div
                key={source.id}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  source.isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSourceToggle(source.id)}
              >
                <div className="flex items-start justify-between">
                  {/* Source Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={source.isSelected}
                        onChange={() => handleSourceToggle(source.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <h3 className="font-semibold text-gray-900">{source.name}</h3>
                      {getStatusIcon(source.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{source.description}</p>
                    
                    {/* Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">{source.lastUpdated}</span>
                      </div>
                      
                      {source.qualityScore && (
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">
                            {Math.round(source.qualityScore * 100)}% quality
                          </span>
                        </div>
                      )}
                      
                      {source.dataFreshness && (
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${
                            source.dataFreshness === 'Fresh' ? 'bg-green-500' :
                            source.dataFreshness === 'Good' ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`} />
                          <span className={getFreshnessColor(source.dataFreshness)}>
                            {source.dataFreshness}
                          </span>
                        </div>
                      )}
                      
                      {source.responseTime && (
                        <div className="text-gray-600">
                          {source.responseTime}ms
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex flex-col items-end space-y-2">
                    {getStatusBadge(source.status)}
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRefreshSource(source.id)
                        }}
                        disabled={refreshing.has(source.id)}
                        className="h-8 w-8 p-0"
                      >
                        <RefreshCw className={`w-3 h-3 ${
                          refreshing.has(source.id) ? 'animate-spin' : ''
                        }`} />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 p-0"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange([])}
              disabled={selectedCount === 0}
            >
              Clear All
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange(sources.map(s => s.id))}
              disabled={selectedCount === sources.length}
            >
              Select All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}