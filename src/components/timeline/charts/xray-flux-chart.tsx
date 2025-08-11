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

interface XrayFluxChartProps {
  data: Array<{
    time: string
    timestamp: number
    xray_flux_long: number | null
    xray_flux_short: number | null
    displayTime: string
  }>
  height?: number
}

// X-ray class thresholds (W/m²)
const XRAY_CLASSES = {
  X: 1e-4,
  M: 1e-5,
  C: 1e-6,
  B: 1e-7,
  A: 1e-8
}

export function XrayFluxChart({ data, height = 400 }: XrayFluxChartProps) {
  // Format Y-axis labels for logarithmic scale
  const formatYAxis = (value: number) => {
    if (value === 0) return '0'
    const exponent = Math.floor(Math.log10(value))
    const mantissa = value / Math.pow(10, exponent)
    
    // Show class labels for major thresholds
    if (value === XRAY_CLASSES.X) return 'X'
    if (value === XRAY_CLASSES.M) return 'M'
    if (value === XRAY_CLASSES.C) return 'C'
    if (value === XRAY_CLASSES.B) return 'B'
    if (value === XRAY_CLASSES.A) return 'A'
    
    // Otherwise show scientific notation
    if (mantissa === 1) {
      return `10^${exponent}`
    }
    return `${mantissa.toFixed(0)}e${exponent}`
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const time = payload[0]?.payload?.time
      const formattedTime = time ? format(new Date(time), 'MMM dd, HH:mm:ss') : label
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold mb-1">{formattedTime}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null || entry.value === undefined) return null
            
            const value = entry.value
            const className = getXrayClass(value)
            
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {value.toExponential(2)} W/m² ({className})
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  // Get X-ray class from flux value
  const getXrayClass = (flux: number) => {
    if (flux >= XRAY_CLASSES.X) return 'X-class'
    if (flux >= XRAY_CLASSES.M) return 'M-class'
    if (flux >= XRAY_CLASSES.C) return 'C-class'
    if (flux >= XRAY_CLASSES.B) return 'B-class'
    return 'A-class'
  }

  // Calculate Y-axis domain for log scale
  const yDomain = [1e-9, 1e-3]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">GOES X-ray Flux</h3>
      
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
            scale="log"
            domain={yDomain}
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12 }}
            ticks={[1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3]}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            formatter={(value) => {
              if (value === 'xray_flux_long') return 'Long (0.1-0.8 nm)'
              if (value === 'xray_flux_short') return 'Short (0.05-0.4 nm)'
              return value
            }}
          />
          
          {/* Reference lines for X-ray classes */}
          <ReferenceLine
            y={XRAY_CLASSES.X}
            stroke="#ff0000"
            strokeDasharray="5 5"
            label={{ value: "X", position: "left" }}
          />
          <ReferenceLine
            y={XRAY_CLASSES.M}
            stroke="#ff6600"
            strokeDasharray="5 5"
            label={{ value: "M", position: "left" }}
          />
          <ReferenceLine
            y={XRAY_CLASSES.C}
            stroke="#ffaa00"
            strokeDasharray="5 5"
            label={{ value: "C", position: "left" }}
          />
          
          <Line
            type="monotone"
            dataKey="xray_flux_long"
            stroke="#E4581E"
            name="xray_flux_long"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          
          <Line
            type="monotone"
            dataKey="xray_flux_short"
            stroke="#0B3D91"
            name="xray_flux_short"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Data: GOES-16/18 Primary X-ray Sensor • Updates: Real-time
      </div>
    </div>
  )
}