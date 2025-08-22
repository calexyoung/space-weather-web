'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText,
  Download,
  Printer,
  Copy,
  Edit,
  Eye,
  Code,
  History,
  Share2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { SpaceWeatherReport } from '@/lib/types/space-weather'

interface ReportPreviewProps {
  report?: SpaceWeatherReport | null
  isGenerating?: boolean
  onEdit?: (content: string) => void
  onExport?: (format: 'md' | 'html' | 'pdf' | 'json') => void
  className?: string
}

export default function ReportPreview({
  report,
  isGenerating = false,
  onEdit,
  onExport,
  className = ''
}: ReportPreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'markdown' | 'html'>('preview')
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [readingTime, setReadingTime] = useState(0)

  useEffect(() => {
    if (report?.markdownContent) {
      setEditContent(report.markdownContent)
      const words = report.markdownContent.split(/\s+/).length
      setWordCount(words)
      setReadingTime(Math.ceil(words / 200)) // Assume 200 words per minute
    }
  }, [report])

  const handleSaveEdit = () => {
    if (onEdit && editContent !== report?.markdownContent) {
      onEdit(editContent)
    }
    setIsEditing(false)
  }

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleExport = (format: 'md' | 'html' | 'pdf' | 'json') => {
    if (onExport) {
      onExport(format)
    }
  }

  const renderMarkdownAsHTML = (markdown: string) => {
    // Simple markdown to HTML conversion for preview
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>')
  }

  if (isGenerating) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-500 animate-pulse" />
              <span>Generating Report...</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!report) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-400" />
              <span>Report Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Available</h3>
              <p className="text-gray-600 mb-4">
                Generate a space weather report to see the preview here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-500" />
              <span>Report Preview</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {/* Report Stats */}
              <Badge variant="outline" className="text-xs">
                {wordCount} words
              </Badge>
              <Badge variant="outline" className="text-xs">
                {readingTime} min read
              </Badge>
              
              {/* Actions */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8"
              >
                {isEditing ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.print()}
                className="h-8"
              >
                <Printer className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyContent(report.markdownContent)}
                className="h-8"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Report Metadata */}
          {report.generatedAt && (
            <div className="flex items-center space-x-4 text-sm text-gray-600 pt-2">
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Generated {new Date(report.generatedAt).toLocaleString()}</span>
              </div>
              
              {report.llmProvider && (
                <Badge variant="outline" className="text-xs">
                  {report.llmProvider} {report.llmModel && `(${report.llmModel})`}
                </Badge>
              )}
              
              {report.generationTime && (
                <span className="text-xs">
                  {report.generationTime.toFixed(1)}s generation
                </span>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview" className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </TabsTrigger>
              <TabsTrigger value="markdown" className="flex items-center space-x-1">
                <Edit className="w-4 h-4" />
                <span>Markdown</span>
              </TabsTrigger>
              <TabsTrigger value="html" className="flex items-center space-x-1">
                <Code className="w-4 h-4" />
                <span>HTML</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="mt-4">
              <div className="prose max-w-none">
                <div 
                  className="space-y-4 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownAsHTML(report.markdownContent)
                  }}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="markdown" className="mt-4">
              {isEditing ? (
                <div className="space-y-4">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[400px] font-mono text-sm"
                    placeholder="Edit markdown content..."
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditContent(report.markdownContent)
                        setIsEditing(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={editContent === report.markdownContent}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                    {report.markdownContent}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyContent(report.markdownContent)}
                    className="absolute top-2 right-2"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="html" className="mt-4">
              <div className="relative">
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-96">
                  {report.htmlContent}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyContent(report.htmlContent)}
                  className="absolute top-2 right-2"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Export Options */}
          <div className="flex justify-center space-x-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('md')}
              className="flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Markdown</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('html')}
              className="flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>HTML</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              className="flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>JSON</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              className="flex items-center space-x-1"
              disabled
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {}}
              className="flex items-center space-x-1"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}