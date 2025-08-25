'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Download, Calendar, Filter, Search, Eye, Clock, ChevronRight, FileJson, FileCode, FilePlus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

interface Report {
  id: string
  title: string
  type: string
  date: string
  status: 'published' | 'draft' | 'archived'
  author: string
  tags: string[]
  summary: string
}

export default function SWxReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading reports
    setTimeout(() => {
      setReports([
        {
          id: '1',
          title: 'Weekly Space Weather Summary - Week 34',
          type: 'weekly',
          date: '2024-08-24',
          status: 'published',
          author: 'AI Assistant',
          tags: ['solar-flares', 'geomagnetic', 'forecast'],
          summary: 'Moderate solar activity with M-class flares observed. G1 storm conditions reached.'
        },
        {
          id: '2',
          title: 'X1.2 Solar Flare Event Analysis',
          type: 'event',
          date: '2024-08-23',
          status: 'published',
          author: 'AI Assistant',
          tags: ['x-flare', 'cme', 'impact-analysis'],
          summary: 'Detailed analysis of X1.2 flare from Region 3421 including CME trajectory and Earth impact assessment.'
        },
        {
          id: '3',
          title: 'Monthly Space Weather Outlook - September 2024',
          type: 'monthly',
          date: '2024-08-22',
          status: 'draft',
          author: 'AI Assistant',
          tags: ['forecast', 'outlook', 'monthly'],
          summary: 'Extended forecast for September showing increased solar activity probability.'
        },
        {
          id: '4',
          title: 'Geomagnetic Storm Impact Report',
          type: 'impact',
          date: '2024-08-21',
          status: 'published',
          author: 'AI Assistant',
          tags: ['geomagnetic', 'impacts', 'infrastructure'],
          summary: 'Assessment of G2 storm impacts on satellite operations and power grid stability.'
        },
        {
          id: '5',
          title: 'Daily Space Weather Briefing',
          type: 'daily',
          date: '2024-08-20',
          status: 'published',
          author: 'AI Assistant',
          tags: ['daily', 'briefing', 'summary'],
          summary: 'Quiet conditions prevail with background X-ray flux at B-class levels.'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesFilter = filterType === 'all' || report.type === filterType
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return '📅'
      case 'weekly': return '📊'
      case 'monthly': return '📈'
      case 'event': return '⚡'
      case 'impact': return '🎯'
      default: return '📄'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SWx Reports</h1>
              <p className="text-gray-600 mt-2">
                Space weather reports, analyses, and forecasts
              </p>
            </div>
            <Link href="/dashboard?tab=report-generator">
              <Button className="flex items-center gap-2">
                <FilePlus className="w-4 h-4" />
                Generate New Report
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search reports by title, content, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="daily">Daily Briefing</SelectItem>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                  <SelectItem value="monthly">Monthly Outlook</SelectItem>
                  <SelectItem value="event">Event Analysis</SelectItem>
                  <SelectItem value="impact">Impact Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Report Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{reports.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {reports.filter(r => r.status === 'published').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {reports.filter(r => r.status === 'draft').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">3</p>
            </CardContent>
          </Card>
        </div>

        {/* Reports Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="recent">Recent Reports</TabsTrigger>
            <TabsTrigger value="templates">Report Templates</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">Loading reports...</p>
                </CardContent>
              </Card>
            ) : filteredReports.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No reports found matching your criteria.</p>
                </CardContent>
              </Card>
            ) : (
              filteredReports.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getTypeIcon(report.type)}</span>
                          <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                        </div>
                        <p className="text-gray-600 mb-3">{report.summary}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {report.date}
                          </span>
                          <span>By {report.author}</span>
                          <Badge className={getStatusColor(report.status)} variant="secondary">
                            {report.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          {report.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">Daily Briefing Template</CardTitle>
                  <CardDescription>Standard format for daily space weather summaries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary">Automated</Badge>
                      <Badge variant="outline">JSON</Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">Event Analysis Template</CardTitle>
                  <CardDescription>Detailed template for significant space weather events</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary">Manual</Badge>
                      <Badge variant="outline">Markdown</Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">Weekly Summary Template</CardTitle>
                  <CardDescription>Comprehensive weekly activity and forecast template</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary">Automated</Badge>
                      <Badge variant="outline">HTML</Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base">Impact Assessment Template</CardTitle>
                  <CardDescription>Template for technology and infrastructure impact reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary">Manual</Badge>
                      <Badge variant="outline">PDF</Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Report Generation</CardTitle>
                <CardDescription>Automated reports that run on a schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Daily Space Weather Briefing</h4>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Generates every day at 00:00 UTC</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Next run: Today 00:00 UTC
                    </span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Weekly Summary Report</h4>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Generates every Monday at 12:00 UTC</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Next run: Monday 12:00 UTC
                    </span>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4 opacity-60">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Monthly Outlook</h4>
                    <Badge className="bg-gray-100 text-gray-800">Paused</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">First day of each month at 15:00 UTC</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Paused since Aug 1, 2024
                    </span>
                    <Button variant="outline" size="sm">Resume</Button>
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