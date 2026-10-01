import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import { moveSection, normalizedSections, switchTemplate } from "../lib/website-content"
import { WEBSITE_TEMPLATES, type WebsiteContentV2 } from "../lib/types/website"

function fixture(): WebsiteContentV2 {
  return {
    schema_version: 2,
    identity: { company_name: "Fixture Works", trade_code: "remodeling", custom_trade_label: null, headline: "Careful work", description: "A factual introduction", about: "Owner-provided story", established_year: 2014 },
    public_contact: { phone: "+1 555 0100", email: "hello@example.com", social_links: [], address_visibility: "town_only", display_address: "Pasadena, CA" },
    branding: { template_id: "modern", template_version: 2, theme: { palette: "forest", font_pair_id: "system", logo_size: "medium", density: "comfortable", button_style: "rounded" }, logo_asset_id: "logo_1", hero_asset_id: "hero_1", hero_focal_point: { x: .4, y: .6 }, logo_alt: "Fixture Works", hero_alt: "Finished room", legacy_logo_url: null, legacy_hero_image_url: null },
    availability: null,
    services: [{ id: "service_1", order: 0, name: "Remodeling", description: "", image_asset_id: null, price_label: null }],
    service_areas: [{ id: "area_1", order: 0, label: "Pasadena", kind: "town", country: "US", region: "CA", geometry: null }],
    legacy_service_area: "",
    projects: [{ id: "project_1", order: 0, title: "Kitchen", service_ids: ["service_1"], description: "", town: "Pasadena", approximate_date: "2026-08", images: [{ id: "image_1", order: 0, asset_id: "photo_1", alt: "Kitchen", caption: "", pair_id: null, pair_role: null }] }],
    credentials: [], testimonials: [], faqs: [],
    sections: normalizedSections([]),
    seo: { title: null, description: null, share_image_asset_id: null },
  }
}

test("catalog contains twenty stable, structurally named layouts", () => {
  assert.equal(WEBSITE_TEMPLATES.length, 20)
  assert.equal(new Set(WEBSITE_TEMPLATES.map((item) => item.id)).size, 20)
  assert.equal(new Set(WEBSITE_TEMPLATES.map((item) => item.family)).size, 20)
  const css = readFileSync(new URL("../components/websites/website.module.css", import.meta.url), "utf8")
  for (const template of WEBSITE_TEMPLATES.filter((item) => item.id !== "modern")) {
    assert.match(css, new RegExp(`\\.layout-${template.id.replaceAll("-", "\\-")}\\s`))
  }
})

test("switching every template changes presentation only", () => {
  const original = fixture()
  for (const template of WEBSITE_TEMPLATES) {
    const switched = switchTemplate(original, template.id)
    assert.deepEqual(
      { ...switched, branding: { ...switched.branding, template_id: original.branding.template_id, template_version: original.branding.template_version } },
      original,
    )
  }
  const roundTrip = switchTemplate(switchTemplate(original, "steel"), "modern")
  assert.deepEqual(roundTrip, original)
})

test("section movement retains content and normalizes order", () => {
  const original = fixture()
  const moved = moveSection(original, "projects", -1)
  assert.equal(moved.sections.find((section) => section.key === "projects")?.order, 1)
  assert.deepEqual(moved.projects, original.projects)
  assert.deepEqual(moved.services, original.services)
})

test("both quote request implementations contain no fixed response-time promise", () => {
  for (const file of ["components/customer-request-form.tsx", "components/customer-request-form-new.tsx"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    assert.doesNotMatch(source, /2-4 hours|typically responds|within the next\s+\d+/i)
    assert.match(source, /contractor can review your details and contact you about next steps/i)
  }
})
