export type WebsiteTemplate = "modern" | "craftsman" | "bold"

export interface WebsiteContent {
  template: WebsiteTemplate
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

export interface WebsiteSave {
  slug: string
  content: WebsiteContent
}

export interface PublicWebsite extends WebsiteSave {
  contractor_uuid: string
  booking_slug: string | null
}

export interface WebsiteState extends PublicWebsite {
  is_published: boolean
  published_at: string | null
  updated_at: string | null
  has_unpublished_changes: boolean
}

export const WEBSITE_TEMPLATES: { id: WebsiteTemplate }[] = [
  { id: "modern" },
  { id: "craftsman" },
  { id: "bold" },
]
