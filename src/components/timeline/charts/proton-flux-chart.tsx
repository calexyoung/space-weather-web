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

interface ProtonFluxChartProps {
  data: Array<{
    time: string
    timestamp: number
    proton_1MeV?: number | null
    proton_5MeV?: number | null
    proton_10MeV?: number | null
    proton_30MeV?: number | null
    proton_50MeV?: number | null
    proton_100MeV?: number | null
    displayTime: string
  }>
  height?: number
}

// Alert thresholds (pfu - particle flux units)
const ALERT_THRESHOLDS = {
  S1: 10,    // Minor radiation storm
  S2: 100,   // Moderate radiation storm
  S3: 1000,  // Strong radiation storm
  S4: 10000, // Severe radiation storm
  S5: 100000 // Extreme radiation storm
}

export function ProtonFluxChart({ data, height = 400 }: ProtonFluxChartProps) {
  // Format Y-axis labels for logarithmic scale
  const formatYAxis = (value: number) => {
    if (value === 0) return '0'
    const exponent = Math.floor(Math.log10(value))
    const mantissa = value / Math.pow(10, exponent)
    
    // Show alert levels
    if (value === ALERT_THRESHOLDS.S5) return 'S5'
    if (value === ALERT_THRESHOLDS.S4) return 'S4'
    if (value === ALERT_THRESHOLDS.S3) return 'S3'
    if (value === ALERT_THRESHOLDS.S2) return 'S2'
    if (value === ALERT_THRESHOLDS.S1) return 'S1'
    
    // Otherwise show scientific notation
    if (mantissa === 1) {
      return `10^${exponent}`
    }
    return value >= 1 ? value.toFixed(0) : value.toExponential(0)
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
            const stormLevel = getStormLevel(value)
            
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {formatProtonName(entry.name)}: {value.toExponential(2)} pfu
                {stormLevel && <span className="ml-1 font-semibold">({stormLevel})</span>}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

  // Format proton energy level names
  const formatProtonName = (name: string) => {
    const energy = name.replace('proton_', '').replace('MeV', '')
    return `>${energy} MeV`
  }

  // Get storm level from flux value
  const getStormLevel = (flux: number) => {
    if (flux >= ALERT_THRESHOLDS.S5) return 'S5 - Extreme'
    if (flux >= ALERT_THRESHOLDS.S4) return 'S4 - Severe'
    if (flux >= ALERT_THRESHOLDS.S3) return 'S3 - Strong'
    if (flux >= ALERT_THRESHOLDS.S2) return 'S2 - Moderate'
    if (flux >= ALERT_THRESHOLDS.S1) return 'S1 - Minor'
    return null
  }

  // Calculate Y-axis domain for log scale
  const yDomain = [0.01, 100000]

  // Determine which proton channels are available in the data
  const hasChannel = (channel: string) => {
    return data.some(d => d[channel as keyof typeof d] !== null && d[channel as keyof typeof d] !== undefined)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">GOES Proton Flux</h3>
      
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
            ticks={[0.01, 0.1, 1, 10, 100, 1000, 10000, 100000]}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            formatter={formatProtonName}
          />
          
          {/* Reference lines for radiation storm levels */}
          <ReferenceLine
            y={ALERT_THRESHOLDS.S1}
            stroke="#ffaa00"
            strokeDasharray="5 5"
            label={{ value: "S1", position: "left" }}
          />
          <ReferenceLine
            y={ALERT_THRESHOLDS.S2}
            stroke="#ff6600"
            strokeDasharray="5 5"
            label={{ value: "S2", position: "left" }}
          />
          <ReferenceLine
            y={ALERT_THRESHOLDS.S3}
            stroke="#ff3300"
            strokeDasharray="5 5"
            label={{ value: "S3", position: "left" }}
          />
          
          {/* Render lines for available channels */}
          {hasChannel('proton_1MeV') && (
            <Line
              type="monotone"
              dataKey="proton_1MeV"
              stroke="#0B3D91"
              name="proton_1MeV"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          
          {hasChannel('proton_5MeV') && (
            <Line
              type="monotone"
              dataKey="proton_5MeV"
              stroke="#a07325"
              name="proton_5MeV"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          
          {hasChannel('proton_10MeV') && (
            <Line
              type="monotone"
              dataKey="proton_10MeV"
              stroke="#E4581E"
              name="proton_10MeV"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          
          {hasChannel('proton_30MeV') && (
            <Line
              type="monotone"
              dataKey="proton_30MeV"
              stroke="#10B981"
              name="proton_30MeV"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          
          {hasChannel('proton_50MeV') && (
            <Line
              type="monotone"
              dataKey="proton_50MeV"
              stroke="#8B5CF6"
              name="proton_50MeV"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          
          {hasChannel('proton_100MeV') && (
            <Line
              type="monotone"
              dataKey="proton_100MeV"
              stroke="#EC4899"
              name="proton_100MeV"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Data: GOES-16/18 Energetic Particle Sensor • Radiation storm thresholds: S1 (10 pfu) to S5 (100k pfu)
      </div>
    </div>
  )
}