'use client'

import React, { useState, useEffect } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Download, RefreshCw, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface SolarFlare {
  id: string
  classType: string
  beginTime: string
  peakTime: string | null
  endTime: string | null
  duration: number | null
  sourceLocation: string
  activeRegionNum: number | null
  intensity: string
  potentialImpact: string
  linkedEvents?: Array<{ activityID: string }>
  instruments?: Array<{ displayName: string }>
  source?: 'DONKI' | 'NOAA'
  observatory?: string
  instrument?: string
}

interface SolarFlareTableProps {
  dateRange: string
}

export default function SolarFlareTable({ dateRange }: SolarFlareTableProps) {
  const [flares, setFlares] = useState<SolarFlare[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSolarFlares()
  }, [dateRange])

  const fetchSolarFlares = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/donki/solar-flares?dateRange=${dateRange}`)
      const result = await response.json()
      
      if (result.success) {
        console.log('Solar flares data received:', result)
        console.log('Data sources:', result.sources)
        console.log('Total flares:', result.count)
        setFlares(result.data)
      } else {
        setError(result.error || 'Failed to fetch solar flares')
      }
    } catch (err) {
      setError('Error fetching solar flare data')
      console.error('Error fetching solar flares:', err)
    } finally {
      setLoading(false)
    }
  }

  const getFlareClassColor = (classType: string) => {
    if (!classType) return 'bg-gray-100 text-gray-800'
    const firstChar = classType[0].toUpperCase()
    
    switch(firstChar) {
      case 'X': return 'bg-red-600 text-white'
      case 'M': return 'bg-orange-500 text-white'
      case 'C': return 'bg-yellow-500 text-black'
      case 'B': return 'bg-blue-400 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }

  const getIntensityColor = (intensity: string) => {
    switch(intensity) {
      case 'Extreme': return 'text-red-700 font-bold'
      case 'Very Severe': return 'text-red-600 font-semibold'
      case 'Severe': return 'text-red-500 font-semibold'
      case 'Strong': return 'text-orange-600 font-medium'
      case 'Moderate': return 'text-orange-500'
      case 'Common': return 'text-yellow-600'
      case 'Minor': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'N/A'
    const date = new Date(timeString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: false
    }) + ' UTC'
  }

  const formatDuration = (minutes: number | null) => {
    if (minutes === null) return 'N/A'
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const exportToCSV = () => {
    const headers = ['Class', 'Begin Time', 'Peak Time', 'End Time', 'Duration', 'Location', 'Active Region', 'Intensity', 'Impact']
    const rows = flares.map(flare => [
      flare.classType,
      flare.beginTime,
      flare.peakTime || 'N/A',
      flare.endTime || 'N/A',
      flare.duration ? `${flare.duration} min` : 'N/A',
      flare.sourceLocation,
      flare.activeRegionNum || 'N/A',
      flare.intensity,
      flare.potentialImpact
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `solar_flares_${dateRange}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading solar flare data...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <span className="ml-2 text-red-600">{error}</span>
          <Button onClick={fetchSolarFlares} className="ml-4" variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Solar Flares (DONKI + NOAA)</CardTitle>
            <CardDescription>
              {flares.length} flares detected in the last {dateRange}
              {flares.length > 0 && (
                <span className="ml-2">
                  (DONKI: {flares.filter(f => f.source === 'DONKI').length}, 
                   NOAA: {flares.filter(f => f.source === 'NOAA').length})
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchSolarFlares} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Peak Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>AR</TableHead>
                <TableHead>Intensity</TableHead>
                <TableHead className="min-w-[200px]">Potential Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flares.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    No solar flares detected in the selected time range
                  </TableCell>
                </TableRow>
              ) : (
                flares.map((flare) => (
                  <TableRow key={flare.id}>
                    <TableCell>
                      <Badge variant={flare.source === 'DONKI' ? 'default' : 'secondary'}>
                        {flare.source || 'DONKI'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getFlareClassColor(flare.classType)}>
                        {flare.classType}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatTime(flare.beginTime)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatTime(flare.peakTime)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatTime(flare.endTime)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDuration(flare.duration)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {flare.sourceLocation}
                    </TableCell>
                    <TableCell>
                      {flare.activeRegionNum || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={getIntensityColor(flare.intensity)}>
                        {flare.intensity}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {flare.potentialImpact}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {flares.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>Class Legend:</span>
              <div className="flex gap-2">
                <Badge className="bg-red-600 text-white">X: Extreme</Badge>
                <Badge className="bg-orange-500 text-white">M: Medium</Badge>
                <Badge className="bg-yellow-500 text-black">C: Common</Badge>
                <Badge className="bg-blue-400 text-white">B: Small</Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}