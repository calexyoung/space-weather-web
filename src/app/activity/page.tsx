'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Clock, TrendingUp } from 'lucide-react'

// Dynamically import the ActivityDashboard component with no SSR
const ActivityDashboard = dynamic(
  () => import('@/components/activity/activity-dashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Current Activity</h1>
            <p className="text-gray-600 mt-2">
              Loading activity dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }
)

// Dynamically import Timeline component
const TimelineContent = dynamic(
  () => import('@/components/timeline/timeline-content'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    )
  }
)

// Dynamically import Long-term Activity component
const LongTermActivityContent = dynamic(
  () => import('@/components/long-term-activity/long-term-activity-content'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-600">Loading long-term activity...</p>
        </div>
      </div>
    )
  }
)

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState('current-activity')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="current-activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Current Activity
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="long-term" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Long-term Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current-activity" className="mt-0">
            <ActivityDashboard />
          </TabsContent>

          <TabsContent value="timeline" className="mt-0">
            <TimelineContent />
          </TabsContent>

          <TabsContent value="long-term" className="mt-0">
            <LongTermActivityContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}