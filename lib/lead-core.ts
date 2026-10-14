import { api } from "@/lib/api"

// ============================================
// Translation Cache Utilities (localStorage)
// ============================================
const TRANSLATION_CACHE_KEY = 'contractor_translations_cache'
const CACHE_EXPIRY_DAYS = 7

interface TranslationCacheEntry {
  translation: string
  timestamp: number
}

interface TranslationCache {
  [key: string]: TranslationCacheEntry
}

// Generate a cache key from the original text
const generateCacheKey = (text: string, targetLang: string): string => {
  // Use a hash of the text + target language
  const hash = text.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0) | 0
  }, 0)
  return `${targetLang}_${hash}_${text.length}`
}

// Get translation from cache
export const getCachedTranslation = (text: string, targetLang: string): string | null => {
  if (typeof window === 'undefined') return null

  try {
    const cacheStr = localStorage.getItem(TRANSLATION_CACHE_KEY)
    if (!cacheStr) return null

    const cache: TranslationCache = JSON.parse(cacheStr)
    const key = generateCacheKey(text, targetLang)
    const entry = cache[key]

    if (!entry) return null

    // Check if cache entry is expired
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    if (Date.now() - entry.timestamp > expiryTime) {
      // Remove expired entry
      delete cache[key]
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache))
      return null
    }

    return entry.translation
  } catch (error) {
    console.error('Error reading translation cache:', error)
    return null
  }
}

// Save translation to cache
export const setCachedTranslation = (text: string, targetLang: string, translation: string): void => {
  if (typeof window === 'undefined') return

  try {
    const cacheStr = localStorage.getItem(TRANSLATION_CACHE_KEY)
    const cache: TranslationCache = cacheStr ? JSON.parse(cacheStr) : {}

    const key = generateCacheKey(text, targetLang)
    cache[key] = {
      translation,
      timestamp: Date.now()
    }

    // Limit cache size (keep last 500 entries)
    const keys = Object.keys(cache)
    if (keys.length > 500) {
      // Sort by timestamp and remove oldest
      const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)
      sorted.slice(0, keys.length - 500).forEach(k => delete cache[k])
    }

    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Error saving to translation cache:', error)
  }
}

// Translate text with caching
export const translateWithCache = async (
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string> => {
  // Check cache first
  const cached = getCachedTranslation(text, targetLang)
  if (cached) {
    console.log('🔄 Using cached translation')
    return cached
  }

  // Call API
  const response = await api.translateText(text, targetLang, sourceLang)

  // Cache the result
  setCachedTranslation(text, targetLang, response.translated_text)

  return response.translated_text
}

// Format transcript translation - replace speaker names
export const formatTranscriptTranslation = (translatedText: string): string => {
  return translatedText
    .replace(/\bContractor\b/gi, 'Contratista')
    .replace(/\bCustomer\b/gi, 'Cliente')
    .replace(/\bClient\b/gi, 'Cliente')
}

// Utility function to normalize phone numbers to E.164 format (+1XXXXXXXXXX)
export const normalizePhoneToE164 = (phone: string | undefined | null): string => {
  if (!phone) return ''

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Handle US numbers - convert to +1XXXXXXXXXX format
  if (digits.length === 10) {
    // 10 digits: assume US number, add +1
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // 11 digits starting with 1: US number with country code
    return `+${digits}`
  } else if (phone.startsWith('+')) {
    // Already in E.164 format
    return phone
  }

  // Return original if can't normalize (shouldn't happen for US numbers)
  return phone
}

export function normalizeLeadLabel(value?: string | null): string {
  return (value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
}

function isAiOperatorCallLabel(value?: string | null): boolean {
  const norm = normalizeLeadLabel(value)
  return norm === 'ai operator call' || norm === 'frontline voice'
}

export type LeadSourceCheck = {
  source?: string | null
  project_type?: string | null
  interaction_type?: string | null
  is_frontline_ai?: boolean | null
  consolidation_status?: string | null
  contractor_ai_call_lead_id?: number | null
  contractor_ai_customer_id?: number | null
  type?: string | null
}

export function isFrontlineVoiceLead(lead?: LeadSourceCheck | null): boolean {
  if (!lead) return false
  const source = normalizeLeadLabel(lead.source)
  const projectType = normalizeLeadLabel(lead.project_type)
  const interactionType = normalizeLeadLabel(lead.interaction_type)
  const consolidationStatus = normalizeLeadLabel(lead.consolidation_status)
  return Boolean(
    lead.is_frontline_ai ||
    consolidationStatus === 'both' ||
    consolidationStatus === 'call_only' ||
    lead.contractor_ai_call_lead_id ||
    lead.contractor_ai_customer_id ||
    lead.type === 'call' ||
    source === 'frontline' ||
    source === 'frontline voice' ||
    source === 'frontline_voice' ||
    source === 'consolidated' ||
    source === 'call' ||
    isAiOperatorCallLabel(lead.source) ||
    isAiOperatorCallLabel(lead.project_type) ||
    interactionType === 'frontline voice' ||
    interactionType === 'frontline_voice' ||
    interactionType === 'phone call' ||
    interactionType === 'phone_call'
  )
}

export function isQuoteRequestLead(lead: LeadSourceCheck & { has_filled_form?: boolean | null; quote_requests?: Array<unknown> | null }): boolean {
  const normConsolidation = normalizeLeadLabel(lead.consolidation_status)
  const normSource = normalizeLeadLabel(lead.source)
  const normType = normalizeLeadLabel(lead.type)

  return Boolean(
    lead.has_filled_form ||
    normConsolidation === 'both' ||
    normConsolidation === 'form_only' ||
    (Array.isArray(lead.quote_requests) && lead.quote_requests.length > 0) ||
    normType === 'request' ||
    normSource === 'website form' ||
    normSource === 'website_form' ||
    normSource === 'request'
  )
}
