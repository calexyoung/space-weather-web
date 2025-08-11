'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  MessageSquare, 
  Bot, 
  User, 
  Loader, 
  Download, 
  Copy,
  RefreshCw,
  Database,
  FileText,
  Clock,
  Zap
} from 'lucide-react'
import { ChatMessage, LlmProviderEnum } from '@/lib/types/space-weather'

interface ChatInterfaceProps {
  conversationId?: string
  reportId?: string
  onReportGenerated?: (report: any) => void
  className?: string
}

interface DisplayMessage extends ChatMessage {
  isStreaming?: boolean
  functionCalls?: Array<{
    name: string
    status: 'calling' | 'complete' | 'error'
    description: string
  }>
}

export default function ChatInterface({
  conversationId,
  reportId,
  onReportGenerated,
  className = ''
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI space weather assistant. I can help you:

• Generate comprehensive space weather reports
• Analyze current solar and geomagnetic conditions
• Explain space weather phenomena and impacts
• Customize reports for specific audiences
• Answer questions about space weather data

What would you like to work on today?`,
      timestamp: new Date()
    }
  ])
  
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)
    setIsStreaming(true)

    try {
      // First check if chat service is properly configured
      const statusResponse = await fetch('/api/chat/status')
      if (statusResponse.ok) {
        const status = await statusResponse.json()
        if (status.recommendations?.error) {
          throw new Error(status.recommendations.error)
        }
        if (status.recommendations?.warning) {
          console.warn('Chat configuration warning:', status.recommendations.warning)
        }
      }
      // Add typing indicator
      const typingMessage: DisplayMessage = {
        id: 'typing',
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, typingMessage])

      // Call streaming chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          conversationId,
          reportId,
          streaming: true,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        let errorMessage = 'Failed to send message'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      let assistantResponse = ''
      const assistantMessageId = Date.now().toString()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = new TextDecoder().decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'chunk') {
                assistantResponse += data.content
                
                // Update the streaming message
                setMessages(prev => prev.map(msg => 
                  msg.id === 'typing' 
                    ? {
                        ...msg,
                        id: assistantMessageId,
                        content: assistantResponse,
                        isStreaming: true
                      }
                    : msg
                ))
              } else if (data.type === 'function_call') {
                // Handle function calls
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId || msg.id === 'typing'
                    ? {
                        ...msg,
                        functionCalls: [
                          ...(msg.functionCalls || []),
                          {
                            name: data.function,
                            status: 'calling',
                            description: data.description || `Calling ${data.function}`
                          }
                        ]
                      }
                    : msg
                ))
              } else if (data.type === 'complete') {
                // Streaming complete
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId || msg.id === 'typing'
                    ? {
                        ...msg,
                        id: assistantMessageId,
                        content: data.fullContent || assistantResponse,
                        isStreaming: false,
                        timestamp: new Date()
                      }
                    : msg
                ))
                
                // If a report was generated, notify parent
                if (data.reportGenerated && onReportGenerated) {
                  onReportGenerated(data.report)
                }
                break
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      
      // Remove typing indicator and add error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setMessages(prev => prev.filter(msg => msg.id !== 'typing').concat({
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ Error: ${errorMessage}. Please check your API configuration and try again.`,
        timestamp: new Date()
      }))
    } finally {
      setIsTyping(false)
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const exportChat = () => {
    const chatText = messages
      .filter(msg => msg.id !== 'typing')
      .map(msg => `${msg.role === 'user' ? 'You' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')
    
    const blob = new Blob([chatText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `space-weather-chat-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearChat = () => {
    setMessages([messages[0]]) // Keep welcome message
  }

  const getFunctionIcon = (functionName: string) => {
    switch (functionName.toLowerCase()) {
      case 'fetch_data':
      case 'get_sources':
        return <Database className="w-4 h-4" />
      case 'generate_report':
      case 'compose_report':
        return <FileText className="w-4 h-4" />
      case 'analyze_conditions':
        return <Zap className="w-4 h-4" />
      default:
        return <RefreshCw className="w-4 h-4" />
    }
  }

  return (
    <div className={className}>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <span>AI Assistant</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={exportChat}
                disabled={messages.length <= 1}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                disabled={messages.length <= 1}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4 max-h-[500px]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}
                
                <div className={`max-w-[80%] ${
                  message.role === 'user' ? 'order-first' : ''
                }`}>
                  <div
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white ml-auto'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {/* Function Calls Display */}
                    {message.functionCalls && message.functionCalls.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {message.functionCalls.map((func, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-xs">
                            {getFunctionIcon(func.name)}
                            <span className={`${
                              func.status === 'calling' ? 'text-yellow-600' :
                              func.status === 'complete' ? 'text-green-600' :
                              'text-red-600'
                            }`}>
                              {func.description}
                            </span>
                            {func.status === 'calling' && (
                              <Loader className="w-3 h-3 animate-spin" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="whitespace-pre-wrap">
                      {message.content}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
                      )}
                    </div>
                  </div>
                  
                  <div className={`flex items-center mt-1 space-x-2 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    {message.timestamp && (
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    )}
                    
                    {message.role === 'assistant' && !message.isStreaming && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.content)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="border-t p-4 bg-gray-50">
            <div className="flex space-x-3">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about space weather or request a report..."
                  className="resize-none min-h-[60px] max-h-32"
                  disabled={isStreaming}
                />
              </div>
              
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isStreaming}
                className="self-end"
                size="sm"
              >
                {isStreaming ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("Generate a space weather report for today")}
                disabled={isStreaming}
                className="text-xs"
              >
                Generate Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("What are the current space weather conditions?")}
                disabled={isStreaming}
                className="text-xs"
              >
                Current Conditions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("Explain the impact of solar flares on technology")}
                disabled={isStreaming}
                className="text-xs"
              >
                Explain Impacts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}