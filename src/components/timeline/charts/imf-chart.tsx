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

interface IMFChartProps {
  data: Array<{
    time: string
    timestamp: number
    bt: number | null
    bx: number | null
    by: number | null
    bz: number | null
    displayTime: string
  }>
  height?: number
}

export function IMFChart({ data, height = 400 }: IMFChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const time = payload[0]?.payload?.time
      const formattedTime = time ? format(new Date(time), 'MMM dd, HH:mm:ss') : label
      
      // Get Bz value for storm assessment
      const bzValue = payload.find((p: any) => p.dataKey === 'bz')?.value
      const stormIndicator = getBzStatus(bzValue)
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold mb-1">{formattedTime}</p>
          {payload.map((entry: any, index: number) => {
            if (entry.value === null || entry.value === undefined) return null
            
            const value = entry.value
            const label = getFieldLabel(entry.name)
            
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {label}: {value.toFixed(2)} nT
                {entry.dataKey === 'bz' && stormIndicator && (
                  <span className={`ml-1 font-semibold ${bzValue < -10 ? 'text-red-500' : 'text-yellow-500'}`}>
                    ({stormIndicator})
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

  // Get field label
  const getFieldLabel = (name: string) => {
    switch (name) {
      case 'bt': return 'Bt (Total)'
      case 'bx': return 'Bx GSM'
      case 'by': return 'By GSM'
      case 'bz': return 'Bz GSM'
      default: return name
    }
  }

  // Get Bz status for geomagnetic storm potential
  const getBzStatus = (bz: number | null) => {
    if (bz === null) return null
    if (bz < -20) return 'Severe Storm Potential'
    if (bz < -10) return 'Strong Storm Potential'
    if (bz < -5) return 'Moderate Storm Potential'
    if (bz < 0) return 'Southward'
    return 'Northward'
  }

  // Calculate Y-axis domain
  const allValues = data.flatMap(d => [d.bt, d.bx, d.by, d.bz].filter(v => v !== null)) as number[]
  const maxAbsValue = Math.max(...allValues.map(Math.abs), 20)
  const yDomain = [-maxAbsValue, maxAbsValue]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Interplanetary Magnetic Field (IMF)</h3>
      
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
            domain={yDomain}
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'Magnetic Field (nT)', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            formatter={getFieldLabel}
          />
          
          {/* Reference lines for Bz thresholds */}
          <ReferenceLine
            y={0}
            stroke="#666"
            strokeDasharray="3 3"
          />
          <ReferenceLine
            y={-5}
            stroke="#ffaa00"
            strokeDasharray="5 5"
            label={{ value: "Bz = -5 nT", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={-10}
            stroke="#ff6600"
            strokeDasharray="5 5"
            label={{ value: "Bz = -10 nT", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={-20}
            stroke="#ff0000"
            strokeDasharray="5 5"
            label={{ value: "Bz = -20 nT", position: "right", fontSize: 10 }}
          />
          
          {/* Magnetic field components */}
          <Line
            type="monotone"
            dataKey="bx"
            stroke="#0000FF"
            name="bx"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          
          <Line
            type="monotone"
            dataKey="by"
            stroke="#00FF00"
            name="by"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          
          <Line
            type="monotone"
            dataKey="bz"
            stroke="#FF0000"
            name="bz"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          
          <Line
            type="monotone"
            dataKey="bt"
            stroke="#800080"
            name="bt"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Data: ACE/DSCOVR at L1 • GSM Coordinates • Southward Bz (negative) enhances geomagnetic activity
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500"></span>
            Bx: Sun-Earth direction
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-green-500"></span>
            By: Dawn-Dusk direction
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500"></span>
            Bz: North-South direction
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-purple-500"></span>
            Bt: Total field
          </span>
        </div>
      </div>
    </div>
  )
}