export type LegacyWebsiteTemplate = "modern" | "craftsman" | "bold"

export type WebsiteTemplate = LegacyWebsiteTemplate | "established" | "heritage" | "precision" | "quiet-gallery" | "steel" | "neighbour" | "field-notes" | "rapid-contact" | "garden" | "renovation" | "roofline" | "comfort" | "finish" | "commercial" | "local-expert" | "project-book" | "service-desk"

export interface WebsiteContentV1 {
  schema_version?: 1
  template: LegacyWebsiteTemplate
  company_name: string
  headline: string
  description: string
  about: string
  services: string[]
  service_area: string
  phone: string
  email: string | null
  logo_url: string | null
  hero_image_url: string | null
}

export interface WebsiteIdentity { company_name: string; trade_code: string; custom_trade_label: string | null; headline: string; description: string; about: string; established_year: number | null }
export interface WebsitePublicContact { phone: string; email: string | null; social_links: string[]; address_visibility: "hidden" | "town_only" | "public_business"; display_address: string | null }
export interface WebsiteTheme { palette: "slate" | "forest" | "ocean" | "earth" | "sunset"; font_pair_id: "system" | "inter" | "lora-inter"; logo_size: "small" | "medium" | "large"; density: "compact" | "comfortable" | "spacious"; button_style: "square" | "rounded" | "pill" }
export interface WebsiteBranding { template_id: WebsiteTemplate | string; template_version: number; theme: WebsiteTheme; logo_asset_id: string | null; hero_asset_id: string | null; hero_focal_point: { x: number; y: number } | null; logo_alt: string; hero_alt: string; legacy_logo_url: string | null; legacy_hero_image_url: string | null }
export interface WebsiteHoursInterval { start: string; end: string; ends_next_day: boolean }
export interface WebsiteDayHours { closed: boolean; intervals: WebsiteHoursInterval[] }
export interface WebsiteAvailability { timezone: string; weekly: Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", WebsiteDayHours>>; overrides: Array<WebsiteDayHours & { date: string }>; away: { start: string; end: string; notice: string } | null; emergency_available: boolean | null; emergency_notice: string }
export interface WebsiteService { id: string; order: number; name: string; description: string; image_asset_id: string | null; price_label: string | null }
export interface WebsiteServiceArea { id: string; order: number; label: string; kind: "town" | "postal_region" | "radius"; country: string | null; region: string | null; geometry: null | { latitude: number; longitude: number; kilometers: number } }
export interface WebsiteProjectImage { id: string; order: number; asset_id: string; alt: string; caption: string; pair_id: string | null; pair_role: "before" | "after" | null }
export interface WebsiteProject { id: string; order: number; title: string; service_ids: string[]; description: string; town: string | null; approximate_date: string | null; images: WebsiteProjectImage[] }
export interface WebsiteCredential { id: string; order: number; kind: "license" | "insurance" | "certification" | "membership" | "other"; title: string; issuer: string; jurisdiction: string; public_number: string | null; expiry_date: string | null; display_policy: "hidden" | "title_only" | "public_number" }
export interface WebsiteTestimonial { id: string; order: number; text: string; display_name: string; date: string | null; rating: number | null; source_label: string | null; source_permalink: string | null }
export interface WebsiteFaq { id: string; order: number; question: string; answer: string }
export type WebsiteSectionKey = "hero" | "services" | "projects" | "about" | "credentials" | "testimonials" | "faq" | "hours" | "areas" | "contact"
export interface WebsiteSection { key: WebsiteSectionKey; order: number; enabled: boolean; background: "default" | "muted" | "accent" }

export interface WebsiteContentV2 {
  schema_version: 2
  identity: WebsiteIdentity
  public_contact: WebsitePublicContact
  branding: WebsiteBranding
  availability: WebsiteAvailability | null
  services: WebsiteService[]
  service_areas: WebsiteServiceArea[]
  legacy_service_area: string
  projects: WebsiteProject[]
  credentials: WebsiteCredential[]
  testimonials: WebsiteTestimonial[]
  faqs: WebsiteFaq[]
  sections: WebsiteSection[]
  seo: { title: string | null; description: string | null; share_image_asset_id: string | null }
}

export type WebsiteContent = WebsiteContentV1 | WebsiteContentV2
export interface WebsiteSave { slug: string; content: WebsiteContent; expected_draft_revision?: number; approved_testimonial_ids?: string[] }
export interface PublicWebsite { slug: string; content: WebsiteContent; contractor_uuid: string; booking_slug: string | null }
export interface WebsiteState extends PublicWebsite { draft_revision: number; published_revision: number | null; is_published: boolean; published_at: string | null; updated_at: string | null; has_unpublished_changes: boolean }

export interface WebsiteTemplateDefinition {
  id: WebsiteTemplate
  version: number
  intent: string[]
  family: "split" | "portfolio" | "utility" | "formal" | "story" | "grid" | "gallery" | "industrial" | "neighbour" | "technical" | "contact" | "landscape" | "before-after" | "roofline" | "sidebar" | "atelier" | "matrix" | "area" | "book" | "directory"
}

export const WEBSITE_TEMPLATES: WebsiteTemplateDefinition[] = [
  { id: "modern", version: 2, intent: ["clean", "versatile"], family: "split" },
  { id: "craftsman", version: 2, intent: ["warm", "work-led"], family: "portfolio" },
  { id: "bold", version: 2, intent: ["direct", "high-contrast"], family: "utility" },
  { id: "established", version: 1, intent: ["formal", "credible"], family: "formal" },
  { id: "heritage", version: 1, intent: ["story", "family"], family: "story" },
  { id: "precision", version: 1, intent: ["technical", "ordered"], family: "grid" },
  { id: "quiet-gallery", version: 1, intent: ["minimal", "photography"], family: "gallery" },
  { id: "steel", version: 1, intent: ["industrial", "compact"], family: "industrial" },
  { id: "neighbour", version: 1, intent: ["friendly", "local"], family: "neighbour" },
  { id: "field-notes", version: 1, intent: ["detailed", "technical"], family: "technical" },
  { id: "rapid-contact", version: 1, intent: ["contact-first", "no-photo"], family: "contact" },
  { id: "garden", version: 1, intent: ["outdoors", "seasonal"], family: "landscape" },
  { id: "renovation", version: 1, intent: ["transformation", "projects"], family: "before-after" },
  { id: "roofline", version: 1, intent: ["inspection", "coverage"], family: "roofline" },
  { id: "comfort", version: 1, intent: ["helpful", "questions"], family: "sidebar" },
  { id: "finish", version: 1, intent: ["refined", "materials"], family: "atelier" },
  { id: "commercial", version: 1, intent: ["capability", "business"], family: "matrix" },
  { id: "local-expert", version: 1, intent: ["area-first", "local"], family: "area" },
  { id: "project-book", version: 1, intent: ["portfolio", "editorial"], family: "book" },
  { id: "service-desk", version: 1, intent: ["service-first", "organized"], family: "directory" },
]

export function isWebsiteV2(content: WebsiteContent): content is WebsiteContentV2 { return content.schema_version === 2 }
