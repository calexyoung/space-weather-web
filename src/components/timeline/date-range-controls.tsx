'use client'

import React, { useState } from 'react'
import { Calendar, RefreshCw } from 'lucide-react'
import { format, subDays, subHours, subMonths } from 'date-fns'

interface DateRangeControlsProps {
  onDateRangeChange: (start: Date, end: Date) => void
  onRefresh: () => void
  isLoading?: boolean
}

export function DateRangeControls({ 
  onDateRangeChange, 
  onRefresh, 
  isLoading = false 
}: DateRangeControlsProps) {
  const [startDate, setStartDate] = useState(() => {
    const date = subDays(new Date(), 3)
    return format(date, 'yyyy-MM-dd')
  })
  
  const [endDate, setEndDate] = useState(() => {
    return format(new Date(), 'yyyy-MM-dd')
  })
  
  const [quickSelect, setQuickSelect] = useState('3d')

  const handleQuickSelect = (value: string) => {
    setQuickSelect(value)
    const now = new Date()
    let start: Date
    
    switch (value) {
      case '24h':
        start = subHours(now, 24)
        break
      case '3d':
        start = subDays(now, 3)
        break
      case '7d':
        start = subDays(now, 7)
        break
      case '1m':
        start = subMonths(now, 1)
        break
      default:
        start = subDays(now, 3)
    }
    
    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(now, 'yyyy-MM-dd'))
    onDateRangeChange(start, now)
  }

  const handleDateChange = () => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start > end) {
      alert('Start date must be before end date')
      return
    }
    
    onDateRangeChange(start, end)
  }

  const handleRefresh = () => {
    handleDateChange()
    onRefresh()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Date Range</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Quick Select Dropdown */}
          <select
            value={quickSelect}
            onChange={(e) => handleQuickSelect(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="3d">Last 3 Days</option>
            <option value="7d">Last Week</option>
            <option value="1m">Last Month</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {/* Date Inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setQuickSelect('custom')
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setQuickSelect('custom')
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Update Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Updating...' : 'Update'}
          </button>
        </div>
      </div>
      
      {/* Data Source Info */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Data sources: KNMI HAPI Server, NOAA SWPC • Updated every 5 minutes
      </div>
    </div>
  )
}