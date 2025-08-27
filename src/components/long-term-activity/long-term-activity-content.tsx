'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp, Calendar, BarChart3, LineChart, Sun, Activity, AlertCircle, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export default function LongTermActivityContent() {
  const [timeRange, setTimeRange] = useState('30days')
  const [dataType, setDataType] = useState('sunspot')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }, [timeRange, dataType])

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Long-term Activity</h1>
            <p className="text-gray-600 mt-2">
              Historical trends and solar cycle analysis
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
                <SelectItem value="cycle">Full Solar Cycle</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Solar Cycle Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Solar Cycle 25 Progress</CardTitle>
          <CardDescription>Current cycle began December 2019</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Cycle Progress</p>
              <Progress value={38} className="mb-2" />
              <p className="text-xs text-gray-500">4.5 years into cycle (estimated 11 year duration)</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Current Phase</p>
              <Badge className="mb-2">Ascending Phase</Badge>
              <p className="text-xs text-gray-500">Approaching solar maximum (2024-2025)</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Activity Level</p>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-orange-500" />
                <span className="font-semibold">Moderate-High</span>
              </div>
              <p className="text-xs text-gray-500">Above predicted levels</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Sunspot Number</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">142.5</p>
            <p className="text-xs text-green-600">↑ 23% vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Solar Flares (M+)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">87</p>
            <p className="text-xs text-gray-600">Past 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">CME Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">34</p>
            <p className="text-xs text-gray-600">Earth-directed: 8</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Geomagnetic Storms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-gray-600">G1+: 9, G2+: 3</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sunspot Number Trend</CardTitle>
                <CardDescription>13-month smoothed sunspot number</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <LineChart className="w-8 h-8 text-gray-400" />
                  <span className="ml-2 text-gray-500">Chart visualization would go here</span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current SSN</span>
                    <span className="font-semibold">142.5</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">3-Month Average</span>
                    <span className="font-semibold">128.3</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Trend</span>
                    <span className="font-semibold text-green-600">Increasing</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Solar Flare Activity</CardTitle>
                <CardDescription>Monthly flare counts by class</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                  <span className="ml-2 text-gray-500">Chart visualization would go here</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">245</p>
                    <p className="text-xs text-gray-600">C-class</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">82</p>
                    <p className="text-xs text-gray-600">M-class</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">5</p>
                    <p className="text-xs text-gray-600">X-class</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Activity Patterns Analysis</CardTitle>
              <CardDescription>Recurring patterns and periodicities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">27-Day Recurrence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Active Longitude Detected</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Enhanced activity expected to return around September 15-18
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Coronal Hole Stream</p>
                    <p className="text-xs text-gray-700 mt-1">
                      Recurrent high-speed stream expected September 2-4
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Seasonal Variations</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm">Spring Equinox Effect</span>
                    <Badge variant="outline">+18% storm probability</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm">Fall Equinox Effect</span>
                    <Badge variant="outline">+22% storm probability</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm">Summer Solstice</span>
                    <Badge variant="outline">-12% storm probability</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Solar Cycle Comparison</CardTitle>
              <CardDescription>Cycle 25 vs previous cycles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <LineChart className="w-8 h-8 text-gray-400" />
                  <span className="ml-2 text-gray-500">Comparison chart would go here</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">Cycle 25 (Current)</p>
                      <p className="text-xs text-gray-600">Started Dec 2019</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">142.5</p>
                      <p className="text-xs text-gray-600">Current SSN</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded opacity-75">
                    <div>
                      <p className="font-medium">Cycle 24</p>
                      <p className="text-xs text-gray-600">2008-2019</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">116.4</p>
                      <p className="text-xs text-gray-600">Peak SSN</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded opacity-75">
                    <div>
                      <p className="font-medium">Cycle 23</p>
                      <p className="text-xs text-gray-600">1996-2008</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">180.3</p>
                      <p className="text-xs text-gray-600">Peak SSN</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Above Predictions</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Cycle 25 is exceeding initial predictions by approximately 40%. 
                        Original forecast peak: 115 SSN, Current trajectory: 160+ SSN
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Solar Maximum Forecast</CardTitle>
                <CardDescription>Predicted peak activity period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Expected Peak</p>
                    <p className="text-2xl font-bold text-blue-900 my-2">Q3 2024 - Q1 2025</p>
                    <p className="text-xs text-blue-700">Based on current progression</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Predicted Peak SSN</span>
                      <span className="font-semibold">155-165</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Confidence Level</span>
                      <span className="font-semibold">75%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Next Update</span>
                      <span className="font-semibold">Sept 1, 2024</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Outlook</CardTitle>
                <CardDescription>Next 3-6 months forecast</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border-l-4 border-red-500 bg-red-50">
                    <p className="text-sm font-medium">X-class Flares</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Probability: 25% per month | Expected: 1-2 events
                    </p>
                  </div>
                  
                  <div className="p-3 border-l-4 border-orange-500 bg-orange-50">
                    <p className="text-sm font-medium">M-class Flares</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Probability: 85% per month | Expected: 25-35 events
                    </p>
                  </div>
                  
                  <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                    <p className="text-sm font-medium">Geomagnetic Storms</p>
                    <p className="text-xs text-gray-600 mt-1">
                      G2+: 2-3 events | G3+: 0-1 events expected
                    </p>
                  </div>
                  
                  <div className="p-3 border-l-4 border-purple-500 bg-purple-50">
                    <p className="text-sm font-medium">Radiation Storms</p>
                    <p className="text-xs text-gray-600 mt-1">
                      S1-S2 likely with major flare activity
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}