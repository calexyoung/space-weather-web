'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  Settings, 
  Play, 
  Loader, 
  CheckCircle,
  AlertCircle,
  Zap,
  Brain,
  Target,
  Clock
} from 'lucide-react'
import { SourceTypeEnum, LlmProviderEnum, SpaceWeatherReport } from '@/lib/types/space-weather'
import { getSourceApiUrl } from '@/lib/utils/source-mapping'
import { AggregationService } from '@/lib/report-generator/aggregation-service'
import { exportService } from '@/lib/report-generator/export-service'
import { getAllTemplates, getTemplate } from '@/lib/templates/formats'

// Import the new components
import SourceSelector from './source-selector'
import ChatInterface from './chat-interface'
import ReportPreview from './report-preview'

interface GenerationStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'error'
  progress: number
  duration?: number
}

export default function ReportGeneratorTab() {
  // Core state
  const [selectedSources, setSelectedSources] = useState<SourceTypeEnum[]>(['NOAA_SWPC', 'UK_MET_OFFICE', 'BOM_SWS', 'SIDC_BELGIUM'])
  const [selectedProvider, setSelectedProvider] = useState<LlmProviderEnum>('OPENAI')
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [customInstructions, setCustomInstructions] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentReport, setCurrentReport] = useState<SpaceWeatherReport | null>(null)
  const [conversationId, setConversationId] = useState<string>()
  
  // Generation progress tracking
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    {
      id: 'fetch-data',
      name: 'Fetch Data Sources',
      description: 'Collecting space weather data from selected sources',
      status: 'pending',
      progress: 0
    },
    {
      id: 'process-data',
      name: 'Process & Validate',
      description: 'Analyzing and validating collected data',
      status: 'pending',
      progress: 0
    },
    {
      id: 'generate-content',
      name: 'Generate Report',
      description: 'Creating comprehensive report using AI',
      status: 'pending',
      progress: 0
    },
    {
      id: 'finalize',
      name: 'Finalize & Format',
      description: 'Formatting and preparing final output',
      status: 'pending',
      progress: 0
    }
  ])

  const [overallProgress, setOverallProgress] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>()
  
  // Template options - now includes social media
  const reportTemplates = getAllTemplates()
  
  const [selectedTemplate, setSelectedTemplate] = useState('standard')
  const [selectedExportFormat, setSelectedExportFormat] = useState<'md' | 'html' | 'pdf'>('md')
  
  const modelOptions = {
    OPENAI: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    ANTHROPIC: ['claude-3-5-sonnet-20241022', 'claude-3-haiku'],
    GOOGLE: ['gemini-1.5-flash', 'gemini-1.5-pro']
  }

  // Generation logic
  const updateStepStatus = useCallback((stepId: string, status: GenerationStep['status'], progress: number = 0, duration?: number) => {
    setGenerationSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, progress, duration }
        : step
    ))
    
    // Update overall progress
    setGenerationSteps(current => {
      const totalSteps = current.length
      const completedSteps = current.filter(s => s.status === 'completed').length
      const activeProgress = current.find(s => s.status === 'active')?.progress || 0
      const newProgress = ((completedSteps * 100) + activeProgress) / totalSteps
      setOverallProgress(newProgress)
      return current
    })
  }, [])

  const generateReport = async () => {
    if (selectedSources.length === 0) {
      alert('Please select at least one data source')
      return
    }
    
    setIsGenerating(true)
    setOverallProgress(0)
    
    // Reset steps
    setGenerationSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending',
      progress: 0,
      duration: undefined
    })))
    
    const startTime = Date.now()
    
    try {
      // Step 1: Fetch data sources
      updateStepStatus('fetch-data', 'active', 0)
      
      const fetchPromises = selectedSources.map(async (source, index) => {
        const response = await fetch(getSourceApiUrl(source), {
          method: 'GET'
        })
        
        updateStepStatus('fetch-data', 'active', ((index + 1) / selectedSources.length) * 100)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to fetch ${source}:`, response.status, errorText)
          throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`)
        }
        
        return response.json()
      })
      
      const fetchedData = await Promise.all(fetchPromises)
      updateStepStatus('fetch-data', 'completed', 100, Date.now() - startTime)
      
      // Step 2: Process data
      updateStepStatus('process-data', 'active', 25)
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate processing
      updateStepStatus('process-data', 'active', 75)
      await new Promise(resolve => setTimeout(resolve, 500))
      updateStepStatus('process-data', 'completed', 100)
      
      // Step 3: Generate report content
      updateStepStatus('generate-content', 'active', 10)
      
      const generateResponse = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sources: selectedSources,
          templateId: selectedTemplate === 'custom' ? undefined : selectedTemplate,
          customInstructions: selectedTemplate === 'custom' ? customInstructions : undefined,
          provider: selectedProvider,
          model: selectedModel
        })
      })
      
      updateStepStatus('generate-content', 'active', 75)
      
      if (!generateResponse.ok) {
        const errorText = await generateResponse.text()
        console.error('Report generation failed:', errorText)
        throw new Error(`Failed to generate report: ${generateResponse.status} ${generateResponse.statusText}`)
      }
      
      const generatedReport = await generateResponse.json()
      updateStepStatus('generate-content', 'completed', 100)
      
      // Step 4: Finalize
      updateStepStatus('finalize', 'active', 50)
      await new Promise(resolve => setTimeout(resolve, 300))
      updateStepStatus('finalize', 'completed', 100)
      
      // Set the generated report
      setCurrentReport(generatedReport.data)
      setConversationId(generatedReport.conversationId)
      
    } catch (error) {
      console.error('Report generation failed:', error)
      
      // Mark current active step as error
      setGenerationSteps(prev => prev.map(step => 
        step.status === 'active' 
          ? { ...step, status: 'error' }
          : step
      ))
    } finally {
      setIsGenerating(false)
      setEstimatedTimeRemaining(undefined)
    }
  }
  
  const handleSourceRefresh = async (sourceId: SourceTypeEnum) => {
    // Implement source refresh logic
    const response = await fetch(getSourceApiUrl(sourceId), {
      method: 'POST', // Force refresh
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceRefresh: true })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to refresh ${sourceId}`)
    }
    
    return response.json()
  }
  
  const handleReportEdit = (newContent: string) => {
    if (!currentReport) return
    
    setCurrentReport({
      ...currentReport,
      markdownContent: newContent
    })
  }
  
  const handleReportExport = async (format: 'md' | 'html' | 'pdf' | 'json') => {
    if (!currentReport) return
    
    try {
      const result = await exportService.export(currentReport.markdownContent, {
        format: format === 'md' ? 'markdown' : format === 'json' ? 'json' : format,
        includeMetadata: true,
        includeStyles: format === 'html'
      })
      
      exportService.createDownload(result)
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Failed to export as ${format.toUpperCase()}`)
    }
  }
  
  const getStepIcon = (status: GenerationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'active':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Report Generator</h2>
        <p className="text-gray-600">
          Generate comprehensive space weather reports using AI-powered analysis
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Configuration Panel */}
        <div className="xl:col-span-1 space-y-6">
          {/* Data Source Selection */}
          <SourceSelector
            selectedSources={selectedSources}
            onSelectionChange={setSelectedSources}
            onRefresh={handleSourceRefresh}
          />
          
          {/* LLM Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <span>AI Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure the AI model and generation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">LLM Provider</label>
                <Select value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as LlmProviderEnum)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPENAI">OpenAI</SelectItem>
                    <SelectItem value="ANTHROPIC">Anthropic</SelectItem>
                    <SelectItem value="GOOGLE">Google</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Model</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions[selectedProvider].map(model => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Report Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 mt-1">
                  {reportTemplates.find(t => t.id === selectedTemplate)?.description}
                </p>
              </div>
              
              {selectedTemplate === 'custom' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Custom Instructions</label>
                  <Textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Enter specific instructions for the report generation..."
                    className="min-h-[100px]"
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Generation Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-500" />
                <span>Generate Report</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="space-y-4">
                  {/* Overall Progress */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Generating Report...</span>
                      <span className="text-sm text-gray-600">{Math.round(overallProgress)}%</span>
                    </div>
                    <Progress value={overallProgress} />
                    {estimatedTimeRemaining && (
                      <p className="text-xs text-gray-600 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        ~{Math.ceil(estimatedTimeRemaining / 1000)}s remaining
                      </p>
                    )}
                  </div>
                  
                  {/* Step Progress */}
                  <div className="space-y-2">
                    {generationSteps.map(step => (
                      <div key={step.id} className="flex items-center space-x-2 text-sm">
                        {getStepIcon(step.status)}
                        <span className={`flex-1 ${
                          step.status === 'active' ? 'text-blue-600 font-medium' :
                          step.status === 'completed' ? 'text-green-600' :
                          step.status === 'error' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {step.name}
                        </span>
                        {step.duration && (
                          <span className="text-xs text-gray-500">
                            {(step.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={generateReport} 
                  disabled={selectedSources.length === 0}
                  className="w-full"
                  size="lg"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="xl:col-span-2 space-y-6">
          {/* Chat Interface */}
          <ChatInterface
            conversationId={conversationId}
            reportId={currentReport?.id}
            onReportGenerated={setCurrentReport}
          />
          
          {/* Report Preview */}
          <ReportPreview
            report={currentReport}
            isGenerating={isGenerating}
            onEdit={handleReportEdit}
            onExport={handleReportExport}
          />
        </div>
      </div>
    </div>
  )
}