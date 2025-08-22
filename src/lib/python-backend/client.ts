import { z } from 'zod';

const PYTHON_BACKEND_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5001';

export const PythonBackendResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional()
});

export type PythonBackendResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export class PythonBackendClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = PYTHON_BACKEND_URL, timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<PythonBackendResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return PythonBackendResponseSchema.parse(data) as PythonBackendResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout - Python backend may be unavailable'
          };
        }
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: 'Unknown error occurred'
      };
    }
  }

  async healthCheck(): Promise<PythonBackendResponse<{ status: string; service: string }>> {
    return this.request('/api/python/health');
  }

  async getSolarAnalysis(): Promise<PythonBackendResponse> {
    return this.request('/api/python/solar-analysis');
  }

  async getSatelliteData(type: 'goes' | 'ace' = 'goes'): Promise<PythonBackendResponse> {
    return this.request(`/api/python/satellite-data?type=${type}`);
  }

  async getSpaceWeatherForecast(days: number = 3): Promise<PythonBackendResponse> {
    return this.request(`/api/python/space-weather/forecast?days=${days}`);
  }

  async getSpaceWeatherAlerts(): Promise<PythonBackendResponse> {
    return this.request('/api/python/space-weather/alerts');
  }

  async analyzeImage(imageUrl: string, analysisType: string = 'solar'): Promise<PythonBackendResponse> {
    return this.request('/api/python/analyze-image', {
      method: 'POST',
      body: JSON.stringify({
        url: imageUrl,
        type: analysisType
      })
    });
  }
}

export const pythonBackend = new PythonBackendClient();