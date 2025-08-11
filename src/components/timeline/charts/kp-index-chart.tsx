'use client'

import React from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts'
import { format } from 'date-fns'

interface KpIndexChartProps {
  data: Array<{
    time: string
    timestamp: number
    kp: number
    forecast?: number
    displayTime: string
  }>
  height?: number
}

// Kp index thresholds and descriptions
const KP_LEVELS = {
  0: { level: 'G0', description: 'Quiet', color: '#22c55e' },
  1: { level: 'G0', description: 'Quiet', color: '#22c55e' },
  2: { level: 'G0', description: 'Quiet', color: '#22c55e' },
  3: { level: 'G0', description: 'Unsettled', color: '#eab308' },
  4: { level: 'G0', description: 'Active', color: '#f97316' },
  5: { level: 'G1', description: 'Minor Storm', color: '#ef4444' },
  6: { level: 'G2', description: 'Moderate Storm', color: '#dc2626' },
  7: { level: 'G3', description: 'Strong Storm', color: '#b91c1c' },
  8: { level: 'G4', description: 'Severe Storm', color: '#991b1b' },
  9: { level: 'G5', description: 'Extreme Storm', color: '#7f1d1d' }
}

// Get color for Kp value
const getKpColor = (kp: number): string => {
  const kpRounded = Math.floor(Math.max(0, Math.min(9, kp)))
  return KP_LEVELS[kpRounded as keyof typeof KP_LEVELS]?.color || '#666'
}

export function KpIndexChart({ data, height = 400 }: KpIndexChartProps) {
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
            
            const kpValue = Math.floor(entry.value)
            const kpInfo = KP_LEVELS[kpValue as keyof typeof KP_LEVELS]
            const isObserved = entry.dataKey === 'kp'
            
            return (
              <div key={index}>
                <p className="text-sm">
                  {isObserved ? 'Observed' : 'Forecast'} Kp: {entry.value.toFixed(1)}
                </p>
                {kpInfo && (
                  <p className="text-sm mt-1">
                    <span 
                      className="inline-block w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: kpInfo.color }}
                    />
                    {kpInfo.level} - {kpInfo.description}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  // Format Y-axis
  const formatYAxis = (value: number) => {
    return value.toFixed(0)
  }

  // Custom bar shape with rounded corners
  const CustomBar = (props: any) => {
    const { fill, x, y, width, height } = props
    const radius = 2
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          rx={radius}
          ry={radius}
        />
      </g>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Kp Index & Geomagnetic Activity</h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
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
            domain={[0, 9]}
            ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'Kp Index', 
              angle: -90, 
              position: 'insideLeft',
              style: { fontSize: 12 }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            formatter={(value) => {
              if (value === 'kp') return 'Observed Kp'
              if (value === 'forecast') return 'Forecast Kp'
              return value
            }}
          />
          
          {/* Reference lines for storm levels */}
          <ReferenceLine
            y={3}
            stroke="#eab308"
            strokeDasharray="5 5"
            label={{ value: "Unsettled", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={4}
            stroke="#f97316"
            strokeDasharray="5 5"
            label={{ value: "Active", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={5}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: "G1 Storm", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={6}
            stroke="#dc2626"
            strokeDasharray="5 5"
            label={{ value: "G2 Storm", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={7}
            stroke="#b91c1c"
            strokeDasharray="5 5"
            label={{ value: "G3 Storm", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={8}
            stroke="#991b1b"
            strokeDasharray="5 5"
            label={{ value: "G4 Storm", position: "right", fontSize: 10 }}
          />
          
          {/* Bar chart for observed Kp values with color based on value */}
          <Bar 
            dataKey="kp" 
            name="kp"
            shape={<CustomBar />}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getKpColor(entry.kp)} />
            ))}
          </Bar>
          
          {/* Line chart for forecast if available */}
          {data.some(d => d.forecast !== undefined && d.forecast !== 0) && (
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#666666"
              name="forecast"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      
      <div className="mt-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Data: GFZ Potsdam • 3-hour planetary Kp index • Updates every 3 hours
        </div>
        
        {/* Kp scale legend */}
        <div className="mt-3">
          <div className="text-xs font-semibold mb-2">Geomagnetic Activity Scale:</div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }}></span>
              <span>0-2: Quiet</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }}></span>
              <span>3: Unsettled</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#f97316' }}></span>
              <span>4: Active</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></span>
              <span>5: G1 Minor</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#dc2626' }}></span>
              <span>6: G2 Moderate</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#b91c1c' }}></span>
              <span>7: G3 Strong</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#991b1b' }}></span>
              <span>8: G4 Severe</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: '#7f1d1d' }}></span>
              <span>9: G5 Extreme</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}