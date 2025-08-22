export const technicalReportTemplate = {
  id: 'technical',
  name: 'Technical Analysis',
  description: 'Detailed technical report for specialists',
  
  template: `# Space Weather Technical Analysis
## Report Date: {{date}} UTC

## Solar Activity Analysis

### Active Regions
{{activeRegionTable}}

### Flare Activity (24h)
- X-class: {{xFlareCount}} events {{xFlareList}}
- M-class: {{mFlareCount}} events {{mFlareList}}
- C-class: {{cFlareCount}} events {{cFlareList}}
- Background flux: {{backgroundFlux}}

### CME Analysis
{{cmeAnalysis}}

## Solar Wind Parameters

| Parameter | Current | 24h Avg | 24h Max | Trend |
|-----------|---------|---------|---------|--------|
| Speed (km/s) | {{swSpeed}} | {{swSpeedAvg}} | {{swSpeedMax}} | {{swSpeedTrend}} |
| Density (p/cc) | {{swDensity}} | {{swDensityAvg}} | {{swDensityMax}} | {{swDensityTrend}} |
| Temperature (K) | {{swTemp}} | {{swTempAvg}} | {{swTempMax}} | {{swTempTrend}} |
| Bz (nT) | {{swBz}} | {{swBzAvg}} | {{swBzMin}} | {{swBzTrend}} |
| Phi Angle | {{swPhi}} | - | - | {{swPhiSector}} |

## Geomagnetic Indices

| Index | Current | 24h Max | 3-Day Forecast |
|-------|---------|---------|----------------|
| Kp | {{kpCurrent}} | {{kp24Max}} | {{kpForecast}} |
| Ap | {{apCurrent}} | {{ap24Max}} | {{apForecast}} |
| Dst (nT) | {{dstCurrent}} | {{dst24Min}} | {{dstForecast}} |

## Energetic Particle Environment

### Electron Flux (>2 MeV)
- Current: {{electronFlux}} pfu
- 24h Max: {{electronFluxMax}} pfu
- Status: {{electronStatus}}

### Proton Flux
- >10 MeV: {{proton10}} pfu
- >50 MeV: {{proton50}} pfu
- >100 MeV: {{proton100}} pfu
- Event in progress: {{protonEvent}}

## Space Weather Scales

| Scale | Current | 24h Max | 72h Forecast |
|-------|---------|---------|--------------|
| R (Radio) | {{rCurrent}} | {{rMax}} | {{rForecast}} |
| S (Solar Radiation) | {{sCurrent}} | {{sMax}} | {{sForecast}} |
| G (Geomagnetic) | {{gCurrent}} | {{gMax}} | {{gForecast}} |

## Forecast Discussion

### Solar Activity (72h)
{{solarForecast}}

### Geomagnetic Activity (72h)
{{geomagneticForecast}}

### Energetic Particles (72h)
{{particleForecast}}

## Data Sources & Quality
{{dataSourcesTable}}

---
*Technical analysis generated: {{generatedAt}} UTC*
*Next update expected: {{nextUpdate}} UTC*`,

  prompt: `Generate a highly technical space weather report with:
1. Use acronyms freely (no need to spell out)
2. Include all technical parameters and measurements
3. Provide detailed numerical data and statistics
4. Use scientific terminology throughout
5. Include data tables where appropriate
6. Focus on quantitative analysis
7. Include uncertainty ranges where relevant
8. Provide technical forecast reasoning`,

  requiredFields: [
    'date',
    'activeRegionTable',
    'xFlareCount',
    'mFlareCount',
    'cFlareCount',
    'backgroundFlux',
    'cmeAnalysis',
    'swSpeed',
    'swDensity',
    'swTemp',
    'swBz',
    'swPhi',
    'kpCurrent',
    'apCurrent',
    'dstCurrent',
    'electronFlux',
    'proton10',
    'proton50',
    'proton100',
    'protonEvent',
    'rCurrent',
    'sCurrent',
    'gCurrent',
    'solarForecast',
    'geomagneticForecast',
    'particleForecast'
  ]
}