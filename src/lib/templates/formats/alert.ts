export const alertReportTemplate = {
  id: 'alert',
  name: 'Alert Bulletin',
  description: 'Focused on immediate threats and warnings',
  
  template: `# ⚠️ SPACE WEATHER ALERT BULLETIN
## Issued: {{issuedTime}} UTC

## ALERT STATUS: {{alertLevel}}

### IMMEDIATE THREATS

{{immediateThreats}}

### CURRENT WARNINGS IN EFFECT

{{activeWarnings}}

### SYSTEMS AT RISK

**Critical Infrastructure:**
{{criticalInfrastructure}}

**Technology Systems:**
{{technologySystems}}

**Aviation:**
{{aviationImpacts}}

**Satellite Operations:**
{{satelliteOperations}}

### RECOMMENDED ACTIONS

#### For Satellite Operators:
{{satelliteActions}}

#### For Power Grid Operators:
{{powerGridActions}}

#### For Aviation:
{{aviationActions}}

#### For HF Radio Users:
{{radioActions}}

### EVENT TIMELINE

| Time (UTC) | Event | Impact Level |
|------------|-------|--------------|
{{eventTimeline}}

### FORECAST & DURATION

**Event Duration:** {{eventDuration}}
**Peak Expected:** {{peakTime}}
**Recovery Expected:** {{recoveryTime}}

### TECHNICAL PARAMETERS

- Maximum Kp Expected: {{maxKp}}
- Proton Flux Threshold: {{protonThreshold}}
- X-ray Flux Peak: {{xrayPeak}}
- Solar Wind Speed: {{solarWindSpeed}}

### NEXT UPDATE

This bulletin will be updated at {{nextUpdateTime}} UTC or sooner if conditions warrant.

### CONTACT INFORMATION

For operational support and additional information:
- Emergency Hotline: [As configured]
- Email: [As configured]
- Web: [As configured]

---
**ALERT ID:** {{alertId}}
**Valid Until:** {{validUntil}} UTC`,

  prompt: `Generate an alert-focused space weather bulletin following these requirements:
1. Use clear, urgent language appropriate for operational decisions
2. Focus on immediate threats and impacts
3. Provide specific, actionable recommendations for each sector
4. Include precise timing for events and impacts
5. Use warning/alert terminology consistently
6. Prioritize information by criticality
7. Include specific thresholds and measurements
8. Provide clear timeline of expected events
9. Format for quick scanning and decision-making
10. Include all necessary operational parameters`,

  requiredFields: [
    'issuedTime',
    'alertLevel',
    'immediateThreats',
    'activeWarnings',
    'criticalInfrastructure',
    'technologySystems',
    'aviationImpacts',
    'satelliteOperations',
    'satelliteActions',
    'powerGridActions',
    'aviationActions',
    'radioActions',
    'eventTimeline',
    'eventDuration',
    'peakTime',
    'recoveryTime',
    'maxKp',
    'protonThreshold',
    'xrayPeak',
    'solarWindSpeed',
    'nextUpdateTime',
    'alertId',
    'validUntil'
  ]
}