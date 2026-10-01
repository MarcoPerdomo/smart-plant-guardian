import type { ComponentType } from 'react'
import { template as weatherDigestTemplate } from './weather-digest'
import { template as newsletterConfirmTemplate } from './newsletter-confirm'
import { template as signupAttemptNoticeTemplate } from './signup-attempt-notice'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient, overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry, maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'weather-digest': weatherDigestTemplate,
  'newsletter-confirm': newsletterConfirmTemplate,
  'signup-attempt-notice': signupAttemptNoticeTemplate,
}
