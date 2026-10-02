import assert from "node:assert/strict"
import { test } from "node:test"
import type { WebsiteContentV2 } from "../lib/types/website"
import { hasMeaningfulStepContent, normalizeWebsiteSave, validateWebsite, websiteErrorsFromApi } from "../lib/website-validation"

function content(): WebsiteContentV2 {
  return {
    schema_version: 2,
    identity: { company_name: "Demo Co", trade_code: "plumbing", custom_trade_label: null, headline: "Careful local work", description: "", about: "", established_year: null },
    public_contact: { phone: "(555) 555-1212", email: "hello@example.com", social_links: [], address_visibility: "hidden", display_address: null },
    branding: { template_id: "modern", template_version: 2, theme: { palette: "slate", font_pair_id: "system", logo_size: "medium", density: "comfortable", button_style: "rounded" }, logo_asset_id: null, hero_asset_id: null, hero_focal_point: null, logo_alt: "", hero_alt: "", legacy_logo_url: null, legacy_hero_image_url: null },
    availability: null, services: [], service_areas: [], legacy_service_area: "", projects: [], credentials: [], testimonials: [], faqs: [], sections: [{ key: "hero", order: 0, enabled: true, background: "default" }, { key: "contact", order: 1, enabled: true, background: "default" }], seo: { title: null, description: null, share_image_asset_id: null },
  }
}

test("validates the guided setup fields before autosave", () => {
  const draft = content()
  draft.identity.company_name = ""
  draft.public_contact.phone = "abc"
  draft.public_contact.email = "not-an-email"
  draft.availability = { timezone: "America/Los_Angeles", weekly: { mon: { closed: false, intervals: [{ start: "18:00", end: "07:00", ends_next_day: false }] } }, overrides: [], away: null, emergency_available: null, emergency_notice: "" }
  assert.deepEqual(validateWebsite(draft, "demo-site"), {
    company_name: "requiredBusinessName",
    phone: "invalidPhone",
    email: "invalidEmail",
    "hours.mon": "invalidHours",
  })
})

test("normalizes only at the save boundary", () => {
  const draft = content()
  draft.services = [{ id: "service_1", order: 0, name: "Kitchen remodel ", description: "", image_asset_id: null, price_label: null }]
  const normalized = normalizeWebsiteSave({ slug: "demo-site", content: draft })
  assert.equal(draft.services[0].name, "Kitchen remodel ")
  assert.equal((normalized.content as WebsiteContentV2).services[0].name, "Kitchen remodel")
})

test("maps Pydantic errors to fields without exposing raw schema output", () => {
  const error = { detail: [{ loc: ["body", "content", "public_contact", "email"], msg: "value is not a valid email address", type: "value_error" }] }
  assert.deepEqual(websiteErrorsFromApi(error), { email: "invalidEmail" })
})

test("sidebar completion depends on meaningful content", () => {
  const draft = content()
  assert.equal(hasMeaningfulStepContent(draft, 1, "demo-site"), false)
  draft.services = [{ id: "service_1", order: 0, name: "Plumbing", description: "", image_asset_id: null, price_label: null }]
  assert.equal(hasMeaningfulStepContent(draft, 1, "demo-site"), true)
})
