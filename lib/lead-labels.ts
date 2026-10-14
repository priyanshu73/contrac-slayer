// Locale-aware labels and helpers for the unified leads screen. Keys live in
// the `leads` namespace under `unified.*`. Text matching still runs on the
// (English) call summary; only the labels we produce are translated.

export type LeadT = (key: string, values?: Record<string, string | number>) => string

export const intlLocale = (locale: string): string => (locale === 'es' ? 'es-US' : 'en-US')

type SourceCheckLike = { type?: string | null }

export function getLeadSourceLabelKey(isFrontlineVoice: boolean, lead: SourceCheckLike): string {
  return isFrontlineVoice || lead.type === 'call' ? 'unified.source.frontlineVoice' : 'unified.source.request'
}

export function formatLeadAge(date: Date, t: LeadT): string {
  const diffInHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60))
  if (diffInHours < 1) return t('unified.age.justNow')
  if (diffInHours < 24) return t('unified.age.hours', { count: diffInHours })
  return t('unified.age.days', { count: Math.floor(diffInHours / 24) })
}

const STATUS_KEYS = new Set(['NEW', 'CONTACTED', 'QUOTED', 'CONVERTED', 'LOST'])
export function leadStatusLabel(status: string, t: LeadT): string {
  return STATUS_KEYS.has(status) ? t(`unified.status.${status}`) : status
}

export const sentenceCase = (value: string): string => {
  const clean = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) return clean
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

type LeadTextFields = {
  name?: string | null
  address?: string | null
  description?: string | null
  project_type?: string | null
  service_type?: string | null
}

const SERVICE_MATCHES: Array<[string, string]> = [
  ['garden bed', 'gardenBed'],
  ['landscap', 'landscaping'],
  ['hardscape', 'hardscaping'],
  ['patio', 'patio'],
  ['retaining wall', 'retainingWall'],
  ['irrigation', 'irrigation'],
  ['lawn', 'lawn'],
  ['kitchen', 'kitchen'],
  ['bathroom', 'bathroom'],
  ['floor', 'flooring'],
  ['paint', 'painting'],
]

// Returns the label plus whether it is the generic fallback.
const inferService = (lead: LeadTextFields, text: string, t: LeadT): { label: string; generic: boolean } => {
  const explicit = lead.service_type || lead.project_type
  if (explicit) return { label: sentenceCase(explicit), generic: false }
  const lower = text.toLowerCase()
  const hit = SERVICE_MATCHES.find(([needle]) => lower.includes(needle))
  if (hit) return { label: t(`unified.service.${hit[1]}`), generic: false }
  return { label: t('unified.service.general'), generic: true }
}

const inferLocation = (lead: LeadTextFields, text: string): string | null => {
  if (lead.address) return lead.address
  const normalized = text.replace(/\s+/g, ' ')
  const streetMatch = normalized.match(/\b\d{2,6}\s+[A-Za-z0-9 .'-]+(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?|way|boulevard|blvd\.?)\b(?:,\s*[A-Za-z .'-]+)?/i)
  if (streetMatch?.[0]) return sentenceCase(streetMatch[0])
  const placeMatch = normalized.match(/\b(?:from|in|near|around|at)\s+([^.!?]{4,70}?)(?:\s+(?:regarding|requesting|for|about)|[.!?]|$)/i)
  if (placeMatch?.[1]) return sentenceCase(placeMatch[1].replace(/\b(the|a)\s+caller\b/i, '').trim())
  return null
}

// Returns a nextStep key suffix, or null for the generic "review" step.
const inferNextStep = (text: string): string | null => {
  const lower = text.toLowerCase()
  if ((lower.includes('quote link') || lower.includes('quote request')) && (lower.includes('photo') || lower.includes('upload'))) return 'awaitingPhotos'
  if (lower.includes('quote link') || lower.includes('quote request') || lower.includes('estimate')) return 'prepareFollowUp'
  if (lower.includes('book') || lower.includes('schedule') || lower.includes('appointment')) return 'scheduleConsult'
  if (lower.includes('owner') || lower.includes('escalat') || lower.includes('call back')) return 'ownerFollowUp'
  return null
}

const inferStage = (text: string): string | null => {
  const lower = text.toLowerCase()
  // Order matters: check the most specific stage first.
  if (lower.includes('planning') || lower.includes('plan stage') || lower.includes('early stage')) return 'planning'
  if (lower.includes('quote') || lower.includes('estimate') || lower.includes('quoting')) return 'quoting'
  if (lower.includes('scheduled') || lower.includes('booked') || lower.includes('appointment set')) return 'scheduled'
  if (lower.includes('in progress') || lower.includes('underway') || lower.includes('ongoing')) return 'inProgress'
  if (lower.includes('completed') || lower.includes('finished') || lower.includes('wrapped up')) return 'completed'
  return null
}

export interface SummaryFact {
  label: string
  value: string
}

// Title shown in the AI summary header, e.g. "Johnson · bathroom renovation".
export const buildSummaryTitle = (lead: LeadTextFields, summaryText: string, t: LeadT): string => {
  const contextText = [summaryText, lead.description, lead.project_type, lead.service_type].filter(Boolean).join(' ')
  const service = inferService(lead, contextText, t)
  const serviceLabel = !service.generic ? service.label.toLowerCase() : null
  const name = lead.name?.trim()
  if (name) return serviceLabel ? `${name} · ${serviceLabel}` : name
  return serviceLabel ? sentenceCase(serviceLabel) : t('unified.summary.callSummary')
}

// Only the scannable facts the prose doesn't already carry; placeholders are dropped.
export const buildFooterFacts = (lead: LeadTextFields, summaryText: string, t: LeadT): SummaryFact[] => {
  const contextText = [summaryText, lead.description, lead.project_type, lead.service_type, lead.address].filter(Boolean).join(' ')
  const facts: SummaryFact[] = []
  const location = inferLocation(lead, contextText)
  if (location) facts.push({ label: t('unified.summary.location'), value: location })
  const stage = inferStage(contextText)
  if (stage) facts.push({ label: t('unified.summary.stage'), value: t(`unified.stage.${stage}`) })
  const nextStep = inferNextStep(contextText)
  if (nextStep) facts.push({ label: t('unified.summary.nextStep'), value: t(`unified.nextStep.${nextStep}`) })
  return facts
}
