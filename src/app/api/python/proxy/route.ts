import { NextRequest, NextResponse } from 'next/server';
import { pythonBackend } from '@/lib/python-backend/client';
import { createApiResponse, createApiError } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json(
        createApiError('Missing endpoint parameter', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    let result;
    switch (endpoint) {
      case 'health':
        result = await pythonBackend.healthCheck();
        break;
      case 'solar-analysis':
        result = await pythonBackend.getSolarAnalysis();
        break;
      case 'satellite-data':
        const type = searchParams.get('type') as 'goes' | 'ace' || 'goes';
        result = await pythonBackend.getSatelliteData(type);
        break;
      case 'forecast':
        const days = parseInt(searchParams.get('days') || '3');
        result = await pythonBackend.getSpaceWeatherForecast(days);
        break;
      case 'alerts':
        result = await pythonBackend.getSpaceWeatherAlerts();
        break;
      default:
        return NextResponse.json(
          createApiError(`Unknown endpoint: ${endpoint}`, 'VALIDATION_ERROR'),
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        createApiError(result.error || 'Python backend error', 'EXTERNAL_API_ERROR'),
        { status: 500 }
      );
    }

    return NextResponse.json(createApiResponse(true, result.data));
  } catch (error) {
    console.error('Python proxy error:', error);
    return NextResponse.json(
      createApiError('Failed to proxy request to Python backend', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json(
        createApiError('Missing endpoint parameter', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const body = await request.json();

    let result;
    switch (endpoint) {
      case 'analyze-image':
        result = await pythonBackend.analyzeImage(body.url, body.type);
        break;
      default:
        return NextResponse.json(
          createApiError(`Unknown POST endpoint: ${endpoint}`, 'VALIDATION_ERROR'),
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        createApiError(result.error || 'Python backend error', 'EXTERNAL_API_ERROR'),
        { status: 500 }
      );
    }

    return NextResponse.json(createApiResponse(true, result.data));
  } catch (error) {
    console.error('Python proxy POST error:', error);
    return NextResponse.json(
      createApiError('Failed to proxy POST request to Python backend', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}