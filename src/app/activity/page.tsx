'use client'

import dynamic from 'next/dynamic'

// Dynamically import the ActivityDashboard component with no SSR
// This prevents the react-dnd library from being executed during build
const ActivityDashboard = dynamic(
  () => import('@/components/activity/activity-dashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Activity</h1>
            <p className="text-gray-600 mt-2">
              Loading activity dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }
)

export default function ActivityPage() {
  return <ActivityDashboard />
}