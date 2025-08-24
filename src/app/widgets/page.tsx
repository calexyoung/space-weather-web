'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DstIndexMonitor from '@/components/widgets/dst-index-monitor'
import F107FluxTracker from '@/components/widgets/f107-flux-tracker'
import SolarRegionAnalyzer from '@/components/widgets/solar-region-analyzer'
import AviationWeather from '@/components/widgets/aviation-weather'
import EnlilModel from '@/components/widgets/enlil-model'

export default function WidgetsPage() {
  return (
    <div className="container mx-auto p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Space Weather Widgets</h1>
        <p className="text-gray-600">
          Real-time space weather monitoring widgets powered by NOAA SWPC data
        </p>
      </div>

      {/* Primary Monitoring Widgets */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Geomagnetic & Solar Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="min-h-[400px]">
            <DstIndexMonitor />
          </div>
          <div className="min-h-[400px]">
            <F107FluxTracker />
          </div>
          <div className="min-h-[400px]">
            <SolarRegionAnalyzer />
          </div>
        </div>
      </div>

      {/* Specialized Impact Widgets */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Impact Assessment & Modeling</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="min-h-[400px]">
            <AviationWeather />
          </div>
          <div className="min-h-[400px]">
            <EnlilModel />
          </div>
        </div>
      </div>

      {/* Widget Information */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>About These Widgets</CardTitle>
          <CardDescription>
            Advanced space weather monitoring capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Data Sources</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• NOAA Space Weather Prediction Center (SWPC)</li>
                <li>• GOES Satellite X-ray and Particle Sensors</li>
                <li>• ACE/DSCOVR Solar Wind Monitors</li>
                <li>• Ground-Based Magnetometer Networks</li>
                <li>• WSA-ENLIL Solar Wind Model</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Update Frequencies</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• DST Index: Every minute</li>
                <li>• F10.7 Flux: Hourly</li>
                <li>• Solar Regions: Hourly</li>
                <li>• Aviation Weather: Every 5 minutes</li>
                <li>• ENLIL Model: Every 10 minutes</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Widget Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <strong>DST Index Monitor</strong>
                <p>Tracks geomagnetic storm intensity and provides storm probability forecasts</p>
              </div>
              <div>
                <strong>F10.7 Solar Flux</strong>
                <p>Monitors solar radio emissions and solar cycle phase</p>
              </div>
              <div>
                <strong>Solar Regions</strong>
                <p>Analyzes active regions for flare potential and Earth-directed risks</p>
              </div>
              <div>
                <strong>Aviation Weather</strong>
                <p>Provides flight-specific impacts including radiation and communication status</p>
              </div>
              <div>
                <strong>ENLIL Model</strong>
                <p>Displays solar wind predictions and CME arrival forecasts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}