'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, XCircle, Clock, ExternalLink, Database, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { SourceTypeEnum } from '@/lib/types/space-weather'
import { getSourceApiUrl } from '@/lib/utils/source-mapping'

interface DataSourceStatus {
  source: SourceTypeEnum
  name: string
  url: string
  status: 'online' | 'offline' | 'warning'
  lastFetch: Date
  responseTime?: number
  dataQuality?: number
  errorMessage?: string
  recordCount?: number
}

export default function DataSourcesTab() {
  const [sources, setSources] = useState<DataSourceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState<string | null>(null)

  // Mock data for development
  const mockSources: DataSourceStatus[] = [
    {
      source: 'NOAA_SWPC',
      name: 'NOAA Space Weather Prediction Center',
      url: 'https://services.swpc.noaa.gov/text/discussion.txt',
      status: 'online',
      lastFetch: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      responseTime: 850,
      dataQuality: 0.95,
      recordCount: 1,
    },
    {
      source: 'UK_MET_OFFICE',
      name: 'UK Met Office Space Weather',
      url: 'https://weather.metoffice.gov.uk/specialist-forecasts/space-weather',
      status: 'online',
      lastFetch: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
      responseTime: 1200,
      dataQuality: 0.88,
      recordCount: 1,
    },
    {
      source: 'HELIO_UCLES',
      name: 'HELIO Solar Activity Network',
      url: 'http://helio.mssl.ucl.ac.uk/helio-vo/solar_activity/current/',
      status: 'warning',
      lastFetch: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      responseTime: 3000,
      dataQuality: 0.72,
      errorMessage: 'Slow response time detected',
      recordCount: 1,
    },
  ]

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setSources(mockSources)
      setLoading(false)
    }, 1000)
  }, [])

  const refreshSource = async (sourceType: SourceTypeEnum) => {
    setRefreshing(sourceType)
    
    try {
      // Call the actual API endpoint
      const response = await fetch(getSourceApiUrl(sourceType, { save: 'true' }))
      const result = await response.json()

      if (result.success) {
        // Update the source status
        setSources(prev => prev.map(source => 
          source.source === sourceType 
            ? {
                ...source,
                status: 'online' as const,
                lastFetch: new Date(),
                responseTime: result.data?.responseTime,
                errorMessage: undefined,
              }
            : source
        ))
      } else {
        setSources(prev => prev.map(source => 
          source.source === sourceType 
            ? {
                ...source,
                status: 'offline' as const,
                errorMessage: result.error,
              }
            : source
        ))
      }
    } catch (error) {
      setSources(prev => prev.map(source => 
        source.source === sourceType 
          ? {
              ...source,
              status: 'offline' as const,
              errorMessage: 'Network error',
            }
          : source
      ))
    }
    
    setRefreshing(null)
  }

  const refreshAllSources = async () => {
    setRefreshing('ALL')
    
    try {
      const response = await fetch('/api/sources/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ save: true }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update all sources based on the response
        setSources(prev => prev.map(source => {
          const fetchResult = result.data.sources.find((s: any) => s.source === source.source)
          return fetchResult ? {
            ...source,
            status: fetchResult.success ? 'online' as const : 'offline' as const,
            lastFetch: new Date(),
            responseTime: fetchResult.responseTime,
            errorMessage: fetchResult.error,
          } : source
        }))
      }
    } catch (error) {
      console.error('Failed to refresh all sources:', error)
    }
    
    setRefreshing(null)
  }

  const getStatusIcon = (status: 'online' | 'offline' | 'warning') => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'offline':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: 'online' | 'offline' | 'warning') => {
    const variants = {
      online: 'bg-green-100 text-green-800',
      offline: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
    }
    return <Badge className={variants[status]}>{status.toUpperCase()}</Badge>
  }

  const getQualityColor = (quality?: number) => {
    if (!quality) return 'text-gray-400'
    if (quality >= 0.9) return 'text-green-600'
    if (quality >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Sources</h2>
          <p className="text-gray-600">
            Monitor and manage space weather data sources
          </p>
        </div>
        <Button 
          onClick={refreshAllSources} 
          disabled={refreshing !== null}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing === 'ALL' ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{sources.filter(s => s.status === 'online').length}</p>
                <p className="text-gray-600 text-sm">Sources Online</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">
                  {Math.round(sources.reduce((acc, s) => acc + (s.responseTime || 0), 0) / sources.length)}ms
                </p>
                <p className="text-gray-600 text-sm">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Database className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">
                  {sources.reduce((acc, s) => acc + (s.recordCount || 0), 0)}
                </p>
                <p className="text-gray-600 text-sm">Records Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Details */}
      <div className="space-y-4">
        {sources.map((source) => (
          <Card key={source.source} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(source.status)}
                  <div>
                    <CardTitle className="text-lg">{source.name}</CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <ExternalLink className="w-3 h-3" />
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline text-blue-600"
                      >
                        {source.url}
                      </a>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(source.status)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshSource(source.source)}
                    disabled={refreshing === source.source}
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshing === source.source ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-sm text-gray-600">Last Fetch</div>
                  <div className="text-sm font-medium">
                    {format(source.lastFetch, 'PPp')}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Response Time</div>
                  <div className="text-sm font-medium">
                    {source.responseTime ? `${source.responseTime}ms` : 'N/A'}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Data Quality</div>
                  <div className={`text-sm font-medium ${getQualityColor(source.dataQuality)}`}>
                    {source.dataQuality ? `${(source.dataQuality * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Records</div>
                  <div className="text-sm font-medium">
                    {source.recordCount || 0}
                  </div>
                </div>
              </div>
              
              {source.errorMessage && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <div className="ml-3">
                      <div className="text-sm text-red-800">
                        {source.errorMessage}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}