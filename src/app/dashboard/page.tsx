'use client'

import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Satellite, AlertTriangle, Globe, Zap, Activity, Database, FileText, Settings, Clock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import CurrentStatusTab from '@/components/dashboard/current-status-tab'
import DataSourcesTab from '@/components/dashboard/data-sources-tab'
import ReportGeneratorTab from '@/components/dashboard/report-generator-tab'
import ReportsHistoryTab from '@/components/dashboard/reports-history-tab'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('current-status')
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
                Real-time space weather monitoring and automated report generation
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-white shadow-sm">
            <TabsTrigger 
              value="current-status" 
              className="flex items-center gap-2 data-[state=active]:bg-nasa-blue data-[state=active]:text-white"
            >
              <Activity className="w-4 h-4" />
              Current Status
            </TabsTrigger>
            <TabsTrigger 
              value="data-sources" 
              className="flex items-center gap-2 data-[state=active]:bg-nasa-blue data-[state=active]:text-white"
            >
              <Database className="w-4 h-4" />
              Data Sources
            </TabsTrigger>
            <TabsTrigger 
              value="report-generator" 
              className="flex items-center gap-2 data-[state=active]:bg-nasa-blue data-[state=active]:text-white"
            >
              <FileText className="w-4 h-4" />
              Report Generator
            </TabsTrigger>
            <TabsTrigger 
              value="reports-history" 
              className="flex items-center gap-2 data-[state=active]:bg-nasa-blue data-[state=active]:text-white"
            >
              <BarChart3 className="w-4 h-4" />
              Reports History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current-status" className="space-y-6">
            <CurrentStatusTab />
          </TabsContent>

          <TabsContent value="data-sources" className="space-y-6">
            <DataSourcesTab />
          </TabsContent>

          <TabsContent value="report-generator" className="space-y-6">
            <ReportGeneratorTab />
          </TabsContent>

          <TabsContent value="reports-history" className="space-y-6">
            <ReportsHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}