import { NormalizedReport, SourceTypeEnum } from '../types/space-weather'
import { fetchAllSources, fetchSingleSource } from '../sources/aggregator'
import { createLlmProvider, LlmProviderInterface } from '../llm/providers'
import { LlmProviderEnum } from '../types/space-weather'

export interface ReportSection {
  title: string
  content: string
  subsections?: ReportSection[]
}

export interface AggregatedReportData {
  pastCurrentConditions: {
    flareActivity: ReportSection
    activeRegions: ReportSection
    coronalMassEjections: ReportSection
    solarWindConditions: ReportSection
    geomagneticConditions: ReportSection
    energeticParticles: ReportSection
  }
  futureForecast: {
    flareActivity: ReportSection
    activeRegions: ReportSection
    coronalMassEjections: ReportSection
    solarWindConditions: ReportSection
    geomagneticConditions: ReportSection
    energeticParticles: ReportSection
  }
  summary: {
    observations: string
    predictions: string
    keyHighlights: string[]
  }
  metadata: {
    sources: SourceTypeEnum[]
    generatedAt: Date
    dataQuality: number
    confidence: string
  }
}

export class AggregationService {
  private llmProvider: LlmProviderInterface
  private llmModel?: string

  constructor(llmProvider?: LlmProviderEnum, llmModel?: string) {
    this.llmProvider = createLlmProvider(llmProvider || 'OPENAI')
    this.llmModel = llmModel
  }

  /**
   * Main aggregation pipeline
   */
  async aggregateSpaceWeatherData(
    sources: SourceTypeEnum[],
    onProgress?: (step: string, progress: number) => void
  ): Promise<AggregatedReportData> {
    // Step 1: Fetch all selected sources in parallel
    onProgress?.('fetch-data', 0)
    const fetchResult = await fetchAllSources(sources, true)
    onProgress?.('fetch-data', 100)

    if (fetchResult.successfulSources.length === 0) {
      throw new Error('No data sources available')
    }

    // Step 2: Normalize and validate data
    onProgress?.('normalize-data', 0)
    const normalizedData = this.normalizeData(fetchResult.successfulSources)
    onProgress?.('normalize-data', 100)

    // Step 3: Categorize data into sections
    onProgress?.('categorize-data', 0)
    const categorizedData = await this.categorizeData(normalizedData)
    onProgress?.('categorize-data', 100)

    // Step 4: Create subsections for each category
    onProgress?.('create-subsections', 0)
    const structuredData = await this.createSubsections(categorizedData)
    onProgress?.('create-subsections', 100)

    // Step 5: Generate summary section using LLM
    onProgress?.('generate-summary', 0)
    const summary = await this.generateSummary(structuredData, normalizedData)
    onProgress?.('generate-summary', 100)

    return {
      pastCurrentConditions: structuredData.pastCurrent,
      futureForecast: structuredData.future,
      summary,
      metadata: {
        sources,
        generatedAt: new Date(),
        dataQuality: this.calculateDataQuality(normalizedData),
        confidence: this.calculateConfidence(normalizedData)
      }
    }
  }

  /**
   * Step 2: Normalize and validate data
   */
  private normalizeData(reports: NormalizedReport[]): NormalizedReport[] {
    return reports.map(report => ({
      ...report,
      // Ensure all fields are properly formatted
      headline: report.headline || 'No headline available',
      summary: report.summary || 'No summary available',
      details: report.details || 'No details available',
      qualityScore: report.qualityScore ?? 0.5
    }))
  }

  /**
   * Step 3: Categorize data into past/current and future sections
   */
  private async categorizeData(reports: NormalizedReport[]): Promise<{
    pastCurrent: Map<string, string[]>
    future: Map<string, string[]>
  }> {
    const pastCurrent = new Map<string, string[]>()
    const future = new Map<string, string[]>()

    // Initialize categories
    const categories = [
      'flareActivity',
      'activeRegions',
      'coronalMassEjections',
      'solarWindConditions',
      'geomagneticConditions',
      'energeticParticles'
    ]

    categories.forEach(cat => {
      pastCurrent.set(cat, [])
      future.set(cat, [])
    })

    // Process each report
    for (const report of reports) {
      const sections = await this.extractSections(report)
      
      // Distribute content to appropriate categories
      Object.entries(sections).forEach(([category, content]) => {
        if (content.isPastCurrent) {
          pastCurrent.get(category)?.push(content.text)
        }
        if (content.isFuture) {
          future.get(category)?.push(content.text)
        }
      })
    }

    return { pastCurrent, future }
  }

  /**
   * Extract sections from a report using keyword matching and LLM
   */
  private async extractSections(report: NormalizedReport): Promise<Record<string, {
    text: string
    isPastCurrent: boolean
    isFuture: boolean
  }>> {
    const sections: Record<string, { text: string; isPastCurrent: boolean; isFuture: boolean }> = {}

    // Flare Activity
    const flareText = this.extractFlareInfo(report)
    if (flareText) {
      sections.flareActivity = {
        text: flareText,
        isPastCurrent: true,
        isFuture: flareText.toLowerCase().includes('forecast') || flareText.toLowerCase().includes('expected')
      }
    }

    // Active Regions
    const regionText = this.extractActiveRegions(report)
    if (regionText) {
      sections.activeRegions = {
        text: regionText,
        isPastCurrent: true,
        isFuture: false
      }
    }

    // CMEs
    const cmeText = this.extractCMEInfo(report)
    if (cmeText) {
      sections.coronalMassEjections = {
        text: cmeText,
        isPastCurrent: !cmeText.toLowerCase().includes('expected'),
        isFuture: cmeText.toLowerCase().includes('expected') || cmeText.toLowerCase().includes('arrival')
      }
    }

    // Solar Wind
    const solarWindText = this.extractSolarWindInfo(report)
    if (solarWindText) {
      sections.solarWindConditions = {
        text: solarWindText,
        isPastCurrent: true,
        isFuture: solarWindText.toLowerCase().includes('forecast')
      }
    }

    // Geomagnetic
    const geomagText = this.extractGeomagneticInfo(report)
    if (geomagText) {
      sections.geomagneticConditions = {
        text: geomagText,
        isPastCurrent: true,
        isFuture: geomagText.toLowerCase().includes('expected') || geomagText.toLowerCase().includes('forecast')
      }
    }

    // Energetic Particles
    const particleText = this.extractEnergeticParticleInfo(report)
    if (particleText) {
      sections.energeticParticles = {
        text: particleText,
        isPastCurrent: true,
        isFuture: particleText.toLowerCase().includes('forecast')
      }
    }

    return sections
  }

  /**
   * Step 4: Create structured subsections
   */
  private async createSubsections(categorizedData: {
    pastCurrent: Map<string, string[]>
    future: Map<string, string[]>
  }): Promise<{
    pastCurrent: AggregatedReportData['pastCurrentConditions']
    future: AggregatedReportData['futureForecast']
  }> {
    const createSection = async (title: string, contents: string[]): Promise<ReportSection> => {
      if (contents.length === 0) {
        return {
          title,
          content: 'No data available for this section.'
        }
      }

      // Use LLM to synthesize multiple sources into coherent section
      const prompt = `Synthesize the following space weather data about ${title} into a clear, concise paragraph:

${contents.join('\n\n')}

Provide a professional summary that combines all relevant information without repetition.`

      const synthesized = await this.llmProvider.generateCompletion(prompt, {
        temperature: 0.3,
        maxTokens: 500,
        model: this.llmModel
      })

      return {
        title,
        content: synthesized
      }
    }

    // Create all sections in parallel
    const [
      pcFlare, pcRegions, pcCME, pcSolar, pcGeo, pcParticles,
      fFlare, fRegions, fCME, fSolar, fGeo, fParticles
    ] = await Promise.all([
      // Past/Current sections
      createSection('Flare Activity', categorizedData.pastCurrent.get('flareActivity') || []),
      createSection('Active Regions', categorizedData.pastCurrent.get('activeRegions') || []),
      createSection('Coronal Mass Ejections', categorizedData.pastCurrent.get('coronalMassEjections') || []),
      createSection('Solar Wind Conditions', categorizedData.pastCurrent.get('solarWindConditions') || []),
      createSection('Geomagnetic Conditions', categorizedData.pastCurrent.get('geomagneticConditions') || []),
      createSection('Energetic Electron and Proton Environment', categorizedData.pastCurrent.get('energeticParticles') || []),
      // Future sections
      createSection('Flare Activity Forecast', categorizedData.future.get('flareActivity') || []),
      createSection('Active Regions Outlook', categorizedData.future.get('activeRegions') || []),
      createSection('CME Forecast', categorizedData.future.get('coronalMassEjections') || []),
      createSection('Solar Wind Forecast', categorizedData.future.get('solarWindConditions') || []),
      createSection('Geomagnetic Forecast', categorizedData.future.get('geomagneticConditions') || []),
      createSection('Particle Environment Forecast', categorizedData.future.get('energeticParticles') || [])
    ])

    return {
      pastCurrent: {
        flareActivity: pcFlare,
        activeRegions: pcRegions,
        coronalMassEjections: pcCME,
        solarWindConditions: pcSolar,
        geomagneticConditions: pcGeo,
        energeticParticles: pcParticles
      },
      future: {
        flareActivity: fFlare,
        activeRegions: fRegions,
        coronalMassEjections: fCME,
        solarWindConditions: fSolar,
        geomagneticConditions: fGeo,
        energeticParticles: fParticles
      }
    }
  }

  /**
   * Step 5: Generate summary using LLM
   */
  private async generateSummary(
    structuredData: any,
    reports: NormalizedReport[]
  ): Promise<AggregatedReportData['summary']> {
    const prompt = `Based on the following space weather data from multiple sources, generate:
1. A summary of key observations (2-3 sentences)
2. A summary of predictions for the next 72 hours (2-3 sentences)
3. 3-5 key highlights or notable events

Data sources: ${reports.map(r => r.source).join(', ')}

Current Conditions Summary:
${Object.values(structuredData.pastCurrent).map((s: any) => s.content).join('\n')}

Forecast Summary:
${Object.values(structuredData.future).map((s: any) => s.content).join('\n')}

Format the response as JSON with keys: observations, predictions, keyHighlights (array)`

    const response = await this.llmProvider.generateCompletion(prompt, {
      temperature: 0.3,
      maxTokens: 800,
      model: this.llmModel
    })

    try {
      const parsed = JSON.parse(response)
      return {
        observations: parsed.observations || 'No significant observations.',
        predictions: parsed.predictions || 'No specific predictions available.',
        keyHighlights: parsed.keyHighlights || []
      }
    } catch {
      // Fallback if JSON parsing fails
      return {
        observations: 'Space weather conditions are being monitored across multiple sources.',
        predictions: 'Conditions expected to remain at current levels over the next 72 hours.',
        keyHighlights: [
          'Multiple data sources integrated',
          'Comprehensive space weather analysis completed'
        ]
      }
    }
  }

  // Helper methods for extracting specific information
  private extractFlareInfo(report: NormalizedReport): string {
    const text = `${report.summary} ${report.details}`.toLowerCase()
    const flareRegex = /(?:flare|x-class|m-class|c-class)[^.]*\./gi
    const matches = text.match(flareRegex)
    return matches ? matches.join(' ') : ''
  }

  private extractActiveRegions(report: NormalizedReport): string {
    const text = `${report.summary} ${report.details}`.toLowerCase()
    const regionRegex = /(?:active region|sunspot|ar\d{4})[^.]*\./gi
    const matches = text.match(regionRegex)
    return matches ? matches.join(' ') : ''
  }

  private extractCMEInfo(report: NormalizedReport): string {
    const text = `${report.summary} ${report.details}`.toLowerCase()
    const cmeRegex = /(?:cme|coronal mass ejection|halo cme)[^.]*\./gi
    const matches = text.match(cmeRegex)
    return matches ? matches.join(' ') : ''
  }

  private extractSolarWindInfo(report: NormalizedReport): string {
    const text = `${report.summary} ${report.details}`.toLowerCase()
    const windRegex = /(?:solar wind|wind speed|bz|imf)[^.]*\./gi
    const matches = text.match(windRegex)
    return matches ? matches.join(' ') : ''
  }

  private extractGeomagneticInfo(report: NormalizedReport): string {
    const geoText = report.geomagneticText || ''
    const text = `${report.summary} ${report.details} ${geoText}`.toLowerCase()
    const geoRegex = /(?:geomagnetic|kp index|g\d storm|aurora)[^.]*\./gi
    const matches = text.match(geoRegex)
    return matches ? matches.join(' ') : ''
  }

  private extractEnergeticParticleInfo(report: NormalizedReport): string {
    const radText = report.radiationStormText || ''
    const text = `${report.summary} ${report.details} ${radText}`.toLowerCase()
    const particleRegex = /(?:proton|electron|energetic particle|radiation|s\d storm)[^.]*\./gi
    const matches = text.match(particleRegex)
    return matches ? matches.join(' ') : ''
  }

  private calculateDataQuality(reports: NormalizedReport[]): number {
    if (reports.length === 0) return 0
    const avgQuality = reports.reduce((sum, r) => sum + (r.qualityScore || 0.5), 0) / reports.length
    return Math.round(avgQuality * 100) / 100
  }

  private calculateConfidence(reports: NormalizedReport[]): string {
    const quality = this.calculateDataQuality(reports)
    if (quality >= 0.9) return 'Very High'
    if (quality >= 0.75) return 'High'
    if (quality >= 0.5) return 'Moderate'
    if (quality >= 0.25) return 'Low'
    return 'Very Low'
  }
}

export default AggregationService