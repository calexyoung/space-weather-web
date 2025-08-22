export const socialMediaTemplates = {
  id: 'social-media',
  name: 'Social Media Post',
  description: 'Optimized posts for social media platforms',
  
  templates: {
    general: {
      name: 'General Social Media',
      maxLength: null,
      template: `🌟 SPACE WEATHER UPDATE {{date}} 🌟

{{headline}}

{{mainContent}}

Current Conditions:
☀️ Solar Activity: {{solarStatus}}
🌍 Geomagnetic: {{geoStatus}}
🌌 Aurora Chance: {{auroraChance}}

{{forecast}}

{{hashtags}}

🔗 Full report: {{reportLink}}`,
      
      prompt: `Create an engaging social media post about current space weather:
1. Use emojis appropriately to increase engagement
2. Lead with the most interesting or impactful information
3. Keep language simple and exciting
4. Include relevant hashtags
5. Make it shareable and interesting to general audience
6. Include aurora information if relevant
7. Add a call-to-action if appropriate`
    },
    
    threads: {
      name: 'Threads/Twitter',
      maxLength: 500,
      template: `{{headline}} 🛰️

☀️ Solar: {{solarBrief}}
🌍 Geo: {{geoBrief}}
🌌 Aurora: {{auroraBrief}}

Next 24h: {{forecast24}}

{{hashtags}}`,
      
      prompt: `Create a concise space weather update for Threads (max 500 characters):
1. Focus on the most important information
2. Use abbreviations where necessary
3. Include 2-3 relevant hashtags
4. Make every character count
5. Include emoji for visual appeal but sparingly`
    },
    
    bluesky: {
      name: 'Bluesky',
      maxLength: 300,
      template: `{{headline}} 

Solar: {{solarMin}}
Geo: {{geoMin}}
{{auroraMin}}

{{miniHashtags}}`,
      
      prompt: `Create an ultra-concise space weather update for Bluesky (max 300 characters):
1. Only the most critical information
2. Minimal but impactful emoji use
3. 1-2 hashtags maximum
4. Focus on what matters most right now`
    },
    
    instagram: {
      name: 'Instagram',
      maxLength: 2200,
      template: `{{headline}} 🌟

Today's space weather story: {{storyLead}}

📊 CURRENT CONDITIONS
• Solar Activity: {{solarDetailed}}
• Geomagnetic Field: {{geoDetailed}}
• Solar Wind: {{solarWindDetailed}}
• Particle Environment: {{particleDetailed}}

🔮 FORECAST
{{detailedForecast}}

🌌 AURORA OUTLOOK
{{auroraDetailed}}

💡 DID YOU KNOW?
{{spaceFact}}

📱 IMPACTS
{{impactSummary}}

{{longHashtags}}

📸 Swipe for visualizations →`,
      
      prompt: `Create a detailed Instagram post about space weather:
1. Make it educational and visually descriptive
2. Use emojis as bullet points and section markers
3. Include interesting facts
4. Format for easy reading on mobile
5. Include comprehensive hashtags (15-20)
6. Suggest visual elements that could accompany
7. Make it informative yet accessible`
    },
    
    linkedin: {
      name: 'LinkedIn',
      maxLength: 3000,
      template: `Space Weather Operational Update - {{date}}

{{professionalHeadline}}

Key Metrics:
• Kp Index: {{kpValue}}
• Solar Wind: {{swSpeed}} km/s
• Proton Flux: {{protonFlux}} pfu
• X-ray Flux: {{xrayClass}}

Operational Impacts:
{{operationalImpacts}}

Sector-Specific Guidance:
• Satellite Operations: {{satelliteGuidance}}
• Aviation: {{aviationGuidance}}
• Power Systems: {{powerGuidance}}
• Communications: {{commsGuidance}}

72-Hour Forecast:
{{professionalForecast}}

Risk Assessment: {{riskLevel}}

{{professionalHashtags}}`,
      
      prompt: `Create a professional LinkedIn post about space weather for industry professionals:
1. Use formal, professional language
2. Focus on operational impacts and business relevance
3. Include specific metrics and data
4. Provide actionable intelligence
5. Use industry-standard terminology
6. Include professional hashtags
7. Make it valuable for decision-makers`
    }
  },
  
  commonHashtags: {
    general: ['#SpaceWeather', '#SolarActivity', '#Aurora', '#SolarStorm', '#SpaceScience'],
    technical: ['#SolarFlare', '#GeomagneticStorm', '#CME', '#SolarWind', '#SpacePhysics'],
    aurora: ['#AuroraBorealis', '#NorthernLights', '#AuroraWatch', '#AuroraHunters'],
    impact: ['#SpaceWeatherImpacts', '#SatelliteOperations', '#GPSDisruption', '#RadioBlackout'],
    professional: ['#SpaceWeatherOperations', '#CriticalInfrastructure', '#RiskManagement', '#SpaceSituationalAwareness']
  }
}