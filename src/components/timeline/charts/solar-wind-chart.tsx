'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { format } from 'date-fns'

interface SolarWindChartProps {
  data: Array<{
    time: string
    timestamp: number
    speed: number | null
    density: number | null
    temperature?: number | null
    displayTime: string
  }>
  height?: number
}

// Speed thresholds (km/s)
const SPEED_THRESHOLDS = {
  NORMAL: 400,
  ELEVATED: 500,
  HIGH: 600,
  VERY_HIGH: 700,
  EXTREME: 800
}

export function SolarWindChart({ data, height = 400 }: SolarWindChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const time = payload[0]?.payload?.time
      const formattedTime = time ? format(new Date(time), 'MMM dd, HH:mm:ss') : label
      
      const speed = payload.find((p: any) => p.dataKey === 'speed')?.value
      const speedStatus = getSpeedStatus(speed)
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold mb-1">{formattedTime}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null || entry.value === undefined) return null
            
            const value = entry.value
            let unit = ''
            let formattedValue = value.toFixed(1)
            
            if (entry.dataKey === 'speed') {
              unit = ' km/s'
            } else if (entry.dataKey === 'density') {
              unit = ' p/cm³'
            } else if (entry.dataKey === 'temperature') {
              unit = ' K'
              formattedValue = value.toExponential(2)
            }
            
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {formatFieldName(entry.name)}: {formattedValue}{unit}
                {entry.dataKey === 'speed' && speedStatus && (
                  <span className={`ml-1 font-semibold ${getSpeedColor(speed)}`}>
                    ({speedStatus})
                  </span>
                )}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  // Format field names for display
  const formatFieldName = (name: string) => {
    switch (name) {
      case 'speed': return 'Speed'
      case 'density': return 'Density'
      case 'temperature': return 'Temperature'
      default: return name
    }
  }

  // Get speed status
  const getSpeedStatus = (speed: number | null) => {
    if (speed === null) return null
    if (speed >= SPEED_THRESHOLDS.EXTREME) return 'Extreme'
    if (speed >= SPEED_THRESHOLDS.VERY_HIGH) return 'Very High'
    if (speed >= SPEED_THRESHOLDS.HIGH) return 'High'
    if (speed >= SPEED_THRESHOLDS.ELEVATED) return 'Elevated'
    if (speed >= SPEED_THRESHOLDS.NORMAL) return 'Normal'
    return 'Low'
  }

  // Get speed color class
  const getSpeedColor = (speed: number | null) => {
    if (speed === null) return ''
    if (speed >= SPEED_THRESHOLDS.VERY_HIGH) return 'text-red-500'
    if (speed >= SPEED_THRESHOLDS.HIGH) return 'text-orange-500'
    if (speed >= SPEED_THRESHOLDS.ELEVATED) return 'text-yellow-500'
    return 'text-green-500'
  }

  // Calculate Y-axis domain for speed
  const speedValues = data.map(d => d.speed).filter(v => v !== null) as number[]
  const maxSpeed = Math.max(...speedValues, 800)
  const speedDomain = [200, Math.ceil(maxSpeed / 100) * 100]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Solar Wind Speed</h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          
          <XAxis
            dataKey="displayTime"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          
          <YAxis
            domain={speedDomain}
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'Speed (km/s)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            formatter={formatFieldName}
          />
          
          {/* Reference lines for speed thresholds */}
          <ReferenceLine
            y={SPEED_THRESHOLDS.NORMAL}
            stroke="#22c55e"
            strokeDasharray="5 5"
            label={{ value: "400 km/s (Normal)", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={SPEED_THRESHOLDS.ELEVATED}
            stroke="#eab308"
            strokeDasharray="5 5"
            label={{ value: "500 km/s (Elevated)", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={SPEED_THRESHOLDS.HIGH}
            stroke="#f97316"
            strokeDasharray="5 5"
            label={{ value: "600 km/s (High)", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={SPEED_THRESHOLDS.VERY_HIGH}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: "700 km/s (Very High)", position: "right", fontSize: 10 }}
          />
          
          {/* Solar wind speed line */}
          <Line
            type="monotone"
            dataKey="speed"
            stroke="#FF0000"
            name="speed"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Data: ACE/DSCOVR Solar Wind Plasma • Measured at L1 Lagrange point (~1.5 million km from Earth)
        </div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span>&lt;500 km/s: Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span>500-600 km/s: Elevated</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span>600-700 km/s: High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>&gt;700 km/s: Very High</span>
          </div>
        </div>
      </div>
    </div>
  )
}