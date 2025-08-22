export const publicReportTemplate = {
  id: 'public',
  name: 'Public Summary',
  description: 'Simplified report for general public',
  
  template: `# Space Weather Update
## {{date}}

## What's Happening with the Sun Today? ☀️

{{publicSummary}}

### Solar Activity Level: {{activityLevel}}

The Sun has been {{activityDescription}}. {{publicFlareExplanation}}

### Will We See Aurora Tonight? 🌌

{{auroraForecast}}

### Technology Impacts 📱💻

**GPS & Navigation:** {{gpsStatus}}
**Radio Communications:** {{radioStatus}}
**Satellite Operations:** {{satelliteStatus}}
**Power Grids:** {{powerStatus}}

### What to Expect Over the Next 3 Days

{{threeDayOutlook}}

### Fun Space Weather Fact

{{funFact}}

### Stay Informed

- Current space weather scale levels: {{scalesSummary}}
- Aurora visibility forecast: {{auroraVisibility}}
- Best time for aurora viewing (if applicable): {{bestViewingTime}}

---
*This report explains current space weather conditions in simple terms. For more detailed information, visit your national space weather service.*

*Last updated: {{generatedAt}}*`,

  prompt: `Generate a public-friendly space weather report following these guidelines:
1. Use simple, non-technical language
2. Avoid or explain all acronyms and technical terms
3. Focus on practical impacts that matter to everyday people
4. Include aurora viewing information if relevant
5. Explain technology impacts in relatable terms
6. Use analogies to help explain complex concepts
7. Keep it concise and easy to understand
8. Include a fun or interesting space weather fact
9. Use friendly, engaging tone
10. Focus on what people can see or experience`,

  requiredFields: [
    'date',
    'publicSummary',
    'activityLevel',
    'activityDescription',
    'publicFlareExplanation',
    'auroraForecast',
    'gpsStatus',
    'radioStatus',
    'satelliteStatus',
    'powerStatus',
    'threeDayOutlook',
    'funFact',
    'scalesSummary',
    'auroraVisibility',
    'bestViewingTime'
  ]
}