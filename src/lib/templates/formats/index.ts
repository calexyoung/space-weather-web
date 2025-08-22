import { standardReportTemplate } from './standard'
import { technicalReportTemplate } from './technical'
import { publicReportTemplate } from './public'
import { alertReportTemplate } from './alert'
import { socialMediaTemplates } from './social-media'
import customReportTemplate from './custom'

export interface ReportTemplate {
  id: string
  name: string
  description: string
  template: string
  prompt: string
  requiredFields: string[]
}

export interface SocialMediaTemplate {
  name: string
  maxLength: number | null
  template: string
  prompt: string
}

// Main template registry
export const reportTemplates = {
  standard: standardReportTemplate,
  technical: technicalReportTemplate,
  public: publicReportTemplate,
  alert: alertReportTemplate,
  socialMedia: socialMediaTemplates,
  custom: customReportTemplate
}

// Get template by ID
export function getTemplate(templateId: string): ReportTemplate | null {
  switch (templateId) {
    case 'standard':
      return standardReportTemplate
    case 'technical':
      return technicalReportTemplate
    case 'public':
      return publicReportTemplate
    case 'alert':
      return alertReportTemplate
    case 'custom':
      return customReportTemplate as any
    default:
      // Check if it's a social media sub-template
      if (templateId.startsWith('social-')) {
        const platform = templateId.replace('social-', '')
        const template = socialMediaTemplates.templates[platform as keyof typeof socialMediaTemplates.templates]
        if (template) {
          return {
            id: templateId,
            name: template.name,
            description: `Social media post for ${platform}`,
            template: template.template,
            prompt: template.prompt,
            requiredFields: []
          }
        }
      }
      return null
  }
}

// Get all available templates
export function getAllTemplates(): Array<{ id: string; name: string; description: string }> {
  const templates = [
    { id: 'standard', name: 'Standard Report', description: 'Comprehensive overview suitable for most users' },
    { id: 'technical', name: 'Technical Analysis', description: 'Detailed technical report for specialists' },
    { id: 'public', name: 'Public Summary', description: 'Simplified report for general public' },
    { id: 'alert', name: 'Alert Bulletin', description: 'Focused on immediate threats and warnings' },
    { id: 'custom', name: 'Custom Template', description: 'User-defined format and prompts' }
  ]
  
  // Add social media templates
  Object.entries(socialMediaTemplates.templates).forEach(([key, template]) => {
    templates.push({
      id: `social-${key}`,
      name: template.name,
      description: `Optimized for ${template.name}`
    })
  })
  
  return templates
}

// Export all templates
export {
  standardReportTemplate,
  technicalReportTemplate,
  publicReportTemplate,
  alertReportTemplate,
  socialMediaTemplates,
  customReportTemplate
}