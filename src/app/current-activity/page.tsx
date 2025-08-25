'use client'

import React, { useState, useEffect } from 'react'
import { Activity, AlertTriangle, TrendingUp, Zap, Radio, Satellite, Sun, Wind } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CurrentActivityPage() {
  const [currentTime, setCurrentTime] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const utcString = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      setCurrentTime(utcString)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    // Simulate data loading
    setTimeout(() => {
      setLoading(false)
      // In a real implementation, this would fetch actual current activity data
      setData({
        solarFlare: { level: 'M1.5', time: '2024-08-24 12:30 UTC' },
        geomagneticStorm: { kp: 5, status: 'Minor Storm' },
        solarWind: { speed: 450, density: 5.2 },
        radioBlackout: { level: 'R1', affected: 'Minor' }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Current Activity</h1>
              <p className="text-gray-600 mt-2">
                Real-time space weather conditions and active events
              </p>
            </div>
            <div className="text-sm font-mono bg-white px-4 py-2 rounded-lg shadow-sm">
              <div className="text-gray-500 text-xs">UTC Time</div>
              <div className="text-gray-900 font-semibold">{currentTime}</div>
            </div>
          </div>
        </div>

        {/* Alert Banner for Active Events */}
        <Alert className="mb-6 border-orange-500 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">Active Space Weather Alert</AlertTitle>
          <AlertDescription className="text-orange-800">
            G1 (Minor) Geomagnetic Storm conditions observed. Aurora may be visible at high latitudes.
          </AlertDescription>
        </Alert>

        {/* Current Conditions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solar Flare Activity</CardTitle>
              <Sun className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">M1.5</div>
              <p className="text-xs text-gray-600 mt-1">Moderate activity</p>
              <Badge variant="secondary" className="mt-2">12:30 UTC</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geomagnetic Storm</CardTitle>
              <Zap className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Kp 5</div>
              <p className="text-xs text-gray-600 mt-1">Minor Storm</p>
              <Badge variant="destructive" className="mt-2">Active</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solar Wind Speed</CardTitle>
              <Wind className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">450 km/s</div>
              <p className="text-xs text-gray-600 mt-1">Elevated</p>
              <Badge variant="outline" className="mt-2">↑ 12%</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Radio Blackout</CardTitle>
              <Radio className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R1</div>
              <p className="text-xs text-gray-600 mt-1">Minor impact</p>
              <Badge variant="secondary" className="mt-2">HF Radio</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Activity Tabs */}
        <Tabs defaultValue="solar" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="solar">Solar Activity</TabsTrigger>
            <TabsTrigger value="geomagnetic">Geomagnetic</TabsTrigger>
            <TabsTrigger value="radiation">Radiation</TabsTrigger>
            <TabsTrigger value="impacts">Impacts</TabsTrigger>
          </TabsList>

          <TabsContent value="solar">
            <Card>
              <CardHeader>
                <CardTitle>Solar Activity Details</CardTitle>
                <CardDescription>Current solar flares and coronal mass ejections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Recent Solar Flares</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">M1.5 Flare</span>
                        <p className="text-sm text-gray-600">Region 3421</p>
                      </div>
                      <span className="text-sm text-gray-500">12:30 UTC</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">C8.2 Flare</span>
                        <p className="text-sm text-gray-600">Region 3419</p>
                      </div>
                      <span className="text-sm text-gray-500">09:15 UTC</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Active Regions</h3>
                  <p className="text-sm text-gray-600">
                    Currently monitoring 8 active regions on the visible solar disk.
                    Region 3421 shows the highest potential for M-class flares.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geomagnetic">
            <Card>
              <CardHeader>
                <CardTitle>Geomagnetic Activity</CardTitle>
                <CardDescription>Earth's magnetic field disturbances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Current Conditions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Planetary K-index</p>
                      <p className="text-lg font-semibold">Kp = 5 (G1 Storm)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Disturbance Storm Time</p>
                      <p className="text-lg font-semibold">Dst = -45 nT</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Aurora Visibility</h3>
                  <p className="text-sm text-gray-600">
                    Aurora may be visible at latitudes above 60° magnetic latitude.
                    Enhanced activity expected to continue for the next 6-12 hours.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="radiation">
            <Card>
              <CardHeader>
                <CardTitle>Radiation Environment</CardTitle>
                <CardDescription>Particle flux and radiation levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Proton Flux</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">&gt;10 MeV</p>
                      <p className="text-lg font-semibold">2.1 pfu</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">&gt;50 MeV</p>
                      <p className="text-lg font-semibold">0.3 pfu</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">&gt;100 MeV</p>
                      <p className="text-lg font-semibold">0.1 pfu</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Electron Flux</h3>
                  <p className="text-sm text-gray-600">
                    2 MeV electron flux at geosynchronous orbit: Normal levels
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impacts">
            <Card>
              <CardHeader>
                <CardTitle>Technology & Infrastructure Impacts</CardTitle>
                <CardDescription>Current and potential impacts on systems</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="border-l-4 border-yellow-500 pl-4 py-2">
                    <h4 className="font-semibold">Satellite Operations</h4>
                    <p className="text-sm text-gray-600">
                      Minor impact on satellite operations. Increased drag on low-Earth orbit satellites.
                    </p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4 py-2">
                    <h4 className="font-semibold">Power Systems</h4>
                    <p className="text-sm text-gray-600">
                      Weak power grid fluctuations possible at high latitudes.
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4 py-2">
                    <h4 className="font-semibold">Aviation</h4>
                    <p className="text-sm text-gray-600">
                      Minor impact on HF radio propagation at high latitudes.
                    </p>
                  </div>
                  <div className="border-l-4 border-purple-500 pl-4 py-2">
                    <h4 className="font-semibold">GPS/Navigation</h4>
                    <p className="text-sm text-gray-600">
                      Intermittent GPS navigation issues possible, primarily at high latitudes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}