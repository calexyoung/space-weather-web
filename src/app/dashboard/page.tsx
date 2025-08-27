'use client'

import React, { useState, useEffect } from 'react'
import { Database, Clock, FileText, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DataSourcesTab from '@/components/dashboard/data-sources-tab'
import Link from 'next/link'

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const utcString = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      setCurrentTime(utcString)
    }

    updateTime() // Initial update
    const interval = setInterval(updateTime, 1000) // Update every second

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Real-time space weather data source monitoring
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
              <Clock className="w-5 h-5 text-gray-600" />
              <div className="text-sm font-mono">
                <div className="text-gray-500 text-xs">UTC Time</div>
                <div className="text-gray-900 font-semibold">{currentTime}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Data Sources Section */}
        <div className="space-y-6">
          <DataSourcesTab />
        </div>
        
        {/* Report Center Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Space Weather Reports Center
            </CardTitle>
            <CardDescription>
              Generate, manage, and analyze comprehensive space weather reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Access our comprehensive reports center to:
            </p>
            <ul className="space-y-2 mb-6 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">•</span>
                Generate AI-powered space weather reports
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">•</span>
                View and manage report history
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-500">•</span>
                Access report templates and scheduling
              </li>
              <li className="flex items-center gap-2">
                <span className="text-orange-500">•</span>
                Export reports in multiple formats
              </li>
            </ul>
            <Link href="/swx-reports">
              <Button className="w-full sm:w-auto">
                Go to Reports Center
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}