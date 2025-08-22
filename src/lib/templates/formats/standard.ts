export const standardReportTemplate = {
  id: 'standard',
  name: 'Standard Report',
  description: 'Comprehensive overview suitable for most users',
  
  template: `# Sun news {{date}}: {{headline}}
## (11 UTC to 11 UTC)

**Today's top story:** {{topStory}}

### Current Conditions

- **Flare activity** is *{{flareLevel}}*. {{flareDetails}}
- **There are currently {{sunspotCount}} sunspot regions** on the Earth-facing disk. {{activeRegionDetails}}
- **Blasts from the sun?** {{cmeDetails}}
- **Solar wind** conditions {{solarWindStatus}}, {{solarWindDetails}}. These are {{solarWindAssessment}} solar wind conditions.
- **Earth's magnetic field** has been {{geomagneticStatus}} (Kp = {{kpRange}}). {{geomagneticDetails}}. As of this writing, the Kp index is at {{currentKp}}.

### What's ahead? Sun-Earth forecast

- **{{flareActivityForecast}}**: The chance for M (moderate) flares is {{mFlareChance}}% today, and the chance for X (strong) flares is {{xFlareChance}}% today.
- **Geomagnetic activity forecast:** {{geomagneticForecast}}

---
*Report generated on {{generatedAt}}*`,

  prompt: `Generate a standard space weather report with the following exact structure:

# Sun news [Today's Date]: [Create a compelling headline]
## (11 UTC to 11 UTC)

**Today's top story:** [Write an engaging lead paragraph about the most significant space weather event or condition]

### Current Conditions

- **Flare activity** is *[low/moderate/high]*. [Provide specific details about recent flares, including class and times]
- **There are currently [number] sunspot regions** on the Earth-facing disk. [Describe the active regions, especially any complex or threatening ones]
- **Blasts from the sun?** [Describe any CMEs, their speed, direction, and expected arrival times]
- **Solar wind** conditions [are calm/elevated/disturbed], [provide specific speed and density values]. These are [quiet/moderate/disturbed] solar wind conditions.
- **Earth's magnetic field** has been [quiet/unsettled/active] (Kp = [range]). [Describe recent geomagnetic activity and aurora visibility]. As of this writing, the Kp index is at [current value].

### What's ahead? Sun-Earth forecast

- **[Flare activity outlook]**: The chance for M (moderate) flares is [X]% today, and the chance for X (strong) flares is [Y]% today.
- **Geomagnetic activity forecast:** [Describe expected conditions for the next 3 days]

Style guidelines:
1. Write in a conversational, engaging style similar to a news report
2. Use specific numbers, times, and measurements from the data
3. Focus on Earth-relevant impacts (auroras, storms, technology effects)
4. Include region numbers (AR####) for active regions
5. Use proper space weather terminology (CIR, CH HSS, CME, IMF, Bz)
6. Mention specific timing for expected events
7. Keep paragraphs flowing naturally
8. Make the top story compelling and relevant to readers
9. Spell out the first use of a term with the acronym in parenthesis e.g. Coronal mass ejection (CME)`,

  requiredFields: [
    'date',
    'headline',
    'topStory',
    'flareLevel',
    'flareDetails',
    'sunspotCount',
    'activeRegionDetails',
    'cmeDetails',
    'solarWindStatus',
    'solarWindDetails',
    'solarWindAssessment',
    'geomagneticStatus',
    'kpRange',
    'geomagneticDetails',
    'currentKp',
    'flareActivityForecast',
    'mFlareChance',
    'xFlareChance',
    'geomagneticForecast'
  ]
}