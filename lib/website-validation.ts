import type { WebsiteContentV2, WebsiteSave } from "@/lib/types/website"

export type WebsiteField =
  | "slug"
  | "company_name"
  | "trade"
  | "headline"
  | "phone"
  | "email"
  | "timezone"
  | `hours.${string}`
  | "faq_answer"
  | "form"

export type WebsiteValidationKey =
  | "requiredBusinessName"
  | "requiredHeadline"
  | "invalidPhone"
  | "invalidEmail"
  | "invalidSlug"
  | "invalidTimezone"
  | "invalidHours"
  | "requiredFaqAnswer"
  | "invalidField"

export type WebsiteFieldErrors = Partial<Record<WebsiteField, WebsiteValidationKey>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_CHARACTERS = /^[0-9+().\-\s]*$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isIanaTimezone(value: string): boolean {
  if (!value) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export function validateWebsite(content: WebsiteContentV2, slug: string): WebsiteFieldErrors {
  const errors: WebsiteFieldErrors = {}
  if (!slug.trim() || slug.length < 3 || slug.length > 63 || !SLUG.test(slug)) errors.slug = "invalidSlug"
  if (!content.identity.company_name.trim()) errors.company_name = "requiredBusinessName"
  if (!content.identity.headline.trim()) errors.headline = "requiredHeadline"

  const phone = content.public_contact.phone.trim()
  if (phone && (!PHONE_CHARACTERS.test(phone) || phone.replace(/\D/g, "").length < 7)) errors.phone = "invalidPhone"
  const email = content.public_contact.email?.trim() || ""
  if (email && !EMAIL.test(email)) errors.email = "invalidEmail"

  if (content.availability) {
    if (!isIanaTimezone(content.availability.timezone)) errors.timezone = "invalidTimezone"
    Object.entries(content.availability.weekly).forEach(([day, hours]) => {
      if (!hours || hours.closed) return
      for (const interval of hours.intervals) {
        if (!interval.start || !interval.end || (!interval.ends_next_day && interval.end <= interval.start) || (interval.ends_next_day && interval.end > interval.start)) {
          errors[`hours.${day}`] = "invalidHours"
          break
        }
      }
    })
  }

  if (content.faqs.some((faq) => faq.question.trim() && !faq.answer.trim())) errors.faq_answer = "requiredFaqAnswer"
  return errors
}

export function validateStep(step: number, errors: WebsiteFieldErrors): WebsiteFieldErrors {
  const allowed: WebsiteField[][] = [
    ["slug", "company_name", "trade", "headline", "phone", "email"],
    [],
    ["timezone", "hours.mon", "hours.tue", "hours.wed", "hours.thu", "hours.fri", "hours.sat", "hours.sun"],
    [],
    ["faq_answer"],
    Object.keys(errors) as WebsiteField[],
  ]
  return Object.fromEntries(Object.entries(errors).filter(([field]) => allowed[step]?.includes(field as WebsiteField))) as WebsiteFieldErrors
}

export function normalizeWebsiteSave(draft: WebsiteSave): WebsiteSave {
  const normalize = (value: unknown): unknown => {
    if (typeof value === "string") return value.trim()
    if (Array.isArray(value)) return value.map(normalize)
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]))
    return value
  }
  return normalize(draft) as WebsiteSave
}

interface PydanticIssue { loc?: unknown; type?: unknown; msg?: unknown }

export function websiteErrorsFromApi(error: unknown): WebsiteFieldErrors {
  const detail = error && typeof error === "object" && "detail" in error ? (error as { detail?: unknown }).detail : undefined
  if (!Array.isArray(detail)) return {}
  const errors: WebsiteFieldErrors = {}
  for (const raw of detail as PydanticIssue[]) {
    const loc = Array.isArray(raw.loc) ? raw.loc.map(String).filter((part) => part !== "body") : []
    const path = loc.join(".")
    if (path.endsWith("identity.company_name")) errors.company_name = "requiredBusinessName"
    else if (path.endsWith("identity.headline")) errors.headline = "requiredHeadline"
    else if (path.endsWith("public_contact.phone")) errors.phone = "invalidPhone"
    else if (path.endsWith("public_contact.email")) errors.email = "invalidEmail"
    else if (path.endsWith("availability.timezone")) errors.timezone = "invalidTimezone"
    else if (/availability\.weekly\.([a-z]{3})/.test(path)) errors[`hours.${path.match(/availability\.weekly\.([a-z]{3})/)?.[1]}`] = "invalidHours"
    else if (path.endsWith("slug")) errors.slug = "invalidSlug"
    else errors.form = "invalidField"
  }
  return errors
}

export function hasMeaningfulStepContent(content: WebsiteContentV2, step: number, slug: string): boolean {
  const errors = validateWebsite(content, slug)
  if (step === 0) return !Object.keys(validateStep(0, errors)).length && Boolean(content.identity.company_name.trim() && content.identity.headline.trim() && (content.public_contact.phone.trim() || content.public_contact.email?.trim()))
  if (step === 1) return content.services.some((item) => item.name.trim()) || content.service_areas.some((item) => item.label.trim())
  if (step === 2) return Boolean(content.availability && !Object.keys(validateStep(2, errors)).length && Object.keys(content.availability.weekly).length)
  if (step === 3) return Boolean(content.identity.about.trim() || content.branding.logo_asset_id || content.branding.hero_asset_id || content.projects.length || content.credentials.length || content.testimonials.length)
  if (step === 4) return Boolean(content.branding.template_id && content.sections.length && !errors.faq_answer)
  return !Object.keys(errors).length
}
