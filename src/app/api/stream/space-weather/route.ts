import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = {
        type: 'connection',
        message: 'Connected to space weather stream',
        timestamp: new Date().toISOString(),
      }
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`))
      
      // Set up periodic data updates
      const intervals = [
        // Kp index updates every 3 minutes
        setInterval(async () => {
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/data/kp-index`)
            if (response.ok) {
              const data = await response.json()
              const message = {
                widgetId: 'kp-index',
                payload: data,
                timestamp: new Date().toISOString(),
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
            }
          } catch (error) {
            console.error('Error streaming kp-index data:', error)
          }
        }, 3 * 60 * 1000), // 3 minutes
        
        // Solar wind updates every minute
        setInterval(async () => {
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/data/solar-wind`)
            if (response.ok) {
              const data = await response.json()
              const message = {
                widgetId: 'solar-wind',
                payload: data,
                timestamp: new Date().toISOString(),
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
            }
          } catch (error) {
            console.error('Error streaming solar-wind data:', error)
          }
        }, 60 * 1000), // 1 minute
        
        // X-ray flux updates every 30 seconds
        setInterval(async () => {
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/data/xray-flux`)
            if (response.ok) {
              const data = await response.json()
              const message = {
                widgetId: 'xray-flux',
                payload: data,
                timestamp: new Date().toISOString(),
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
            }
          } catch (error) {
            console.error('Error streaming xray-flux data:', error)
          }
        }, 30 * 1000), // 30 seconds
        
        // Aurora forecast updates every 5 minutes
        setInterval(async () => {
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/data/aurora-forecast`)
            if (response.ok) {
              const data = await response.json()
              const message = {
                widgetId: 'aurora-forecast',
                payload: data,
                timestamp: new Date().toISOString(),
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
            }
          } catch (error) {
            console.error('Error streaming aurora-forecast data:', error)
          }
        }, 5 * 60 * 1000), // 5 minutes
        
        // Satellite environment updates every 2 minutes
        setInterval(async () => {
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/data/satellite-environment`)
            if (response.ok) {
              const data = await response.json()
              const message = {
                widgetId: 'satellite-environment',
                payload: data,
                timestamp: new Date().toISOString(),
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
            }
          } catch (error) {
            console.error('Error streaming satellite-environment data:', error)
          }
        }, 2 * 60 * 1000), // 2 minutes
        
        // Keep-alive ping every 30 seconds
        setInterval(() => {
          const pingMessage = {
            type: 'ping',
            timestamp: new Date().toISOString(),
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(pingMessage)}\n\n`))
        }, 30 * 1000),
      ]
      
      // Clean up intervals when stream is closed
      const cleanup = () => {
        intervals.forEach(interval => clearInterval(interval))
      }
      
      // Store cleanup function on the controller for later use
      ;(controller as any)._cleanup = cleanup
      
      // Handle client disconnection
      request.signal?.addEventListener('abort', cleanup)
    },
    
    cancel() {
      // Clean up when stream is cancelled
      if ((this as any)._cleanup) {
        ;(this as any)._cleanup()
      }
    },
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}