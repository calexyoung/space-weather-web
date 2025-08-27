'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DateRangeControls } from '@/components/timeline/date-range-controls'
import { XrayFluxChart } from '@/components/timeline/charts/xray-flux-chart'
import { ProtonFluxChart } from '@/components/timeline/charts/proton-flux-chart'
import { IMFChart } from '@/components/timeline/charts/imf-chart'
import { SolarWindChart } from '@/components/timeline/charts/solar-wind-chart'
import { KpIndexChart } from '@/components/timeline/charts/kp-index-chart'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ChartData {
  xrayFlux: any[]
  protonFlux: any[]
  imf: any[]
  solarWind: any[]
  kpIndex: any[]
}

export default function TimelineContent() {
  const [data, setData] = useState<ChartData>({
    xrayFlux: [],
    protonFlux: [],
    imf: [],
    solarWind: [],
    kpIndex: []
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 3) // Default to last 3 days
    return { start, end }
  })

  // Fetch data for a specific endpoint
  const fetchDataForEndpoint = async (
    endpoint: string,
    start: Date,
    end: Date
  ) => {
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString()
      })
      
      const response = await fetch(`/api/space-weather/${endpoint}?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`)
      }
      
      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error)
      throw error
    }
  }

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setErrors({})
    
    const endpoints = [
      { key: 'xrayFlux', endpoint: 'xray-flux' },
      { key: 'protonFlux', endpoint: 'proton-flux' },
      { key: 'imf', endpoint: 'imf' },
      { key: 'solarWind', endpoint: 'solar-wind' },
      { key: 'kpIndex', endpoint: 'kp-index' }
    ]
    
    const newData: ChartData = {
      xrayFlux: [],
      protonFlux: [],
      imf: [],
      solarWind: [],
      kpIndex: []
    }
    
    const newErrors: Record<string, string> = {}
    
    // Fetch data in parallel
    await Promise.all(
      endpoints.map(async ({ key, endpoint }) => {
        try {
          const data = await fetchDataForEndpoint(
            endpoint,
            dateRange.start,
            dateRange.end
          )
          newData[key as keyof ChartData] = data
        } catch (error) {
          newErrors[key] = error instanceof Error ? error.message : 'Failed to load data'
          // Use empty array on error to prevent chart from breaking
          newData[key as keyof ChartData] = []
        }
      })
    )
    
    setData(newData)
    setErrors(newErrors)
    setLoading(false)
  }, [dateRange])

  // Initial data load
  useEffect(() => {
    fetchAllData()
  }, []) // Empty dependency array for initial load only

  // Update the last updated time on client side only to avoid hydration issues
  useEffect(() => {
    if (!loading && (data.xrayFlux.length > 0 || data.protonFlux.length > 0 || 
        data.imf.length > 0 || data.solarWind.length > 0 || data.kpIndex.length > 0)) {
      setLastUpdated(new Date().toLocaleString())
    }
  }, [data, loading])

  // Handle date range change
  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end })
  }

  // Handle refresh
  const handleRefresh = () => {
    fetchAllData()
  }

  // Error display component
  const ErrorMessage = ({ error, chartName }: { error: string; chartName: string }) => (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800 dark:text-red-200">
          Failed to load {chartName}
        </p>
        <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>
        <button
          onClick={fetchAllData}
          className="mt-2 text-xs text-red-700 dark:text-red-300 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Earth Space Weather Timeline</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time monitoring of space weather conditions affecting Earth
        </p>
      </div>

      {/* Date Range Controls */}
      <DateRangeControls
        onDateRangeChange={handleDateRangeChange}
        onRefresh={handleRefresh}
        isLoading={loading}
      />

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* X-ray Flux Chart */}
        {errors.xrayFlux ? (
          <ErrorMessage error={errors.xrayFlux} chartName="X-ray Flux" />
        ) : (
          <XrayFluxChart data={data.xrayFlux} />
        )}

        {/* Proton Flux Chart */}
        {errors.protonFlux ? (
          <ErrorMessage error={errors.protonFlux} chartName="Proton Flux" />
        ) : (
          <ProtonFluxChart data={data.protonFlux} />
        )}

        {/* Interplanetary Magnetic Field Chart */}
        {errors.imf ? (
          <ErrorMessage error={errors.imf} chartName="Interplanetary Magnetic Field" />
        ) : (
          <IMFChart data={data.imf} />
        )}

        {/* Solar Wind Speed Chart */}
        {errors.solarWind ? (
          <ErrorMessage error={errors.solarWind} chartName="Solar Wind" />
        ) : (
          <SolarWindChart data={data.solarWind} />
        )}

        {/* Kp Index Chart */}
        {errors.kpIndex ? (
          <ErrorMessage error={errors.kpIndex} chartName="Kp Index" />
        ) : (
          <KpIndexChart data={data.kpIndex} />
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>Data Sources: KNMI HAPI Server, NOAA SWPC, NASA CDAWeb</p>
          {lastUpdated && (
            <p className="mt-1">
              Last updated: {lastUpdated} • Auto-refresh available
            </p>
          )}
        </div>
      </div>
    </div>
  )
}