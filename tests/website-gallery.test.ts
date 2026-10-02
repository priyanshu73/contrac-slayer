import assert from "node:assert/strict"
import { test } from "node:test"
import type { WebsiteContentV2 } from "../lib/types/website"
import { addWebsiteProject, updateWebsiteProject, removeWebsiteProject, moveWebsiteProject, addWebsiteProjectImage, updateWebsiteProjectImage, removeWebsiteProjectImage, moveWebsiteProjectImage, pairWebsiteProjectImages, unpairWebsiteProjectImage, MAX_WEBSITE_PROJECTS, MAX_PROJECT_IMAGES } from "../lib/website-gallery"

function content(): WebsiteContentV2 {
  return {
    schema_version: 2,
    identity: { company_name: "Demo Co", trade_code: "plumbing", custom_trade_label: null, headline: "Careful local work", description: "", about: "", established_year: null },
    public_contact: { phone: "(555) 555-1212", email: "hello@example.com", social_links: [], address_visibility: "hidden", display_address: null },
    branding: { template_id: "modern", template_version: 2, theme: { palette: "slate", font_pair_id: "system", logo_size: "medium", density: "comfortable", button_style: "rounded" }, logo_asset_id: null, hero_asset_id: null, hero_focal_point: null, logo_alt: "", hero_alt: "", legacy_logo_url: null, legacy_hero_image_url: null },
    availability: null, services: [], service_areas: [], legacy_service_area: "", projects: [], credentials: [], testimonials: [], faqs: [], sections: [{ key: "hero", order: 0, enabled: true, background: "default" }, { key: "contact", order: 1, enabled: true, background: "default" }], seo: { title: null, description: null, share_image_asset_id: null },
  }
}


test("project operations preserve unrelated content, IDs and input", () => {
  const original = content()
  const snapshot = structuredClone(original)
  let draft = addWebsiteProject(original, "p1", "Kitchen")
  draft = addWebsiteProject(draft, "p2", "Deck")
  draft = updateWebsiteProject(draft, "p1", { title: "Kitchen remodel ", town: "Pasadena", service_ids: ["service1"] })
  draft = moveWebsiteProject(draft, "p2", 0)
  assert.deepEqual(draft.projects.map(p => [p.id, p.order]), [["p2", 0], ["p1", 1]])
  assert.equal(draft.projects[1].title, "Kitchen remodel ")
  draft = removeWebsiteProject(draft, "p2")
  assert.equal(draft.projects[0].order, 0)
  assert.deepEqual({ ...draft, projects: [] }, original)
  assert.deepEqual(original, snapshot)
  assert.throws(() => moveWebsiteProject(draft, "p1", -1))
  assert.throws(() => addWebsiteProject(draft, "p1"))
  assert.throws(() => updateWebsiteProject(draft, "missing", { title: "x" }))
})

test("photos support captions, alt, reorder and removing a pair safely", () => {
  let draft = addWebsiteProject(content(), "p")
  draft = addWebsiteProjectImage(draft, "p", "i1", "a1")
  draft = addWebsiteProjectImage(draft, "p", "i2", "a2")
  draft = addWebsiteProjectImage(draft, "p", "i3", "a3")
  draft = updateWebsiteProjectImage(draft, "p", "i1", { alt: "Before kitchen", caption: "Owner-supplied caption " })
  draft = pairWebsiteProjectImages(draft, "p", "i1", "i2", "pair1")
  const snapshot = structuredClone(draft)
  draft = moveWebsiteProjectImage(draft, "p", "i2", 0)
  assert.deepEqual(draft.projects[0].images.map(i => [i.id, i.order]), [["i2", 0], ["i1", 1], ["i3", 2]])
  assert.equal(draft.projects[0].images[1].caption, "Owner-supplied caption ")
  assert.deepEqual(snapshot.projects[0].images.map(i => i.id), ["i1", "i2", "i3"])
  draft = removeWebsiteProjectImage(draft, "p", "i1")
  assert.equal(draft.projects[0].images[0].pair_id, null)
  assert.equal(draft.projects[0].images[0].pair_role, null)
  assert.equal(draft.projects[0].images[0].asset_id, "a2")
})

test("re-pairing unpairs former partners and requires same-project distinct photos", () => {
  let draft = addWebsiteProject(content(), "p")
  for (let n = 1; n <= 4; n++) draft = addWebsiteProjectImage(draft, "p", `i${n}`, `a${n}`)
  draft = pairWebsiteProjectImages(draft, "p", "i1", "i2", "old1")
  draft = pairWebsiteProjectImages(draft, "p", "i3", "i4", "old2")
  draft = pairWebsiteProjectImages(draft, "p", "i1", "i3", "new")
  assert.deepEqual(draft.projects[0].images.map(i => i.pair_role), ["before", null, "after", null])
  assert.throws(() => pairWebsiteProjectImages(draft, "p", "i1", "i1", "x"))
  assert.throws(() => pairWebsiteProjectImages(draft, "p", "i1", "i2", "new"))
  assert.throws(() => pairWebsiteProjectImages(draft, "p", "i1", "missing", "x"))
  draft = unpairWebsiteProjectImage(draft, "p", "i3")
  assert.ok(draft.projects[0].images.every(i => i.pair_id === null && i.pair_role === null))
})

test("limits fail explicitly rather than truncate content", () => {
  let draft = content()
  for (let n = 0; n < MAX_WEBSITE_PROJECTS; n++) draft = addWebsiteProject(draft, `p${n}`)
  assert.throws(() => addWebsiteProject(draft, "extra"), /limit/)
  for (let n = 0; n < MAX_PROJECT_IMAGES; n++) draft = addWebsiteProjectImage(draft, "p0", `i${n}`, `a${n}`)
  assert.throws(() => addWebsiteProjectImage(draft, "p0", "extra", "asset"), /limit/)
  assert.throws(() => addWebsiteProjectImage(draft, "p1", "i0", "asset"), /unique/)
  assert.throws(() => addWebsiteProjectImage(draft, "p1", "fresh", ""), /required/)
})
