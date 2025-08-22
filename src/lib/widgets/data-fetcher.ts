'use client'

import { 
  WidgetData, 
  WidgetEvent, 
  WidgetType, 
  KpIndexData,
  SolarWindData,
  XrayFluxData,
  ProtonFluxData,
  AuroraForecast,
  SatelliteEnvironment,
  SparklineData
} from './widget-types'

// EventTarget polyfill for older browsers
if (typeof EventTarget === 'undefined') {
  // Simple polyfill
  (global as any).EventTarget = class {
    private listeners: { [key: string]: ((...args: unknown[]) => void)[] } = {}
    
    addEventListener(type: string, listener: (...args: unknown[]) => void) {
      if (!this.listeners[type]) this.listeners[type] = []
      this.listeners[type].push(listener)
    }
    
    removeEventListener(type: string, listener: (...args: unknown[]) => void) {
      if (this.listeners[type]) {
        const index = this.listeners[type].indexOf(listener)
        if (index > -1) this.listeners[type].splice(index, 1)
      }
    }
    
    dispatchEvent(event: any) {
      if (this.listeners[event.type]) {
        this.listeners[event.type].forEach(listener => listener(event))
      }
    }
  }
}

class DataFetcherService extends EventTarget {
  private subscriptions = new Map<string, NodeJS.Timeout>()
  private cache = new Map<string, { data: any, timestamp: Date }>()
  private isOnline = navigator?.onLine ?? true
  private eventSource: EventSource | null = null

  constructor() {
    super()
    
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.dispatchEvent(new CustomEvent('connection_status', { detail: { isConnected: true } }))
        this.resumeSubscriptions()
      })
      
      window.addEventListener('offline', () => {
        this.isOnline = false
        this.dispatchEvent(new CustomEvent('connection_status', { detail: { isConnected: false } }))
      })
    }
  }

  // Subscribe to real-time updates for a widget
  subscribe(widgetType: WidgetType, refreshInterval: number = 30000): () => void {
    if (this.subscriptions.has(widgetType)) {
      this.unsubscribe(widgetType)
    }

    // Initial fetch
    this.fetchWidgetData(widgetType)

    // Set up periodic updates
    const intervalId = setInterval(() => {
      if (this.isOnline) {
        this.fetchWidgetData(widgetType)
      }
    }, refreshInterval)

    this.subscriptions.set(widgetType, intervalId)

    // Return unsubscribe function
    return () => this.unsubscribe(widgetType)
  }

  // Unsubscribe from updates
  unsubscribe(widgetType: WidgetType) {
    const subscription = this.subscriptions.get(widgetType)
    if (subscription) {
      clearInterval(subscription)
      this.subscriptions.delete(widgetType)
    }
  }

  // Fetch data for a specific widget
  private async fetchWidgetData(widgetType: WidgetType) {
    try {
      const response = await fetch(`/api/data/${widgetType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Cache the data
      this.cache.set(widgetType, { data, timestamp: new Date() })

      // Dispatch update event
      this.dispatchEvent(new CustomEvent('data_update', {
        detail: { widgetId: widgetType, data, timestamp: new Date() }
      }))

    } catch (error) {
      console.error(`Failed to fetch data for ${widgetType}:`, error)
      
      // Try to use cached data if available
      const cached = this.cache.get(widgetType)
      if (cached) {
        this.dispatchEvent(new CustomEvent('data_update', {
          detail: { widgetId: widgetType, data: cached.data, timestamp: cached.timestamp }
        }))
      }

      // Dispatch error event
      this.dispatchEvent(new CustomEvent('error', {
        detail: { 
          widgetId: widgetType, 
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }
      }))
    }
  }

  // Get cached data for a widget
  getCachedData(widgetType: WidgetType): { data: any, timestamp: Date } | null {
    return this.cache.get(widgetType) || null
  }

  // Resume all subscriptions (e.g., after coming back online)
  private resumeSubscriptions() {
    for (const widgetType of this.subscriptions.keys()) {
      this.fetchWidgetData(widgetType as WidgetType)
    }
  }

  // Initialize Server-Sent Events connection for real-time updates
  initializeSSE() {
    if (typeof window === 'undefined' || this.eventSource) return

    try {
      this.eventSource = new EventSource('/api/stream/space-weather')

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Cache and dispatch the update
          this.cache.set(data.widgetId, { data: data.payload, timestamp: new Date(data.timestamp) })
          
          this.dispatchEvent(new CustomEvent('data_update', {
            detail: { 
              widgetId: data.widgetId, 
              data: data.payload, 
              timestamp: new Date(data.timestamp) 
            }
          }))
        } catch (error) {
          console.error('Failed to parse SSE message:', error)
        }
      }

      this.eventSource.onerror = (event) => {
        console.error('SSE connection error:', event)
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.eventSource = null
            this.initializeSSE()
          }
        }, 5000)
      }

      this.eventSource.onopen = () => {
        console.log('SSE connection established')
      }

    } catch (error) {
      console.error('Failed to initialize SSE:', error)
    }
  }

  // Close SSE connection
  closeSSE() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  // Cleanup all subscriptions
  cleanup() {
    for (const subscription of this.subscriptions.values()) {
      clearInterval(subscription)
    }
    this.subscriptions.clear()
    this.closeSSE()
  }

  // Force refresh data for a widget
  async refreshWidget(widgetType: WidgetType): Promise<any> {
    await this.fetchWidgetData(widgetType)
    return this.getCachedData(widgetType)?.data
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isOnline
  }
}

// Create a singleton instance
export const dataFetcher = new DataFetcherService()

// React hook for using the data fetcher
import { useEffect, useState, useCallback } from 'react'

export function useWidgetData<T>(widgetType: WidgetType, refreshInterval?: number) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isOffline, setIsOffline] = useState(!dataFetcher.getConnectionStatus())

  // Handle data updates
  const handleDataUpdate = useCallback((event: any) => {
    const detail = event.detail as WidgetEvent
    if (detail.type === 'data_update' && detail.widgetId === widgetType) {
      setData(detail.data)
      setIsLoading(false)
      setError(null)
      setLastUpdated(detail.timestamp)
    }
  }, [widgetType])

  // Handle connection status updates
  const handleConnectionStatus = useCallback((event: any) => {
    const detail = event.detail
    setIsOffline(!detail.isConnected)
  }, [])

  // Handle errors
  const handleError = useCallback((event: any) => {
    const detail = event.detail as WidgetEvent
    if (detail.type === 'error' && detail.widgetId === widgetType) {
      setError(detail.error)
      setIsLoading(false)
    }
  }, [widgetType])

  // Manual refresh function
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await dataFetcher.refreshWidget(widgetType)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh')
      setIsLoading(false)
    }
  }, [widgetType])

  useEffect(() => {
    // Add event listeners
    dataFetcher.addEventListener('data_update', handleDataUpdate)
    dataFetcher.addEventListener('connection_status', handleConnectionStatus)
    dataFetcher.addEventListener('error', handleError)

    // Check for cached data first
    const cached = dataFetcher.getCachedData(widgetType)
    if (cached) {
      setData(cached.data)
      setLastUpdated(cached.timestamp)
      setIsLoading(false)
    }

    // Subscribe to updates
    const unsubscribe = dataFetcher.subscribe(widgetType, refreshInterval)

    return () => {
      // Remove event listeners
      dataFetcher.removeEventListener('data_update', handleDataUpdate)
      dataFetcher.removeEventListener('connection_status', handleConnectionStatus)
      dataFetcher.removeEventListener('error', handleError)
      
      // Unsubscribe from updates
      unsubscribe()
    }
  }, [widgetType, refreshInterval, handleDataUpdate, handleConnectionStatus, handleError])

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    isOffline,
    refresh,
  }
}

// Initialize SSE on module load (client-side only)
if (typeof window !== 'undefined') {
  dataFetcher.initializeSSE()
}