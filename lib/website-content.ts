import type { WebsiteContentV2, WebsiteSection, WebsiteSectionKey, WebsiteTemplate } from "@/lib/types/website"
import { WEBSITE_TEMPLATES } from "@/lib/types/website"

export const SECTION_KEYS: WebsiteSectionKey[] = ["hero", "services", "projects", "about", "credentials", "testimonials", "faq", "hours", "areas", "contact"]

export function normalizedSections(sections: WebsiteSection[]): WebsiteSection[] {
  const byKey = new Map(sections.map((section) => [section.key, section]))
  return SECTION_KEYS.map((key, index) => byKey.get(key) ?? ({ key, order: index, enabled: true, background: "default" } as const))
    .sort((a, b) => a.order - b.order)
    .map((section, order) => ({ ...section, order }))
}

export function switchTemplate(content: WebsiteContentV2, templateId: WebsiteTemplate): WebsiteContentV2 {
  const definition = WEBSITE_TEMPLATES.find((template) => template.id === templateId) ?? WEBSITE_TEMPLATES[0]
  return { ...content, branding: { ...content.branding, template_id: definition.id, template_version: definition.version } }
}

export function moveSection(content: WebsiteContentV2, key: WebsiteSectionKey, direction: -1 | 1): WebsiteContentV2 {
  const sections = normalizedSections(content.sections)
  const from = sections.findIndex((section) => section.key === key)
  const to = from + direction
  if (from < 0 || to < 0 || to >= sections.length) return content
  const next = [...sections]
  ;[next[from], next[to]] = [next[to], next[from]]
  return { ...content, sections: next.map((section, order) => ({ ...section, order })) }
}

export function websiteAssetUrl(slug: string, assetId: string, width: 480 | 960 | 1600 = 960): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "")
  return `${base}/websites/${encodeURIComponent(slug)}/assets/${encodeURIComponent(assetId)}/${width}`
}
