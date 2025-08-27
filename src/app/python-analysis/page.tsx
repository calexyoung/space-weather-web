'use client'

import React from 'react'
import { PythonAnalysisWidget } from '@/components/widgets/python-analysis-widget'

export default function PythonAnalysisPage() {
  const widgetConfig = {
    id: 'python-analysis',
    title: 'Python Analysis Engine',
    refreshInterval: 60000, // 1 minute
    isVisible: true,
    position: 0,
    expanded: false
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Python Analysis Engine</h1>
          <p className="text-gray-600 mt-2">
            Advanced solar and space weather analysis powered by Python backend
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <PythonAnalysisWidget config={widgetConfig} />
        </div>
      </div>
    </div>
  )
}