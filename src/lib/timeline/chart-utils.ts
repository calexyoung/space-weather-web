import { format } from 'date-fns';
import * as d3Scale from 'd3-scale';
import * as d3Time from 'd3-time';
import * as d3TimeFormat from 'd3-time-format';

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ScaleFunction {
  (value: number | Date): number;
  domain(): [number, number] | [Date, Date];
  range(): [number, number];
  ticks?(count?: number): number[] | Date[];
  invert?(pixel: number): number | Date;
  copy?(): ScaleFunction;
}

// Create D3 linear scale with enhanced functionality
export function createLinearScale(
  domain: [number, number], 
  range: [number, number]
): ScaleFunction {
  const scale = d3Scale.scaleLinear()
    .domain(domain)
    .range(range);
    
  const wrappedScale = (value: number) => scale(value);
  wrappedScale.domain = () => scale.domain() as [number, number];
  wrappedScale.range = () => scale.range() as [number, number];
  wrappedScale.ticks = (count = 10) => scale.ticks(count);
  wrappedScale.invert = (pixel: number) => scale.invert(pixel);
  wrappedScale.copy = () => createLinearScale(scale.domain() as [number, number], scale.range() as [number, number]);
  
  return wrappedScale as ScaleFunction;
}

// Create D3 logarithmic scale with enhanced functionality
export function createLogScale(
  domain: [number, number], 
  range: [number, number]
): ScaleFunction {
  // Ensure positive domain values for log scale
  const safeDomain: [number, number] = [
    Math.max(domain[0], 1e-20),
    Math.max(domain[1], 1e-20)
  ];
  
  const scale = d3Scale.scaleLog()
    .domain(safeDomain)
    .range(range)
    .clamp(true);
    
  const wrappedScale = (value: number) => scale(Math.max(value, 1e-20));
  wrappedScale.domain = () => scale.domain() as [number, number];
  wrappedScale.range = () => scale.range() as [number, number];
  wrappedScale.ticks = (count = 10) => scale.ticks(count);
  wrappedScale.invert = (pixel: number) => scale.invert(pixel);
  wrappedScale.copy = () => createLogScale(scale.domain() as [number, number], scale.range() as [number, number]);
  
  return wrappedScale as ScaleFunction;
}

// Create D3 time scale with enhanced functionality
export function createTimeScale(
  domain: [Date, Date], 
  range: [number, number]
): ScaleFunction {
  const scale = d3Scale.scaleTime()
    .domain(domain)
    .range(range);
    
  const wrappedScale = (value: Date | number) => {
    const dateValue = value instanceof Date ? value : new Date(value);
    return scale(dateValue);
  };
  
  wrappedScale.domain = () => scale.domain() as [Date, Date];
  wrappedScale.range = () => scale.range() as [number, number];
  wrappedScale.ticks = (count = 10) => {
    const timeRange = scale.domain();
    const interval = getOptimalTimeInterval(timeRange[0], timeRange[1], count);
    return interval.range(timeRange[0], timeRange[1]);
  };
  wrappedScale.invert = (pixel: number) => scale.invert(pixel);
  wrappedScale.copy = () => createTimeScale(scale.domain() as [Date, Date], scale.range() as [number, number]);
  
  return wrappedScale as ScaleFunction;
}

// Helper function to get optimal time interval for ticks
function getOptimalTimeInterval(start: Date, end: Date, targetCount: number) {
  const duration = end.getTime() - start.getTime();
  const intervals = [
    { interval: d3Time.timeSecond, step: 1, duration: 1000 },
    { interval: d3Time.timeSecond, step: 5, duration: 5000 },
    { interval: d3Time.timeSecond, step: 15, duration: 15000 },
    { interval: d3Time.timeSecond, step: 30, duration: 30000 },
    { interval: d3Time.timeMinute, step: 1, duration: 60000 },
    { interval: d3Time.timeMinute, step: 5, duration: 300000 },
    { interval: d3Time.timeMinute, step: 15, duration: 900000 },
    { interval: d3Time.timeMinute, step: 30, duration: 1800000 },
    { interval: d3Time.timeHour, step: 1, duration: 3600000 },
    { interval: d3Time.timeHour, step: 3, duration: 10800000 },
    { interval: d3Time.timeHour, step: 6, duration: 21600000 },
    { interval: d3Time.timeHour, step: 12, duration: 43200000 },
    { interval: d3Time.timeDay, step: 1, duration: 86400000 },
    { interval: d3Time.timeDay, step: 2, duration: 172800000 },
    { interval: d3Time.timeWeek, step: 1, duration: 604800000 },
    { interval: d3Time.timeMonth, step: 1, duration: 2592000000 },
    { interval: d3Time.timeMonth, step: 3, duration: 7776000000 },
    { interval: d3Time.timeYear, step: 1, duration: 31536000000 }
  ];
  
  const optimalDuration = duration / targetCount;
  
  // Find the best matching interval
  let bestInterval = intervals[0];
  let bestScore = Math.abs(bestInterval.duration - optimalDuration);
  
  for (const candidate of intervals) {
    const score = Math.abs(candidate.duration - optimalDuration);
    if (score < bestScore) {
      bestScore = score;
      bestInterval = candidate;
    }
  }
  
  return bestInterval.step === 1 
    ? bestInterval.interval 
    : bestInterval.interval.every(bestInterval.step)!;
}

// Determine appropriate time tick interval based on time range
export function getTimeTickInfo(timeRange: TimeRange) {
  const duration = timeRange.end.getTime() - timeRange.start.getTime();
  const hours = duration / (1000 * 60 * 60);
  
  if (hours <= 6) {
    return {
      interval: 1, // 1 hour
      format: 'HH:mm',
      majorTicks: 6,
      minorTicks: 12
    };
  } else if (hours <= 24) {
    return {
      interval: 3, // 3 hours  
      format: 'HH:mm',
      majorTicks: 8,
      minorTicks: 24
    };
  } else if (hours <= 72) {
    return {
      interval: 12, // 12 hours
      format: 'MM/dd HH:mm',
      majorTicks: 6,
      minorTicks: 12
    };
  } else {
    return {
      interval: 24, // 1 day
      format: 'MM/dd',
      majorTicks: Math.ceil(hours / 24),
      minorTicks: Math.ceil(hours / 12)
    };
  }
}

// Generate nice domain bounds for data
export function getNiceDomain(values: number[], logScale = false): [number, number] {
  if (values.length === 0) return [0, 1];
  
  const validValues = values.filter(v => !isNaN(v) && (logScale ? v > 0 : true));
  if (validValues.length === 0) return logScale ? [1e-10, 1] : [0, 1];
  
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  
  if (logScale) {
    // For log scale, extend by orders of magnitude
    const minLog = Math.floor(Math.log10(min));
    const maxLog = Math.ceil(Math.log10(max));
    return [Math.pow(10, minLog), Math.pow(10, maxLog)];
  } else {
    // For linear scale, add 10% padding
    const range = max - min;
    const padding = range * 0.1;
    return [min - padding, max + padding];
  }
}

// Calculate data statistics
export interface DataStats {
  min: number;
  max: number;
  mean: number;
  count: number;
  validCount: number;
}

export function calculateDataStats(values: number[]): DataStats {
  const validValues = values.filter(v => !isNaN(v) && isFinite(v));
  
  if (validValues.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      count: values.length,
      validCount: 0
    };
  }
  
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const mean = validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
  
  return {
    min,
    max,
    mean,
    count: values.length,
    validCount: validValues.length
  };
}

// Format numbers for display (KNMI style)
export function formatValue(value: number, logScale = false): string {
  if (isNaN(value) || !isFinite(value)) return 'N/A';
  
  if (logScale && value > 0) {
    // Scientific notation for log scales
    if (value >= 1e-3 && value < 1e3) {
      return value.toFixed(3);
    } else {
      return value.toExponential(1);
    }
  } else {
    // Regular formatting
    if (Math.abs(value) >= 1000) {
      return value.toExponential(1);
    } else if (Math.abs(value) >= 1) {
      return value.toFixed(1);
    } else if (Math.abs(value) >= 0.01) {
      return value.toFixed(3);
    } else {
      return value.toExponential(1);
    }
  }
}

// Generate axis ticks with proper formatting
export interface AxisTick {
  value: number | Date;
  label: string;
  major: boolean;
}

export function generateAxisTicks(
  scale: ScaleFunction,
  count: number,
  logScale = false
): AxisTick[] {
  const domain = scale.domain();
  const ticks = scale.ticks ? scale.ticks(count) : [];
  
  return ticks.map((value, index) => ({
    value,
    label: value instanceof Date 
      ? format(value, 'HH:mm')
      : formatValue(value as number, logScale),
    major: index % 2 === 0 // Every other tick is major
  }));
}

// Color interpolation for gradients
export function interpolateColor(color1: string, color2: string, factor: number): string {
  // Simple RGB interpolation
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Downsample data for performance with LTTB (Largest Triangle Three Bucket) algorithm
export function downsampleData<T extends { time: string }>(
  data: T[],
  maxPoints: number,
  valueKey?: string
): T[] {
  if (data.length <= maxPoints || maxPoints < 3) return data;
  
  if (!valueKey) {
    // Simple uniform downsampling
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0);
  }
  
  // LTTB algorithm for better visual preservation
  const bucketSize = (data.length - 2) / (maxPoints - 2);
  const result: T[] = [data[0]]; // Always include first point
  
  for (let i = 1; i < maxPoints - 1; i++) {
    const avgRangeStart = Math.floor(i * bucketSize) + 1;
    const avgRangeEnd = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeLength = Math.min(avgRangeEnd - avgRangeStart, data.length - avgRangeStart);
    
    if (avgRangeLength <= 0) break;
    
    // Calculate average point for the next bucket
    let avgTime = 0;
    let avgValue = 0;
    for (let j = avgRangeStart; j < avgRangeStart + avgRangeLength; j++) {
      const point = data[j];
      avgTime += new Date(point.time).getTime();
      avgValue += Number(point[valueKey as keyof T]) || 0;
    }
    avgTime /= avgRangeLength;
    avgValue /= avgRangeLength;
    
    // Find point in current bucket with largest triangle area
    const rangeStart = Math.floor((i - 1) * bucketSize) + 1;
    const rangeEnd = Math.floor(i * bucketSize) + 1;
    let maxArea = -1;
    let selectedPoint = data[rangeStart];
    
    const prevPoint = result[result.length - 1];
    const prevTime = new Date(prevPoint.time).getTime();
    const prevValue = Number(prevPoint[valueKey as keyof T]) || 0;
    
    for (let j = rangeStart; j < Math.min(rangeEnd, data.length); j++) {
      const point = data[j];
      const currTime = new Date(point.time).getTime();
      const currValue = Number(point[valueKey as keyof T]) || 0;
      
      // Calculate triangle area
      const area = Math.abs(
        (prevTime - avgTime) * (currValue - prevValue) - 
        (prevTime - currTime) * (avgValue - prevValue)
      ) * 0.5;
      
      if (area > maxArea) {
        maxArea = area;
        selectedPoint = point;
      }
    }
    
    result.push(selectedPoint);
  }
  
  result.push(data[data.length - 1]); // Always include last point
  return result;
}

// Create zoom behavior configuration
export interface ZoomConfig {
  scaleExtent: [number, number];
  translateExtent: [[number, number], [number, number]];
  onZoom?: (transform: { k: number; x: number; y: number }) => void;
}

export function createZoomConfig(
  width: number,
  height: number,
  onZoom?: (transform: { k: number; x: number; y: number }) => void
): ZoomConfig {
  return {
    scaleExtent: [0.1, 50], // Allow 10x zoom out and 50x zoom in
    translateExtent: [[-width * 2, -height * 2], [width * 3, height * 3]],
    onZoom
  };
}

// Create brush selection configuration
export interface BrushConfig {
  extent: [[number, number], [number, number]];
  onBrushEnd?: (selection: [[number, number], [number, number]] | null) => void;
}

export function createBrushConfig(
  width: number,
  height: number,
  onBrushEnd?: (selection: [[number, number], [number, number]] | null) => void
): BrushConfig {
  return {
    extent: [[0, 0], [width, height]],
    onBrushEnd
  };
}

// Debounce utility for performance
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Calculate visible data range based on zoom transform
export function getVisibleDataRange<T extends { time: string }>(
  data: T[],
  timeScale: ScaleFunction,
  transform?: { k: number; x: number; y: number }
): T[] {
  if (!transform || transform.k === 1) return data;
  
  const domain = timeScale.domain() as [Date, Date];
  if (!timeScale.invert) return data;
  
  // Calculate visible time range
  const range = timeScale.range() as [number, number];
  const visibleStart = timeScale.invert((range[0] - transform.x) / transform.k) as Date;
  const visibleEnd = timeScale.invert((range[1] - transform.x) / transform.k) as Date;
  
  return data.filter(d => {
    const time = new Date(d.time);
    return time >= visibleStart && time <= visibleEnd;
  });
}

// Smart tick calculation for zoomed views
export function getSmartTicks(
  scale: ScaleFunction,
  maxTicks: number = 10,
  transform?: { k: number; x: number; y: number }
): Array<{ value: number | Date; label: string; major: boolean }> {
  const domain = scale.domain();
  const range = scale.range();
  
  // Check if this is a time scale by examining the domain
  if (domain[0] instanceof Date) {
    // Time scale
    const timeScale = scale as ScaleFunction;
    const actualRange = transform 
      ? [(range[0] - transform.x) / transform.k, (range[1] - transform.x) / transform.k]
      : range;
      
    const visibleDomain = transform && timeScale.invert
      ? [timeScale.invert(actualRange[0]), timeScale.invert(actualRange[1])] as [Date, Date]
      : domain as [Date, Date];
      
    const duration = visibleDomain[1].getTime() - visibleDomain[0].getTime();
    const tickCount = Math.min(maxTicks, Math.max(3, Math.floor(duration / (1000 * 60 * 30)))); // Minimum 30min intervals
    
    const interval = getOptimalTimeInterval(visibleDomain[0], visibleDomain[1], tickCount);
    const ticks = interval.range(visibleDomain[0], visibleDomain[1]);
    
    return ticks.map((tick, index) => ({
      value: tick,
      label: d3TimeFormat.timeFormat('%H:%M')(tick),
      major: index % 2 === 0
    }));
  } else {
    // Numeric scale
    const ticks = scale.ticks ? scale.ticks(maxTicks) : [];
    return (ticks as number[]).map((tick, index) => ({
      value: tick,
      label: formatValue(tick, false),
      major: index % 2 === 0
    }));
  }
}