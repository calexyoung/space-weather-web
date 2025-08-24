import { NextResponse } from 'next/server'

const NOAA_BASE_URL = 'https://services.swpc.noaa.gov'

export interface AlertCriteria {
  id: string
  name: string
  category: 'solar' | 'geomagnetic' | 'radiation' | 'radio' | 'satellite'
  parameter: string
  operator: '>' | '<' | '>=' | '<=' | '=='
  threshold: number
  unit: string
  severity: 'info' | 'warning' | 'alert' | 'critical'
  cooldownMinutes: number // Prevent spam
}

export interface ActiveAlert {
  id: string
  criteriaId: string
  name: string
  category: string
  severity: 'info' | 'warning' | 'alert' | 'critical'
  message: string
  value: number
  threshold: number
  unit: string
  triggeredAt: Date
  expiresAt: Date
  dataSource: string
  recommendations: string[]
}

export interface AlertEngineStatus {
  operational: boolean
  lastCheck: Date
  nextCheck: Date
  monitoredParameters: number
  activeAlerts: ActiveAlert[]
  recentAlerts: ActiveAlert[] // Last 24 hours
  statistics: {
    totalAlertsToday: number
    alertsBySeverity: {
      info: number
      warning: number
      alert: number
      critical: number
    }
    alertsByCategory: {
      solar: number
      geomagnetic: number
      radiation: number
      radio: number
      satellite: number
    }
  }
}

// Define alert criteria
const ALERT_CRITERIA: AlertCriteria[] = [
  // Solar Flare Alerts
  {
    id: 'xray-m-class',
    name: 'M-Class Solar Flare',
    category: 'solar',
    parameter: 'xray_flux',
    operator: '>=',
    threshold: 1e-5,
    unit: 'W/m²',
    severity: 'warning',
    cooldownMinutes: 30
  },
  {
    id: 'xray-x-class',
    name: 'X-Class Solar Flare',
    category: 'solar',
    parameter: 'xray_flux',
    operator: '>=',
    threshold: 1e-4,
    unit: 'W/m²',
    severity: 'critical',
    cooldownMinutes: 60
  },
  
  // Geomagnetic Storm Alerts
  {
    id: 'kp-minor-storm',
    name: 'Minor Geomagnetic Storm',
    category: 'geomagnetic',
    parameter: 'kp_index',
    operator: '>=',
    threshold: 5,
    unit: '',
    severity: 'info',
    cooldownMinutes: 180
  },
  {
    id: 'kp-major-storm',
    name: 'Major Geomagnetic Storm',
    category: 'geomagnetic',
    parameter: 'kp_index',
    operator: '>=',
    threshold: 7,
    unit: '',
    severity: 'alert',
    cooldownMinutes: 180
  },
  {
    id: 'kp-severe-storm',
    name: 'Severe Geomagnetic Storm',
    category: 'geomagnetic',
    parameter: 'kp_index',
    operator: '>=',
    threshold: 9,
    unit: '',
    severity: 'critical',
    cooldownMinutes: 360
  },
  
  // Solar Wind Alerts
  {
    id: 'solar-wind-high',
    name: 'High Speed Solar Wind',
    category: 'solar',
    parameter: 'solar_wind_speed',
    operator: '>=',
    threshold: 600,
    unit: 'km/s',
    severity: 'warning',
    cooldownMinutes: 120
  },
  {
    id: 'solar-wind-extreme',
    name: 'Extreme Solar Wind',
    category: 'solar',
    parameter: 'solar_wind_speed',
    operator: '>=',
    threshold: 800,
    unit: 'km/s',
    severity: 'alert',
    cooldownMinutes: 120
  },
  
  // Magnetic Field Alerts
  {
    id: 'bz-south-moderate',
    name: 'Southward Bz (Moderate)',
    category: 'geomagnetic',
    parameter: 'bz_gsm',
    operator: '<=',
    threshold: -10,
    unit: 'nT',
    severity: 'warning',
    cooldownMinutes: 60
  },
  {
    id: 'bz-south-strong',
    name: 'Southward Bz (Strong)',
    category: 'geomagnetic',
    parameter: 'bz_gsm',
    operator: '<=',
    threshold: -20,
    unit: 'nT',
    severity: 'alert',
    cooldownMinutes: 60
  },
  
  // Radiation Storm Alerts
  {
    id: 'proton-s1',
    name: 'S1 Minor Radiation Storm',
    category: 'radiation',
    parameter: 'proton_flux_10mev',
    operator: '>=',
    threshold: 10,
    unit: 'pfu',
    severity: 'info',
    cooldownMinutes: 120
  },
  {
    id: 'proton-s2',
    name: 'S2 Moderate Radiation Storm',
    category: 'radiation',
    parameter: 'proton_flux_10mev',
    operator: '>=',
    threshold: 100,
    unit: 'pfu',
    severity: 'warning',
    cooldownMinutes: 120
  },
  {
    id: 'proton-s3',
    name: 'S3 Strong Radiation Storm',
    category: 'radiation',
    parameter: 'proton_flux_10mev',
    operator: '>=',
    threshold: 1000,
    unit: 'pfu',
    severity: 'alert',
    cooldownMinutes: 180
  },
  {
    id: 'proton-s4',
    name: 'S4 Severe Radiation Storm',
    category: 'radiation',
    parameter: 'proton_flux_10mev',
    operator: '>=',
    threshold: 10000,
    unit: 'pfu',
    severity: 'critical',
    cooldownMinutes: 360
  },
  
  // Electron Flux Alerts
  {
    id: 'electron-high',
    name: 'High Electron Flux',
    category: 'satellite',
    parameter: 'electron_flux_2mev',
    operator: '>=',
    threshold: 1000,
    unit: 'e/(cm²·s·sr)',
    severity: 'warning',
    cooldownMinutes: 240
  },
  
  // Radio Blackout Alerts
  {
    id: 'radio-r1',
    name: 'R1 Minor Radio Blackout',
    category: 'radio',
    parameter: 'xray_flux',
    operator: '>=',
    threshold: 1e-5,
    unit: 'W/m²',
    severity: 'info',
    cooldownMinutes: 60
  },
  {
    id: 'radio-r3',
    name: 'R3 Strong Radio Blackout',
    category: 'radio',
    parameter: 'xray_flux',
    operator: '>=',
    threshold: 1e-4,
    unit: 'W/m²',
    severity: 'alert',
    cooldownMinutes: 120
  },
  
  // DST Alerts
  {
    id: 'dst-storm',
    name: 'Geomagnetic Storm (DST)',
    category: 'geomagnetic',
    parameter: 'dst_index',
    operator: '<=',
    threshold: -50,
    unit: 'nT',
    severity: 'warning',
    cooldownMinutes: 180
  },
  {
    id: 'dst-intense',
    name: 'Intense Storm (DST)',
    category: 'geomagnetic',
    parameter: 'dst_index',
    operator: '<=',
    threshold: -100,
    unit: 'nT',
    severity: 'alert',
    cooldownMinutes: 240
  }
]

// Track cooldowns in memory (in production, use Redis)
const cooldowns = new Map<string, Date>()
const alertHistory: ActiveAlert[] = []

async function fetchCurrentData(): Promise<Map<string, number>> {
  const data = new Map<string, number>()
  
  try {
    // Fetch multiple data sources in parallel
    const [
      xrayResponse,
      kpResponse,
      solarWindResponse,
      protonResponse,
      dstResponse
    ] = await Promise.all([
      fetch(`${NOAA_BASE_URL}/json/goes/primary/xrays-1-day.json`).catch(() => null),
      fetch(`${NOAA_BASE_URL}/products/noaa-planetary-k-index.json`).catch(() => null),
      fetch(`${NOAA_BASE_URL}/products/solar-wind/plasma-7-day.json`).catch(() => null),
      fetch(`${NOAA_BASE_URL}/json/goes/primary/integral-protons-1-day.json`).catch(() => null),
      fetch(`${NOAA_BASE_URL}/json/geospace/geospace_dst_1_hour.json`).catch(() => null)
    ])
    
    // Process X-ray flux
    if (xrayResponse && xrayResponse.ok) {
      const xrayData = await xrayResponse.json()
      if (Array.isArray(xrayData) && xrayData.length > 0) {
        const latest = xrayData[xrayData.length - 1]
        data.set('xray_flux', parseFloat(latest.flux) || 0)
      }
    }
    
    // Process Kp index
    if (kpResponse && kpResponse.ok) {
      const kpData = await kpResponse.json()
      if (Array.isArray(kpData) && kpData.length > 0) {
        const latest = kpData[kpData.length - 1]
        data.set('kp_index', parseFloat(latest.kp) || 0)
      }
    }
    
    // Process solar wind
    if (solarWindResponse && solarWindResponse.ok) {
      const swData = await solarWindResponse.json()
      if (Array.isArray(swData) && swData.length > 0) {
        const validData = swData.filter((d: any[]) => d[1] !== null && d[2] !== null)
        if (validData.length > 0) {
          const latest = validData[validData.length - 1]
          data.set('solar_wind_speed', parseFloat(latest[2]) || 400)
          data.set('bz_gsm', parseFloat(latest[6]) || 0)
        }
      }
    }
    
    // Process proton flux
    if (protonResponse && protonResponse.ok) {
      const protonData = await protonResponse.json()
      if (Array.isArray(protonData) && protonData.length > 0) {
        const latest = protonData[protonData.length - 1]
        data.set('proton_flux_10mev', parseFloat(latest.flux) || 0.1)
      }
    }
    
    // Process DST index
    if (dstResponse && dstResponse.ok) {
      const dstData = await dstResponse.json()
      if (Array.isArray(dstData) && dstData.length > 0) {
        const latest = dstData[dstData.length - 1]
        data.set('dst_index', parseFloat(latest.dst) || 0)
      }
    }
    
    // Add electron flux (simplified - would need real endpoint)
    data.set('electron_flux_2mev', 100) // Placeholder
    
  } catch (error) {
    console.error('Error fetching alert data:', error)
  }
  
  return data
}

function checkCriteria(criteria: AlertCriteria, value: number): boolean {
  switch (criteria.operator) {
    case '>': return value > criteria.threshold
    case '<': return value < criteria.threshold
    case '>=': return value >= criteria.threshold
    case '<=': return value <= criteria.threshold
    case '==': return value === criteria.threshold
    default: return false
  }
}

function generateRecommendations(alert: AlertCriteria): string[] {
  const recommendations: string[] = []
  
  switch (alert.category) {
    case 'solar':
      if (alert.id.includes('x-class')) {
        recommendations.push('Monitor HF radio communications')
        recommendations.push('Check satellite operations')
        recommendations.push('Review power grid protection')
      } else if (alert.id.includes('m-class')) {
        recommendations.push('Minor HF radio fade possible')
        recommendations.push('Monitor polar routes')
      }
      break
      
    case 'geomagnetic':
      if (alert.severity === 'critical') {
        recommendations.push('Power grids may experience voltage control problems')
        recommendations.push('Satellite operations may be affected')
        recommendations.push('Aurora visible at lower latitudes')
      } else if (alert.severity === 'alert') {
        recommendations.push('GPS accuracy may be degraded')
        recommendations.push('Increased drag on satellites')
      }
      break
      
    case 'radiation':
      if (alert.severity === 'critical' || alert.severity === 'alert') {
        recommendations.push('Avoid high-altitude flights at polar latitudes')
        recommendations.push('EVA should be postponed')
        recommendations.push('Monitor astronaut radiation exposure')
      } else {
        recommendations.push('Monitor radiation levels for aviation')
      }
      break
      
    case 'radio':
      recommendations.push('HF radio propagation affected')
      recommendations.push('Use alternate communication methods')
      break
      
    case 'satellite':
      recommendations.push('Monitor satellite anomalies')
      recommendations.push('Consider safe mode for sensitive instruments')
      break
  }
  
  return recommendations
}

export async function GET() {
  try {
    // Fetch current data
    const currentData = await fetchCurrentData()
    const now = new Date()
    const activeAlerts: ActiveAlert[] = []
    
    // Check each criteria
    for (const criteria of ALERT_CRITERIA) {
      const value = currentData.get(criteria.parameter)
      
      if (value !== undefined && checkCriteria(criteria, value)) {
        // Check cooldown
        const lastAlert = cooldowns.get(criteria.id)
        if (lastAlert && now.getTime() - lastAlert.getTime() < criteria.cooldownMinutes * 60000) {
          continue // Skip due to cooldown
        }
        
        // Create alert
        const alert: ActiveAlert = {
          id: `${criteria.id}_${now.getTime()}`,
          criteriaId: criteria.id,
          name: criteria.name,
          category: criteria.category,
          severity: criteria.severity,
          message: `${criteria.name}: ${value}${criteria.unit} ${criteria.operator} ${criteria.threshold}${criteria.unit} threshold`,
          value,
          threshold: criteria.threshold,
          unit: criteria.unit,
          triggeredAt: now,
          expiresAt: new Date(now.getTime() + criteria.cooldownMinutes * 60000),
          dataSource: 'NOAA SWPC',
          recommendations: generateRecommendations(criteria)
        }
        
        activeAlerts.push(alert)
        alertHistory.push(alert)
        cooldowns.set(criteria.id, now)
      }
    }
    
    // Clean up old alerts from history (keep 24 hours)
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const recentAlerts = alertHistory.filter(a => a.triggeredAt > dayAgo)
    
    // Calculate statistics
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayAlerts = recentAlerts.filter(a => a.triggeredAt >= todayStart)
    
    const alertsBySeverity = {
      info: todayAlerts.filter(a => a.severity === 'info').length,
      warning: todayAlerts.filter(a => a.severity === 'warning').length,
      alert: todayAlerts.filter(a => a.severity === 'alert').length,
      critical: todayAlerts.filter(a => a.severity === 'critical').length
    }
    
    const alertsByCategory = {
      solar: todayAlerts.filter(a => a.category === 'solar').length,
      geomagnetic: todayAlerts.filter(a => a.category === 'geomagnetic').length,
      radiation: todayAlerts.filter(a => a.category === 'radiation').length,
      radio: todayAlerts.filter(a => a.category === 'radio').length,
      satellite: todayAlerts.filter(a => a.category === 'satellite').length
    }
    
    const status: AlertEngineStatus = {
      operational: true,
      lastCheck: now,
      nextCheck: new Date(now.getTime() + 60000), // Check every minute
      monitoredParameters: ALERT_CRITERIA.length,
      activeAlerts,
      recentAlerts: recentAlerts.slice(-10), // Last 10 alerts
      statistics: {
        totalAlertsToday: todayAlerts.length,
        alertsBySeverity,
        alertsByCategory
      }
    }
    
    return NextResponse.json(status, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Always fresh for alerts
      },
    })
    
  } catch (error) {
    console.error('Alert engine error:', error)
    
    const errorStatus: AlertEngineStatus = {
      operational: false,
      lastCheck: new Date(),
      nextCheck: new Date(Date.now() + 60000),
      monitoredParameters: ALERT_CRITERIA.length,
      activeAlerts: [],
      recentAlerts: [],
      statistics: {
        totalAlertsToday: 0,
        alertsBySeverity: { info: 0, warning: 0, alert: 0, critical: 0 },
        alertsByCategory: { solar: 0, geomagnetic: 0, radiation: 0, radio: 0, satellite: 0 }
      }
    }
    
    return NextResponse.json(errorStatus, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  }
}