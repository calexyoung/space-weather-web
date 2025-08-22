import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'

// Create an HTTP client with retry logic similar to the Python requests adapter
export class HttpClient {
  private client: AxiosInstance

  constructor(config?: AxiosRequestConfig) {
    this.client = axios.create({
      timeout: 30000, // 30 second timeout
      ...config,
    })

    // Add retry interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as AxiosRequestConfig & { _retryCount?: number }
        
        if (!config || !this.shouldRetry(error)) {
          return Promise.reject(error)
        }

        config._retryCount = config._retryCount || 0
        
        if (config._retryCount >= 3) {
          return Promise.reject(error)
        }

        config._retryCount += 1
        
        // Exponential backoff: 300ms, 900ms, 2700ms
        const delay = 300 * Math.pow(3, config._retryCount - 1)
        await this.sleep(delay)

        return this.client.request(config)
      }
    )
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true // Network error, retry
    
    const status = error.response.status
    return status === 500 || status === 502 || status === 504
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config)
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config)
    return response.data
  }
}

// Default HTTP client instance
export const httpClient = new HttpClient()

// Specialized client for space weather data sources
export const spaceWeatherClient = new HttpClient({
  headers: {
    'User-Agent': 'Space-Weather-Dashboard/1.0.0',
  },
})

// Error handling utilities
export function isHttpError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error)
}

export function getErrorMessage(error: unknown): string {
  if (isHttpError(error)) {
    if (error.response) {
      return `HTTP ${error.response.status}: ${error.response.statusText}`
    }
    if (error.request) {
      return 'Network error: No response received'
    }
    return `Request error: ${error.message}`
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'Unknown error occurred'
}

export function getHttpStatusCode(error: unknown): number | null {
  if (isHttpError(error) && error.response) {
    return error.response.status
  }
  return null
}

// Fetch-based HTTP client for scrapers
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    throw error
  }
}