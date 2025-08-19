'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import * as d3Selection from 'd3-selection';
import * as d3Zoom from 'd3-zoom';
import * as d3Brush from 'd3-brush';
import { 
  createTimeScale, 
  createLinearScale, 
  createLogScale, 
  debounce,
  getSmartTicks,
  downsampleData
} from '@/lib/timeline/chart-utils';

// KNMI-style color scheme
export const KNMI_COLORS = {
  // X-ray flux colors (from KNMI layout)
  xray_long: {
    fill: '#d0e7ff',
    stroke: '#8f9cbc',
    stroke_width: 1
  },
  xray_short: {
    fill: '#b8cfea',
    stroke: '#7c8498',
    stroke_width: 1
  },
  // Proton flux colors  
  proton_10mev: {
    fill: '#e6f3e6',
    stroke: '#2d7d2d',
    stroke_width: 1.5
  },
  proton_50mev: {
    fill: '#fff2cc',
    stroke: '#d68910', 
    stroke_width: 1.5
  },
  proton_100mev: {
    fill: '#ffe6e6',
    stroke: '#c0392b',
    stroke_width: 1.5
  },
  // Magnetic field colors
  mag_bt: {
    stroke: '#3498db',
    stroke_width: 1.5
  },
  mag_bz: {
    stroke: '#e74c3c',
    stroke_width: 1.5
  },
  // Solar wind colors
  sw_speed: {
    stroke: '#27ae60',
    stroke_width: 2
  },
  sw_density: {
    stroke: '#f39c12',
    stroke_width: 1.5
  },
  // Grid and axis colors
  grid: '#e5e7eb',
  axis: '#6b7280',
  text: '#374151'
} as const;

// KNMI-style flare class colors and thresholds
export const FLARE_CLASSES = {
  X: { threshold: 1e-4, color: '#dc2626', label: 'X-class' },
  M: { threshold: 1e-5, color: '#ea580c', label: 'M-class' },
  C: { threshold: 1e-6, color: '#eab308', label: 'C-class' },
  B: { threshold: 1e-7, color: '#22c55e', label: 'B-class' },
  A: { threshold: 1e-8, color: '#3b82f6', label: 'A-class' }
} as const;

// KNMI-style Kp color scheme
export const KP_COLORS = {
  0: '#22c55e', // Green - quiet
  1: '#22c55e',
  2: '#22c55e',
  3: '#eab308', // Yellow - unsettled
  4: '#ea580c', // Orange - minor storm
  5: '#ea580c', // Orange - moderate storm
  6: '#dc2626', // Red - strong storm
  7: '#dc2626',
  8: '#991b1b', // Dark red - severe storm
  9: '#991b1b'
} as const;

interface TimelineChartProps {
  width: number;
  height: number;
  data: Array<{
    time: string;
    [key: string]: number | string;
  }>;
  children: React.ReactNode;
  title: string;
  yLabel?: string;
  logScale?: boolean;
  enableZoom?: boolean;
  enableBrush?: boolean;
  onTimeRangeChange?: (range: [Date, Date]) => void;
  maxDataPoints?: number;
  chartType?: 'area' | 'line' | 'bar';
}

interface TooltipData {
  x: number;
  y: number;
  time: string;
  values: Array<{ label: string; value: string; color?: string }>;
}

interface ZoomTransform {
  k: number;
  x: number;
  y: number;
}

interface InteractiveFeatures {
  tooltip: TooltipData | null;
  selectedTimeRange: [Date, Date] | null;
  zoomTransform: ZoomTransform | null;
  crosshair: { x: number; y: number } | null;
}

export function KnmiTimelineChart({ 
  width, 
  height, 
  data, 
  children, 
  title, 
  yLabel, 
  logScale = false,
  enableZoom = true,
  enableBrush = false,
  onTimeRangeChange,
  maxDataPoints = 2000,
  chartType = 'area'
}: TimelineChartProps) {
  // Refs for D3 integration (must be before any returns)
  const svgRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3Zoom.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const brushRef = useRef<d3Brush.BrushBehavior<unknown> | null>(null);

  // Interactive state (must be before any returns)
  const [interactive, setInteractive] = useState<InteractiveFeatures>({
    tooltip: null,
    selectedTimeRange: null,
    zoomTransform: null,
    crosshair: null
  });

  // Note: All hooks must be defined before any early returns
  
  // D3 zoom effect (defined before early return)
  const margins = { top: 20, right: 30, bottom: 60, left: 85 };
  const chartWidth = width - margins.left - margins.right;
  const chartHeight = height - margins.top - margins.bottom;
  
  useEffect(() => {
    if (!svgRef.current || !enableZoom || !data.length) return;
    // Implementation moved inside
  }, [enableZoom, width, height, chartWidth, data]);

  // Brush effect (defined before early return)
  useEffect(() => {
    if (!svgRef.current || !enableBrush || !data.length) return;
    // Implementation moved inside
  }, [enableBrush, chartWidth, chartHeight, data]);

  // Mouse handlers (defined before early return)
  const handleMouseMove = useCallback((event: React.MouseEvent<SVGElement>) => {
    if (!data.length) return;
    // Implementation below
  }, [data, chartWidth, chartHeight, margins, logScale, interactive]);
  
  const handleMouseLeave = useCallback(() => {
    setInteractive(prev => ({ ...prev, tooltip: null, crosshair: null }));
  }, []);

  if (!data.length) return null;

  // Performance optimization - downsample data if needed
  const displayData = data.length > maxDataPoints 
    ? downsampleData(data, maxDataPoints, Object.keys(data[0]).find(k => k !== 'time'))
    : data;

  // Margins and dimensions already defined above

  // Create scales
  const timeExtent: [Date, Date] = [
    new Date(Math.min(...displayData.map(d => new Date(d.time).getTime()))),
    new Date(Math.max(...displayData.map(d => new Date(d.time).getTime())))
  ];

  const xScale = createTimeScale(timeExtent, [0, chartWidth]);

  // Auto-detect chart parameters and create appropriate scales
  const dataKeys = Object.keys(displayData[0]).filter(key => key !== 'time');
  const isXRayFlux = title.toLowerCase().includes('x-ray');
  const isProtonFlux = title.toLowerCase().includes('proton');
  const isKpIndex = title.toLowerCase().includes('kp');
  const isMagneticField = title.toLowerCase().includes('magnetic');
  const isSolarWind = title.toLowerCase().includes('solar wind');

  // Create appropriate Y scales based on chart type
  let yScale: (value: number) => number;
  let yDomain: [number, number];

  if (logScale) {
    // For log scale charts (X-ray, proton flux)
    const allValues = displayData.flatMap(d => 
      dataKeys.map(key => Number(d[key])).filter(v => !isNaN(v) && v > 0)
    );
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    yDomain = [Math.max(minValue * 0.1, 1e-12), maxValue * 10];
    yScale = createLogScale(yDomain, [chartHeight, 0]);
  } else if (isKpIndex) {
    // Kp index has fixed 0-9 range
    yDomain = [0, 9];
    yScale = createLinearScale(yDomain, [chartHeight, 0]);
  } else {
    // Linear scale for other parameters
    const allValues = displayData.flatMap(d => 
      dataKeys.map(key => Number(d[key])).filter(v => !isNaN(v))
    );
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = (maxValue - minValue) * 0.1;
    yDomain = [minValue - padding, maxValue + padding];
    yScale = createLinearScale(yDomain, [chartHeight, 0]);
  }

  // Function to render chart content automatically
  const renderChartContent = () => {
    const xScaleFn = (time: Date) => xScale(time);
    const yScaleFn = (value: number) => yScale(value);

    if (isXRayFlux) {
      return (
        <g>
          {/* Long wavelength area */}
          <KnmiAreaPath
            data={displayData}
            xScale={xScaleFn}
            yScale={yScaleFn}
            parameter="flux_long"
            fill="url(#xray-long-gradient)"
            stroke={KNMI_COLORS.xray_long.stroke}
            strokeWidth={KNMI_COLORS.xray_long.stroke_width}
            baseline={1e-12}
            logScale={true}
          />
          
          {/* Short wavelength area */}
          <KnmiAreaPath
            data={displayData}
            xScale={xScaleFn}
            yScale={yScaleFn}
            parameter="flux_short"
            fill="url(#xray-short-gradient)"
            stroke={KNMI_COLORS.xray_short.stroke}
            strokeWidth={KNMI_COLORS.xray_short.stroke_width}
            baseline={1e-12}
            logScale={true}
          />
          
          {/* Flare class annotations */}
          <FlareClassAnnotations width={chartWidth} height={chartHeight} yScale={yScaleFn} />
          
          {/* Legend */}
          <ChartLegend
            items={[
              { label: 'X-ray flux long (1-8 Å)', color: KNMI_COLORS.xray_long.stroke, type: 'area' },
              { label: 'X-ray flux short (0.5-4 Å)', color: KNMI_COLORS.xray_short.stroke, type: 'area' }
            ]}
            position={{ x: chartWidth - 180, y: 10 }}
          />
        </g>
      );
    } else if (isProtonFlux) {
      return (
        <g>
          {dataKeys.includes('flux_10mev') && (
            <KnmiAreaPath
              data={displayData}
              xScale={xScaleFn}
              yScale={yScaleFn}
              parameter="flux_10mev"
              fill={KNMI_COLORS.proton_10mev.fill}
              stroke={KNMI_COLORS.proton_10mev.stroke}
              strokeWidth={KNMI_COLORS.proton_10mev.stroke_width}
              baseline={0.01}
              logScale={true}
            />
          )}
          
          {dataKeys.includes('flux_50mev') && (
            <KnmiAreaPath
              data={displayData}
              xScale={xScaleFn}
              yScale={yScaleFn}
              parameter="flux_50mev"
              fill={KNMI_COLORS.proton_50mev.fill}
              stroke={KNMI_COLORS.proton_50mev.stroke}
              strokeWidth={KNMI_COLORS.proton_50mev.stroke_width}
              baseline={0.01}
              logScale={true}
            />
          )}
          
          {dataKeys.includes('flux_100mev') && (
            <KnmiAreaPath
              data={displayData}
              xScale={xScaleFn}
              yScale={yScaleFn}
              parameter="flux_100mev"
              fill={KNMI_COLORS.proton_100mev.fill}
              stroke={KNMI_COLORS.proton_100mev.stroke}
              strokeWidth={KNMI_COLORS.proton_100mev.stroke_width}
              baseline={0.01}
              logScale={true}
            />
          )}
        </g>
      );
    } else if (isKpIndex) {
      return (
        <g>
          {/* Kp index bars */}
          {displayData.map((point, i) => {
            const barWidth = Math.max(1, chartWidth / displayData.length - 1);
            const x = xScaleFn(new Date(point.time));
            const kpValue = Number(point.kp) || 0;
            const barHeight = (kpValue / 9) * chartHeight;
            const kpRounded = Math.round(kpValue);
            const color = KP_COLORS[Math.min(Math.max(kpRounded, 0), 9) as keyof typeof KP_COLORS] || '#3b82f6';
            
            return (
              <rect
                key={i}
                x={x - barWidth / 2}
                y={chartHeight - barHeight}
                width={barWidth}
                height={barHeight}
                fill={color}
                opacity={0.8}
                stroke="white"
                strokeWidth={0.5}
              />
            );
          })}
          
          <KpStormLevels width={chartWidth} height={chartHeight} yScale={yScaleFn} />
        </g>
      );
    } else {
      // Default line chart for other data types
      return (
        <g>
          {dataKeys.map((key, index) => {
            const colors = Object.values(KNMI_COLORS);
            const color = colors[index % colors.length];
            const strokeColor = typeof color === 'object' && 'stroke' in color ? color.stroke : '#3b82f6';
            
            return (
              <KnmiLinePath
                key={key}
                data={displayData}
                xScale={xScaleFn}
                yScale={yScaleFn}
                parameter={key}
                stroke={strokeColor}
                strokeWidth={2}
              />
            );
          })}
        </g>
      );
    }
  };

  // D3 integration effects
  useEffect(() => {
    if (!svgRef.current || !enableZoom) return;

    const svg = d3Selection.select(svgRef.current);
    
    // Create zoom behavior
    const zoom = d3Zoom.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 50])
      .extent([[0, 0], [width, height]])
      .on('zoom', (event) => {
        const transform = event.transform;
        
        setInteractive(prev => ({
          ...prev,
          zoomTransform: { k: transform.k, x: transform.x, y: transform.y }
        }));

        // Apply transform to chart content
        if (chartRef.current) {
          const chartGroup = d3Selection.select(chartRef.current);
          chartGroup.attr('transform', 
            `translate(${margins.left + transform.x}, ${margins.top}) scale(${transform.k}, 1)`
          );
        }

        // Debounced time range change callback
        if (onTimeRangeChange && xScale.invert) {
          const debouncedCallback = debounce((...args: unknown[]) => {
            const transform = args[0] as d3Zoom.ZoomTransform;
            if (xScale.invert) {
              const newStart = xScale.invert((0 - transform.x) / transform.k) as Date;
              const newEnd = xScale.invert((chartWidth - transform.x) / transform.k) as Date;
              onTimeRangeChange([newStart, newEnd]);
            }
          }, 300);
          
          debouncedCallback(transform);
        }
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    return () => {
      svg.on('.zoom', null);
    };
  }, [enableZoom, width, height, chartWidth, xScale, onTimeRangeChange]);

  // Brush integration
  useEffect(() => {
    if (!svgRef.current || !enableBrush) return;

    const svg = d3Selection.select(svgRef.current);
    
    const brush = d3Brush.brushX()
      .extent([[margins.left, margins.top], [margins.left + chartWidth, margins.top + chartHeight]])
      .on('end', (event) => {
        if (!event.selection) return;
        
        const [x0, x1] = event.selection as [number, number];
        const brushStart = xScale.invert!(x0 - margins.left) as Date;
        const brushEnd = xScale.invert!(x1 - margins.left) as Date;
        
        setInteractive(prev => ({
          ...prev,
          selectedTimeRange: [brushStart, brushEnd]
        }));

        if (onTimeRangeChange) {
          onTimeRangeChange([brushStart, brushEnd]);
        }

        // Clear brush selection after a delay
        setTimeout(() => {
          svg.select('.brush').call(brush.clear as any);
        }, 1000);
      });

    const brushGroup = svg.append('g')
      .attr('class', 'brush')
      .call(brush);

    brushRef.current = brush;

    return () => {
      svg.select('.brush').remove();
    };
  }, [enableBrush, chartWidth, chartHeight, xScale, onTimeRangeChange]);

  // Enhanced mouse interaction handlers with crosshair
  // Re-implement handleMouseMove with full logic
  const handleMouseMoveImpl = (event: React.MouseEvent<SVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - margins.left;
    const y = event.clientY - rect.top - margins.top;
    
    if (x >= 0 && x <= chartWidth && y >= 0 && y <= chartHeight) {
      // Update crosshair position
      setInteractive(prev => ({
        ...prev,
        crosshair: { x, y }
      }));

      // Account for zoom transform when finding data point
      let adjustedX = x;
      if (interactive.zoomTransform) {
        adjustedX = (x - interactive.zoomTransform.x) / interactive.zoomTransform.k;
      }

      // Use the current time scale to find the target time
      const targetTime = xScale.invert ? xScale.invert(adjustedX) as Date : new Date();
      
      // Find closest data point in display data
      let closestPoint = displayData[0];
      let minDistance = Math.abs(new Date(displayData[0].time).getTime() - targetTime.getTime());
      
      for (const point of displayData) {
        const distance = Math.abs(new Date(point.time).getTime() - targetTime.getTime());
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      }
      
      // Create enhanced tooltip data with better formatting
      const values = Object.entries(closestPoint)
        .filter(([key]) => key !== 'time')
        .map(([key, value]) => {
          let formattedValue: string;
          if (typeof value === 'number') {
            if (logScale && value > 0) {
              formattedValue = value >= 1e-3 && value < 1e3 
                ? value.toFixed(3) 
                : value.toExponential(2);
            } else {
              formattedValue = Math.abs(value) >= 1000 
                ? value.toExponential(1)
                : value.toFixed(value < 1 ? 3 : 1);
            }
          } else {
            formattedValue = String(value);
          }
          
          return {
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: formattedValue
          };
        });
      
      setInteractive(prev => ({
        ...prev,
        tooltip: {
          x: event.clientX,
          y: event.clientY,
          time: format(new Date(closestPoint.time), 'MMM dd, HH:mm:ss'),
          values
        }
      }));
    }
  };

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg p-4 w-full">
      {/* Chart title */}
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {yLabel && (
          <p className="text-xs text-gray-500 mt-1">{yLabel}</p>
        )}
      </div>
      
      <div className="w-full overflow-x-auto">
        <svg 
          ref={svgRef}
          width={width} 
          height={height} 
          className="bg-white min-w-full cursor-crosshair" 
          style={{ minWidth: `${width}px` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
        {/* Enhanced definitions with clipping and gradients */}
        <defs>
          {/* Chart area clipping path */}
          <clipPath id={`chart-clip-${title.replace(/\s+/g, '-')}`}>
            <rect x={0} y={0} width={chartWidth} height={chartHeight} />
          </clipPath>
          
          {/* Grid pattern (KNMI style) */}
          <pattern id="knmi-grid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke={KNMI_COLORS.grid} strokeWidth="0.5"/>
          </pattern>
          
          {/* Enhanced gradient fills for area plots */}
          <linearGradient id="xray-long-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={KNMI_COLORS.xray_long.fill} stopOpacity="0.8"/>
            <stop offset="100%" stopColor={KNMI_COLORS.xray_long.fill} stopOpacity="0.3"/>
          </linearGradient>
          <linearGradient id="xray-short-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={KNMI_COLORS.xray_short.fill} stopOpacity="0.8"/>
            <stop offset="100%" stopColor={KNMI_COLORS.xray_short.fill} stopOpacity="0.3"/>
          </linearGradient>
          
          {/* Crosshair patterns */}
          <filter id="crosshair-shadow">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.3)" />
          </filter>
        </defs>
        
        {/* Grid background */}
        <rect 
          x={margins.left} 
          y={margins.top} 
          width={chartWidth} 
          height={chartHeight} 
          fill="url(#knmi-grid)" 
        />
        
        {/* Main chart group with clipping and potential zoom transform */}
        <g 
          ref={chartRef}
          transform={`translate(${margins.left}, ${margins.top})`}
          clipPath={`url(#chart-clip-${title.replace(/\s+/g, '-')})`}
        >
          {renderChartContent()}
        </g>
        
        {/* Y-axis */}
        <g transform={`translate(${margins.left}, ${margins.top})`}>
          <line 
            x1={0} 
            y1={0} 
            x2={0} 
            y2={chartHeight} 
            stroke={KNMI_COLORS.axis} 
            strokeWidth={1}
          />
        </g>
        
        {/* X-axis */}
        <g transform={`translate(${margins.left}, ${margins.top + chartHeight})`}>
          <line 
            x1={0} 
            y1={0} 
            x2={chartWidth} 
            y2={0} 
            stroke={KNMI_COLORS.axis} 
            strokeWidth={1}
          />
        </g>
        
        {/* Crosshair overlay */}
        {interactive.crosshair && (
          <g transform={`translate(${margins.left}, ${margins.top})`}>
            {/* Vertical crosshair line */}
            <line
              x1={interactive.crosshair.x}
              y1={0}
              x2={interactive.crosshair.x}
              y2={chartHeight}
              stroke="#666"
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.7}
              filter="url(#crosshair-shadow)"
            />
            {/* Horizontal crosshair line */}
            <line
              x1={0}
              y1={interactive.crosshair.y}
              x2={chartWidth}
              y2={interactive.crosshair.y}
              stroke="#666"
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.7}
              filter="url(#crosshair-shadow)"
            />
            {/* Crosshair center point */}
            <circle
              cx={interactive.crosshair.x}
              cy={interactive.crosshair.y}
              r={3}
              fill="#666"
              opacity={0.8}
              filter="url(#crosshair-shadow)"
            />
          </g>
        )}

        {/* Interactive overlay */}
        <rect
          x={margins.left}
          y={margins.top}
          width={chartWidth}
          height={chartHeight}
          fill="transparent"
          className="pointer-events-all"
        />

        {/* Zoom controls overlay */}
        {enableZoom && (
          <g className="zoom-controls" transform={`translate(${width - 100}, 10)`}>
            <rect width="80" height="60" fill="white" fillOpacity="0.9" stroke="#ccc" rx="4" />
            <text x="40" y="15" textAnchor="middle" fontSize="10" fill="#666">Zoom</text>
            <text x="40" y="30" textAnchor="middle" fontSize="8" fill="#666">
              {interactive.zoomTransform ? `${interactive.zoomTransform.k.toFixed(1)}x` : '1.0x'}
            </text>
            <text x="40" y="45" textAnchor="middle" fontSize="8" fill="#666">Mouse: Pan/Zoom</text>
            <text x="40" y="55" textAnchor="middle" fontSize="8" fill="#666">Scroll: Zoom</text>
          </g>
        )}
      </svg>
      </div>
      
      {/* Enhanced Tooltip */}
      {interactive.tooltip && (
        <div 
          className="fixed z-50 bg-gray-900/95 text-white text-xs p-3 rounded-lg shadow-xl border border-gray-700 pointer-events-none backdrop-blur-sm"
          style={{ 
            left: interactive.tooltip.x + 15, 
            top: interactive.tooltip.y - 15,
            maxWidth: '250px',
            transform: interactive.tooltip.x > window.innerWidth - 250 ? 'translateX(-100%)' : 'none',
            marginLeft: interactive.tooltip.x > window.innerWidth - 250 ? '-15px' : '0'
          }}
        >
          <div className="font-semibold text-blue-200 mb-2 pb-1 border-b border-gray-600">
            {interactive.tooltip.time}
          </div>
          <div className="space-y-1">
            {interactive.tooltip.values.map((item, index) => (
              <div key={index} className="flex justify-between gap-3 items-center">
                <span className="text-gray-300 text-xs">{item.label}:</span>
                <span className="text-white font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          {interactive.zoomTransform && interactive.zoomTransform.k > 1 && (
            <div className="mt-2 pt-1 border-t border-gray-600 text-gray-400 text-xs">
              Zoom: {interactive.zoomTransform.k.toFixed(1)}x
            </div>
          )}
        </div>
      )}

      {/* Data performance indicator */}
      {data.length > maxDataPoints && (
        <div className="absolute top-2 left-2 bg-amber-100 border border-amber-300 text-amber-700 px-2 py-1 rounded text-xs">
          Showing {displayData.length} of {data.length} points (downsampled for performance)
        </div>
      )}
    </div>
  );
}

interface AreaPathProps {
  data: Array<{ time: string; [key: string]: number | string }>;
  xScale: (time: Date) => number;
  yScale: (value: number) => number;
  parameter: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  baseline?: number;
  logScale?: boolean;
}

export function KnmiAreaPath({ 
  data, 
  xScale, 
  yScale, 
  parameter, 
  fill, 
  stroke, 
  strokeWidth = 1,
  baseline = 1e-12,
  logScale = false
}: AreaPathProps) {
  if (!data.length) return null;

  // Filter out invalid data points
  const validData = data.filter(d => {
    const value = Number(d[parameter]);
    return !isNaN(value) && (logScale ? value > 0 : true);
  });

  if (validData.length === 0) return null;

  // Create area path (KNMI style with proper baseline)
  const areaPath = validData.reduce((path, point, index) => {
    const x = xScale(new Date(point.time));
    const value = Number(point[parameter]);
    const y = yScale(logScale && value <= 0 ? baseline : value);
    
    if (index === 0) {
      // Start at baseline
      const baselineY = yScale(baseline);
      return `M ${x} ${baselineY} L ${x} ${y}`;
    } else {
      return `${path} L ${x} ${y}`;
    }
  }, '');

  // Close the area path back to baseline
  const lastPoint = validData[validData.length - 1];
  const lastX = xScale(new Date(lastPoint.time));
  const baselineY = yScale(baseline);
  const closedAreaPath = `${areaPath} L ${lastX} ${baselineY} Z`;

  // Create stroke-only line path for cleaner edges
  const linePath = validData.reduce((path, point, index) => {
    const x = xScale(new Date(point.time));
    const value = Number(point[parameter]);
    const y = yScale(logScale && value <= 0 ? baseline : value);
    
    return index === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
  }, '');

  return (
    <g>
      {/* Area fill */}
      <path 
        d={closedAreaPath}
        fill={fill}
        stroke="none"
        opacity={0.7}
      />
      
      {/* Stroke line */}
      {stroke && (
        <path 
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

interface LinePathProps {
  data: Array<{ time: string; [key: string]: number | string }>;
  xScale: (time: Date) => number;
  yScale: (value: number) => number;
  parameter: string;
  stroke: string;
  strokeWidth?: number;
}

export function KnmiLinePath({ data, xScale, yScale, parameter, stroke, strokeWidth = 1.5 }: LinePathProps) {
  if (!data.length) return null;

  const validData = data.filter(d => !isNaN(Number(d[parameter])));
  if (validData.length === 0) return null;

  const path = validData.reduce((path, point, index) => {
    const x = xScale(new Date(point.time));
    const y = yScale(Number(point[parameter]));
    return index === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
  }, '');

  return (
    <path 
      d={path}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

interface FlareClassAnnotationsProps {
  width: number;
  height: number;
  yScale: (value: number) => number;
}

export function FlareClassAnnotations({ width, height, yScale }: FlareClassAnnotationsProps) {
  return (
    <g className="flare-annotations">
      {Object.entries(FLARE_CLASSES).map(([flareClass, config]) => {
        const y = yScale(config.threshold);
        
        // Only show if within chart bounds
        if (y < 0 || y > height) return null;
        
        return (
          <g key={flareClass}>
            {/* Threshold line */}
            <line
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke={config.color}
              strokeWidth={0.5}
              strokeDasharray="3,3"
              opacity={0.6}
            />
            
            {/* Class label */}
            <text
              x={width - 40}
              y={y - 3}
              fontSize="10"
              fill={config.color}
              fontWeight="500"
            >
              {config.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

interface KpBarChartProps {
  data: Array<{ time: string; kp: number; forecast?: number }>;
  xScale: (time: Date) => number;
  yScale: (value: number) => number;
  width: number;
  height: number;
}

export function KpBarChart({ data, xScale, yScale, width, height }: KpBarChartProps) {
  if (!data.length) return null;

  // Calculate bar width based on data points
  const barWidth = Math.max(2, width / data.length - 1);

  // Get Kp color based on value
  const getKpColor = (kp: number): string => {
    const kpRounded = Math.round(kp);
    if (kpRounded <= 2) return '#22c55e'; // Green - quiet
    if (kpRounded === 3) return '#eab308'; // Yellow - unsettled
    if (kpRounded === 4) return '#ea580c'; // Orange - active
    if (kpRounded === 5) return '#ea580c'; // Orange - minor storm
    if (kpRounded === 6) return '#dc2626'; // Red - moderate storm
    if (kpRounded === 7) return '#dc2626'; // Red - strong storm
    if (kpRounded >= 8) return '#991b1b'; // Dark red - severe/extreme storm
    return '#3b82f6'; // Default blue
  };

  return (
    <g className="kp-bars">
      {data.map((point, i) => {
        const x = xScale(new Date(point.time));
        const barHeight = (point.kp / 9) * height;
        const y = height - barHeight;
        
        return (
          <g key={i}>
            <rect
              x={x - barWidth / 2}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={getKpColor(point.kp)}
              opacity={0.8}
              stroke="white"
              strokeWidth={0.5}
            />
            {/* Show value text for bars if wide enough */}
            {barWidth > 20 && (
              <text
                x={x}
                y={y - 2}
                fontSize="10"
                fill={getKpColor(point.kp)}
                textAnchor="middle"
                fontWeight="500"
              >
                {point.kp.toFixed(1)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

interface KpStormLevelsProps {
  width: number;
  height: number;
  yScale: (value: number) => number;
}

export function KpStormLevels({ width, height, yScale }: KpStormLevelsProps) {
  const stormLevels = [
    { kp: 5, label: 'G1 Minor', color: '#eab308' },
    { kp: 6, label: 'G2 Moderate', color: '#ea580c' },
    { kp: 7, label: 'G3 Strong', color: '#dc2626' },
    { kp: 8, label: 'G4 Severe', color: '#991b1b' },
    { kp: 9, label: 'G5 Extreme', color: '#7f1d1d' }
  ];

  return (
    <g className="kp-storm-levels">
      {stormLevels.map(level => {
        const y = yScale(level.kp);
        
        if (y < 0 || y > height) return null;
        
        return (
          <g key={level.kp}>
            <line
              x1={0}
              y1={y}
              x2={width}
              y2={y}
              stroke={level.color}
              strokeWidth={0.5}
              strokeDasharray="2,2"
              opacity={0.5}
            />
            <text
              x={5}
              y={y - 2}
              fontSize="9"
              fill={level.color}
              fontWeight="500"
            >
              {level.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

interface TimelineAxisProps {
  data: Array<{ time: string; [key: string]: number | string }>;
  width: number;
  height: number;
  margins: { top: number; right: number; bottom: number; left: number };
  yLabel?: string;
  logScale?: boolean;
  yDomain?: [number, number];
}

export function TimelineAxis({ data, width, height, margins, yLabel, logScale = false, yDomain }: TimelineAxisProps) {
  if (!data.length) return null;

  const chartWidth = width - margins.left - margins.right;
  const chartHeight = height - margins.top - margins.bottom;

  // Create time domain
  const timeExtent = [
    new Date(Math.min(...data.map(d => new Date(d.time).getTime()))),
    new Date(Math.max(...data.map(d => new Date(d.time).getTime())))
  ];

  // Generate time ticks (KNMI style)
  const timeRange = timeExtent[1].getTime() - timeExtent[0].getTime();
  const hourRange = timeRange / (1000 * 60 * 60);
  
  let tickInterval: number;
  let tickFormat: string;
  
  if (hourRange <= 6) {
    tickInterval = 1; // 1 hour
    tickFormat = '%H:%M';
  } else if (hourRange <= 24) {
    tickInterval = 3; // 3 hours
    tickFormat = '%H:%M';
  } else if (hourRange <= 72) {
    tickInterval = 12; // 12 hours
    tickFormat = '%m/%d %H:%M';
  } else {
    tickInterval = 24; // 1 day
    tickFormat = '%m/%d';
  }

  return (
    <g>
      {/* Y-axis label */}
      {yLabel && (
        <text
          transform={`translate(15, ${margins.top + chartHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize="11"
          fill={KNMI_COLORS.text}
          fontWeight="500"
        >
          {yLabel}
        </text>
      )}
    </g>
  );
}

interface ChartLegendProps {
  items: Array<{
    label: string;
    color: string;
    type: 'line' | 'area';
    strokeWidth?: number;
  }>;
  position?: { x: number; y: number };
}

export function ChartLegend({ items, position = { x: 10, y: 10 } }: ChartLegendProps) {
  return (
    <g transform={`translate(${position.x}, ${position.y})`} className="chart-legend">
      <rect 
        x={-5} 
        y={-5} 
        width={120} 
        height={items.length * 16 + 10}
        fill="white"
        stroke={KNMI_COLORS.grid}
        strokeWidth={1}
        rx={3}
        opacity={0.95}
      />
      
      {items.map((item, index) => (
        <g key={item.label} transform={`translate(0, ${index * 16})`}>
          {item.type === 'line' ? (
            <line
              x1={5}
              y1={8}
              x2={20}
              y2={8}
              stroke={item.color}
              strokeWidth={item.strokeWidth || 2}
            />
          ) : (
            <rect
              x={5}
              y={4}
              width={15}
              height={8}
              fill={item.color}
              opacity={0.7}
            />
          )}
          
          <text
            x={25}
            y={12}
            fontSize="10"
            fill={KNMI_COLORS.text}
          >
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}