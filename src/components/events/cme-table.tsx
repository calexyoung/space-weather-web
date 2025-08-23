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
import { Loader2, Download, RefreshCw, AlertCircle, Globe, Rocket, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

interface CME {
  id: string
  startTime: string
  sourceLocation: string
  activeRegionNum: number | null
  speed: number | null
  longitude: number | null
  latitude: number | null
  halfAngle: number | null
  width: number | null
  classification: string
  estimatedArrival: {
    arrivalTime: string | null
    transitTime: number | null
    probability: string
  }
  potentialImpact: {
    earthImpact: string
    otherTargets: string[]
    severity: string
  }
  wsaEnlilTargets?: Array<{
    location: string
    arrivalTime: string
  }>
  analysisType: string
  time21_5: string | null
  linkedEvents: Array<{ activityID: string }>
  instruments: Array<{ displayName: string }>
  catalog: string
  note?: string
  link?: string
}

interface CMETableProps {
  dateRange: string
}

export default function CMETable({ dateRange }: CMETableProps) {
  const [cmes, setCMEs] = useState<CME[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCMEs()
  }, [dateRange])

  const fetchCMEs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/donki/cmes?dateRange=${dateRange}`)
      const result = await response.json()
      
      if (result.success) {
        setCMEs(result.data)
      } else {
        setError(result.error || 'Failed to fetch CMEs')
      }
    } catch (err) {
      setError('Error fetching CME data')
      console.error('Error fetching CMEs:', err)
    } finally {
      setLoading(false)
    }
  }

  const getClassificationColor = (classification: string) => {
    switch(classification) {
      case 'Extreme': return 'bg-purple-600 text-white'
      case 'Fast': return 'bg-red-600 text-white'
      case 'Moderate-Fast': return 'bg-orange-600 text-white'
      case 'Moderate': return 'bg-yellow-600 text-white'
      case 'Slow': return 'bg-blue-500 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'Extreme': return 'text-red-700 font-bold'
      case 'Severe': return 'text-red-600 font-semibold'
      case 'Strong': return 'text-orange-600 font-semibold'
      case 'Moderate': return 'text-yellow-600 font-medium'
      case 'Minor to Moderate': return 'text-yellow-500'
      case 'Minor': return 'text-blue-500'
      case 'Minimal': return 'text-green-500'
      default: return 'text-gray-500'
    }
  }

  const getProbabilityColor = (probability: string) => {
    switch(probability) {
      case 'High': return 'bg-red-100 text-red-800'
      case 'Moderate': return 'bg-orange-100 text-orange-800'
      case 'Low': return 'bg-yellow-100 text-yellow-800'
      case 'Very Low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-600'
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

  const formatTransitTime = (hours: number | null) => {
    if (hours === null) return 'N/A'
    if (hours < 24) return `${Math.round(hours)}h`
    const days = Math.floor(hours / 24)
    const remainingHours = Math.round(hours % 24)
    return `${days}d ${remainingHours}h`
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Start Time', 'Speed (km/s)', 'Longitude', 'Latitude', 'Width', 'Classification', 'Earth Impact', 'Arrival Time', 'Transit Time', 'Other Targets']
    const rows = cmes.map(cme => [
      cme.id,
      cme.startTime,
      cme.speed || 'N/A',
      cme.longitude !== null ? `${cme.longitude}°` : 'N/A',
      cme.latitude !== null ? `${cme.latitude}°` : 'N/A',
      cme.width !== null ? `${cme.width}°` : 'N/A',
      cme.classification,
      cme.potentialImpact.earthImpact,
      cme.estimatedArrival.arrivalTime ? formatTime(cme.estimatedArrival.arrivalTime) : 'N/A',
      cme.estimatedArrival.transitTime ? formatTransitTime(cme.estimatedArrival.transitTime) : 'N/A',
      cme.potentialImpact.otherTargets.join('; ') || 'None'
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cmes_${dateRange}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading CME data...</span>
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
          <Button onClick={fetchCMEs} className="ml-4" variant="outline" size="sm">
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
            <CardTitle>Coronal Mass Ejections (CMEs)</CardTitle>
            <CardDescription>
              {cmes.length} CMEs detected in the last {dateRange}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchCMEs} variant="outline" size="sm">
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
                <TableHead>Time</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Long.</TableHead>
                <TableHead>Lat.</TableHead>
                <TableHead>Width</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Earth Impact</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Other Targets</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cmes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    No CMEs detected in the selected time range
                  </TableCell>
                </TableRow>
              ) : (
                cmes.map((cme) => (
                  <TableRow key={cme.id}>
                    <TableCell className="whitespace-nowrap">
                      {cme.link ? (
                        <a 
                          href={cme.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          <div>
                            <div className="font-medium text-blue-600 hover:text-blue-800">{formatTime(cme.startTime)}</div>
                            <div className="text-xs text-gray-500">{cme.id.substring(0, 15)}...</div>
                          </div>
                        </a>
                      ) : (
                        <div>
                          <div className="font-medium">{formatTime(cme.startTime)}</div>
                          <div className="text-xs text-gray-500">{cme.id.substring(0, 15)}...</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {cme.speed ? (
                        <div className="font-mono">
                          {Math.round(cme.speed)}
                          <span className="text-xs text-gray-500 ml-1">km/s</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cme.longitude !== null ? (
                        <span className="font-mono">{cme.longitude.toFixed(0)}°</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cme.latitude !== null ? (
                        <span className="font-mono">{cme.latitude.toFixed(0)}°</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cme.width !== null ? (
                        <span className="font-mono">{cme.width.toFixed(0)}°</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getClassificationColor(cme.classification)}>
                        {cme.classification}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          {cme.potentialImpact.earthImpact.includes('Direct') && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          {cme.potentialImpact.earthImpact.includes('Earth') && (
                            <Globe className="w-4 h-4 text-blue-500" />
                          )}
                          <span className={`text-xs ${getSeverityColor(cme.potentialImpact.severity)}`}>
                            {cme.potentialImpact.earthImpact}
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getProbabilityColor(cme.estimatedArrival.probability)}`}
                        >
                          {cme.estimatedArrival.probability} probability
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {cme.estimatedArrival.arrivalTime ? (
                        <div>
                          <div className="text-sm">{formatTime(cme.estimatedArrival.arrivalTime)}</div>
                          <div className="text-xs text-gray-500">
                            ~{formatTransitTime(cme.estimatedArrival.transitTime)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cme.wsaEnlilTargets && cme.wsaEnlilTargets.length > 0 ? (
                        <div className="space-y-1">
                          {cme.wsaEnlilTargets.slice(0, 2).map((target, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                <Rocket className="w-3 h-3 mr-1" />
                                {target.location}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatTime(target.arrivalTime)}
                              </span>
                            </div>
                          ))}
                          {cme.wsaEnlilTargets.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{cme.wsaEnlilTargets.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : cme.potentialImpact.otherTargets.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {cme.potentialImpact.otherTargets.slice(0, 2).map((target, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Rocket className="w-3 h-3 mr-1" />
                              {target}
                            </Badge>
                          ))}
                          {cme.potentialImpact.otherTargets.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{cme.potentialImpact.otherTargets.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>{cme.sourceLocation}</div>
                        {cme.activeRegionNum && (
                          <div className="text-gray-500">AR {cme.activeRegionNum}</div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {cmes.length > 0 && (
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>Speed Classification:</span>
              <div className="flex gap-2">
                <Badge className="bg-purple-600 text-white">Extreme (&gt;2000 km/s)</Badge>
                <Badge className="bg-red-600 text-white">Fast (&gt;1500 km/s)</Badge>
                <Badge className="bg-orange-600 text-white">Moderate-Fast (&gt;1000 km/s)</Badge>
                <Badge className="bg-yellow-600 text-white">Moderate (&gt;500 km/s)</Badge>
                <Badge className="bg-blue-500 text-white">Slow (&lt;500 km/s)</Badge>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Note: Earth arrival times and impact assessments are estimates based on CME speed and direction. 
              Actual impacts depend on magnetic field orientation and other factors.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}