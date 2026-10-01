import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const req = createRequire(import.meta.url)
if (req.extensions) {
  req.extensions[".css"] = () => ({})
}

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

test("all twenty templates render all enabled sections in owner order without dropping", async () => {
  // Dynamic import react-dom/server to render ContractorWebsite to static markup
  const { renderToStaticMarkup } = await import("react-dom/server")
  const { ContractorWebsite } = await import("../components/websites/contractor-website")
  const { JSDOM } = await import("jsdom")

  const fullContent: WebsiteContentV2 = {
    ...fixture(),
    credentials: [{ id: "c1", order: 0, kind: "license", title: "Licensed Contractor", issuer: "State Board", jurisdiction: "CA", public_number: "LIC123456", expiry_date: "2028-01-01", display_policy: "public_number" }],
    testimonials: [{ id: "t1", order: 0, text: "Outstanding quality and craftsmanship.", display_name: "Sarah J.", date: "2026-05", rating: 5, source_label: "Google", source_permalink: null }],
    faqs: [{ id: "f1", order: 0, question: "Are you insured?", answer: "Yes, fully insured and bonded." }],
    availability: {
      timezone: "America/Los_Angeles",
      weekly: {
        mon: { closed: false, intervals: [{ start: "08:00", end: "17:00", ends_next_day: false }] },
        tue: { closed: false, intervals: [{ start: "08:00", end: "17:00", ends_next_day: false }] },
        wed: { closed: false, intervals: [{ start: "08:00", end: "17:00", ends_next_day: false }] },
        thu: { closed: false, intervals: [{ start: "08:00", end: "17:00", ends_next_day: false }] },
        fri: { closed: false, intervals: [{ start: "08:00", end: "17:00", ends_next_day: false }] },
      },
      overrides: [],
      away: null,
      emergency_available: null,
      emergency_notice: "",
    },
    sections: normalizedSections([]).map((s) => ({ ...s, enabled: true })),
  }

  const enabledSectionKeys = fullContent.sections.filter((s) => s.enabled).map((s) => s.key)
  assert.equal(enabledSectionKeys.length, 10, "Expected all 10 section keys to be enabled")

  const getRenderedSectionKeys = (content: WebsiteContentV2): string[] => {
    const publicSite = {
      slug: "fixture-works",
      contractor_uuid: "uuid-1234",
      booking_slug: "book-now",
      content,
    }
    const html = renderToStaticMarkup(ContractorWebsite({ site: publicSite, preview: false }))
    const dom = new JSDOM(html)
    return Array.from(dom.window.document.querySelectorAll("section[data-section]")).map(
      (el) => el.getAttribute("data-section")!
    )
  }

  // 1. Verify default enabled order across all 20 templates
  for (const template of WEBSITE_TEMPLATES) {
    const siteContent: WebsiteContentV2 = {
      ...fullContent,
      branding: {
        ...fullContent.branding,
        template_id: template.id,
      },
    }

    const renderedKeys = getRenderedSectionKeys(siteContent)

    assert.equal(
      renderedKeys.length,
      enabledSectionKeys.length,
      `Template ${template.id} dropped sections! Expected ${enabledSectionKeys.length} sections, got ${renderedKeys.length}: [${renderedKeys.join(", ")}]`
    )

    // Assert exact order matches fullContent.sections order
    assert.deepEqual(
      renderedKeys,
      enabledSectionKeys,
      `Template ${template.id} did not render sections in owner order!`
    )
  }

  // 2. Case with custom owner order
  const customOrderKeys: WebsiteContentV2["sections"][number]["key"][] = [
    "contact",
    "testimonials",
    "hero",
    "services",
    "faq",
    "projects",
    "hours",
    "about",
    "credentials",
    "areas",
  ]
  const customContent: WebsiteContentV2 = {
    ...fullContent,
    branding: { ...fullContent.branding, template_id: "steel" },
    sections: customOrderKeys.map((key, order) => ({ key, order, enabled: true, background: "default" })),
  }
  const customRenderedKeys = getRenderedSectionKeys(customContent)
  assert.deepEqual(
    customRenderedKeys,
    customOrderKeys,
    "Custom owner order was not preserved in rendered DOM"
  )

  // 3. Case with one section disabled (assert absent, others present and ordered)
  const disabledKey = "testimonials"
  const disabledContent: WebsiteContentV2 = {
    ...fullContent,
    branding: { ...fullContent.branding, template_id: "established" },
    sections: fullContent.sections.map((s) => (s.key === disabledKey ? { ...s, enabled: false } : s)),
  }
  const expectedDisabledFilteredKeys = fullContent.sections
    .filter((s) => s.key !== disabledKey && s.enabled)
    .map((s) => s.key)
  const disabledRenderedKeys = getRenderedSectionKeys(disabledContent)

  assert.ok(
    !disabledRenderedKeys.includes(disabledKey),
    `Disabled section "${disabledKey}" must be absent from rendered DOM`
  )
  assert.deepEqual(
    disabledRenderedKeys,
    expectedDisabledFilteredKeys,
    "Remaining enabled sections must be present and match owner order"
  )
})


