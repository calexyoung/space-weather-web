'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Pagination } from '@/components/ui/pagination'
import { 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Calendar, 
  Clock, 
  BarChart3, 
  Search, 
  Filter, 
  RefreshCw,
  ChevronDown,
  MoreVertical,
  Settings,
  Archive,
  History,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

interface ReportHistoryItem {
  id: string
  combinedHeadline: string
  generatedAt: string
  updatedAt: string
  status: 'COMPLETED' | 'FAILED' | 'GENERATING' | 'DRAFT' | 'ARCHIVED'
  llmProvider: string | null
  llmModel: string | null
  wordCount: number | null
  readingTime: number | null
  viewCount: number
  downloadCount: number
  version: number
  sources: Array<{
    id: string
    source: string
    headline: string
  }>
  template: {
    id: string
    name: string
  } | null
  _count: {
    exports: number
    versions: number
  }
}

interface FilterState {
  status: string
  llmProvider: string
  dateFrom: string
  dateTo: string
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface PaginationState {
  page: number
  limit: number
  total: number
  pages: number
}

export default function ReportsHistoryTab() {
  const [reports, setReports] = useState<ReportHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    status: '',
    llmProvider: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    sortBy: 'generatedAt',
    sortOrder: 'desc'
  })

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  // Fetch reports from API
  const fetchReports = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    if (!showLoading) setRefreshing(true)
    
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })

      if (filters.status) params.append('status', filters.status)
      if (filters.llmProvider) params.append('llmProvider', filters.llmProvider)
      if (filters.search) params.append('search', filters.search)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const response = await fetch(`/api/reports?${params}`)
      const data = await response.json()

      if (data.success) {
        setReports(data.data)
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages
        }))
      } else {
        console.error('Failed to fetch reports:', data.error)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [pagination.page, pagination.limit, filters])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReports(new Set(reports.map(r => r.id)))
    } else {
      setSelectedReports(new Set())
    }
  }

  const handleSelectReport = (reportId: string, checked: boolean) => {
    const newSelected = new Set(selectedReports)
    if (checked) {
      newSelected.add(reportId)
    } else {
      newSelected.delete(reportId)
    }
    setSelectedReports(newSelected)
  }

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedReports.size === 0) return

    setBulkActionLoading(true)
    try {
      const response = await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reportIds: Array.from(selectedReports)
        })
      })

      const data = await response.json()
      if (data.success) {
        setSelectedReports(new Set())
        await fetchReports(false)
      }
    } catch (error) {
      console.error('Bulk action error:', error)
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Handle individual actions
  const handleView = (reportId: string) => {
    window.open(`/reports/${reportId}`, '_blank')
  }

  const handleDownload = async (reportId: string, format = 'MARKDOWN') => {
    try {
      const response = await fetch(`/api/reports/${reportId}/export?format=${format}&download=true`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || `report-${reportId}.${format.toLowerCase()}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        // Refresh to update download count
        fetchReports(false)
      }
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const handleDelete = async (reportId: string) => {
    if (confirm('Are you sure you want to delete this report?')) {
      try {
        const response = await fetch(`/api/reports/${reportId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          await fetchReports(false)
        }
      } catch (error) {
        console.error('Delete error:', error)
      }
    }
  }

  const getStatusBadge = (status: ReportHistoryItem['status']) => {
    const config = {
      COMPLETED: { icon: CheckCircle2, className: 'bg-green-100 text-green-800', label: 'Completed' },
      FAILED: { icon: XCircle, className: 'bg-red-100 text-red-800', label: 'Failed' },
      GENERATING: { icon: Loader2, className: 'bg-yellow-100 text-yellow-800', label: 'Generating' },
      DRAFT: { icon: FileText, className: 'bg-gray-100 text-gray-800', label: 'Draft' },
      ARCHIVED: { icon: Archive, className: 'bg-blue-100 text-blue-800', label: 'Archived' }
    }
    
    const { icon: Icon, className, label } = config[status]
    return (
      <Badge className={`${className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    )
  }

  // Calculate summary stats
  const stats = {
    total: pagination.total,
    completed: reports.filter(r => r.status === 'COMPLETED').length,
    totalDownloads: reports.reduce((sum, r) => sum + (r.downloadCount || 0), 0),
    successRate: pagination.total > 0 ? Math.round((reports.filter(r => r.status === 'COMPLETED').length / reports.length) * 100) : 0
  }

  if (loading && reports.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports History</h2>
          <p className="text-gray-600">
            View, download, and manage your generated space weather reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchReports(false)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-gray-600 text-sm">Total Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-gray-600 text-sm">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Download className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.totalDownloads}</p>
                <p className="text-gray-600 text-sm">Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.successRate}%</p>
                <p className="text-gray-600 text-sm">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-6">
              <div>
                <label className="block text-sm font-medium mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search reports..."
                    className="pl-10"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="GENERATING">Generating</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Provider</label>
                <Select value={filters.llmProvider} onValueChange={(value) => handleFilterChange('llmProvider', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All providers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All providers</SelectItem>
                    <SelectItem value="OPENAI">OpenAI</SelectItem>
                    <SelectItem value="ANTHROPIC">Anthropic</SelectItem>
                    <SelectItem value="GOOGLE">Google</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">From Date</label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">To Date</label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Sort By</label>
                <Select value={`${filters.sortBy}-${filters.sortOrder}`} onValueChange={(value) => {
                  const [sortBy, sortOrder] = value.split('-')
                  handleFilterChange('sortBy', sortBy)
                  handleFilterChange('sortOrder', sortOrder)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generatedAt-desc">Newest first</SelectItem>
                    <SelectItem value="generatedAt-asc">Oldest first</SelectItem>
                    <SelectItem value="viewCount-desc">Most viewed</SelectItem>
                    <SelectItem value="downloadCount-desc">Most downloaded</SelectItem>
                    <SelectItem value="updatedAt-desc">Recently updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedReports.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedReports.size} report{selectedReports.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  disabled={bulkActionLoading}
                >
                  {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('archive')}
                  disabled={bulkActionLoading}
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      <div className="space-y-4">
        {reports.length === 0 && !loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-600 mb-4">
                  {filters.search || filters.status || filters.llmProvider
                    ? 'Try adjusting your filters to see more results'
                    : 'Generate your first space weather report to see it here'
                  }
                </p>
                {!(filters.search || filters.status || filters.llmProvider) && (
                  <Button>Generate First Report</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Header row */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center">
                  <Checkbox
                    checked={selectedReports.size === reports.length && reports.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="ml-4 font-medium">Select all</span>
                </div>
              </CardContent>
            </Card>

            {/* Report rows */}
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <Checkbox
                        checked={selectedReports.has(report.id)}
                        onCheckedChange={(checked) => handleSelectReport(report.id, checked)}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {report.combinedHeadline}
                          </h3>
                          {getStatusBadge(report.status)}
                          {report.version > 1 && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <History className="w-3 h-3" />
                              v{report.version}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid gap-2 md:grid-cols-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{format(new Date(report.generatedAt), 'PPp')}</span>
                          </div>
                          
                          <div>
                            <span className="font-medium">Provider:</span> {report.llmProvider || 'Unknown'}
                          </div>
                          
                          <div>
                            <span className="font-medium">Sources:</span> {report.sources?.length || 0}
                          </div>
                          
                          <div>
                            <span className="font-medium">Words:</span> {report.wordCount?.toLocaleString() || 'Unknown'}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {report.viewCount > 0 && (
                            <span>{report.viewCount} view{report.viewCount !== 1 ? 's' : ''}</span>
                          )}
                          {report.downloadCount > 0 && (
                            <span>{report.downloadCount} download{report.downloadCount !== 1 ? 's' : ''}</span>
                          )}
                          {report._count.exports > 0 && (
                            <span>{report._count.exports} export{report._count.exports !== 1 ? 's' : ''}</span>
                          )}
                          <span>{formatDistanceToNow(new Date(report.updatedAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {report.status === 'COMPLETED' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(report.id)}
                            title="View report"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <div className="relative group">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(report.id)}
                              title="Download as Markdown"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reports
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  )
}