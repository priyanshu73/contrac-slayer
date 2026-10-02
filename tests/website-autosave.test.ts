import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { test } from "node:test"
import React from "react"
import { JSDOM } from "jsdom"
import type { WebsiteContentV2, WebsiteSave, WebsiteState } from "../lib/types/website"
import { reconcileWebsiteDraft, websiteDraftSignature } from "../lib/website-draft"

function fixture(): WebsiteContentV2 {
  return {
    schema_version: 2,
    identity: { company_name: "Demo Co", trade_code: "plumbing", custom_trade_label: null, headline: "Careful local work", description: "", about: "", established_year: null },
    public_contact: { phone: "5555551212", email: "hello@example.com", social_links: [], address_visibility: "hidden", display_address: null },
    branding: { template_id: "modern", template_version: 2, theme: { palette: "slate", font_pair_id: "system", logo_size: "medium", density: "comfortable", button_style: "rounded" }, logo_asset_id: null, hero_asset_id: null, hero_focal_point: null, logo_alt: "", hero_alt: "", legacy_logo_url: null, legacy_hero_image_url: null },
    availability: null, services: [], service_areas: [], legacy_service_area: "", projects: [], credentials: [], testimonials: [], faqs: [], sections: [{ key: "hero", order: 0, enabled: true, background: "default" }, { key: "contact", order: 1, enabled: true, background: "default" }], seo: { title: null, description: null, share_image_asset_id: null },
  }
}
function state(content = fixture(), revision = 13): WebsiteState {
  return { slug: "demo-site", content, draft_revision: revision, published_revision: null, is_published: false, published_at: null, updated_at: null, has_unpublished_changes: false, profile_timezone: null, contractor_uuid: "fixture", booking_slug: null }
}

test("draft signatures ignore metadata and key order, not real edits or array order", () => {
  const saved = state()
  const draft: WebsiteSave = { slug: saved.slug, content: saved.content, expected_draft_revision: 99, approved_testimonial_ids: ["t1"] }
  assert.equal(websiteDraftSignature(draft), websiteDraftSignature(saved))
  const reordered = Object.fromEntries(Object.entries(draft.content).reverse()) as WebsiteContentV2
  assert.equal(websiteDraftSignature({ ...draft, content: reordered }), websiteDraftSignature(saved))
  reordered.identity = { ...reordered.identity, company_name: "Changed" }
  assert.notEqual(websiteDraftSignature({ ...draft, content: reordered }), websiteDraftSignature(saved))
  const a = fixture(); a.public_contact.social_links = ["a", "b"]
  const b = structuredClone(a); b.public_contact.social_links.reverse()
  assert.notEqual(websiteDraftSignature({ slug: "demo", content: a }), websiteDraftSignature({ slug: "demo", content: b }))
})

test("save reconciliation accepts canonical content but preserves newer raw input", () => {
  const current = { slug: "demo-site", content: fixture(), expected_draft_revision: 13 }
  const signature = websiteDraftSignature(current, false)
  const canonical = fixture(); canonical.seo.title = "Server default"
  const result = state(canonical, 14)
  assert.deepEqual(reconcileWebsiteDraft(current, signature, result).content, canonical)
  const newer = structuredClone(current); newer.content.identity.company_name += " "
  assert.equal((reconcileWebsiteDraft(newer, signature, result).content as WebsiteContentV2).identity.company_name, "Demo Co ")
  assert.equal(reconcileWebsiteDraft(newer, signature, result).expected_draft_revision, 14)
})

test("real editor autosave: load, canonical response, in-flight edits, invalid and failed saves", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, DocumentFragment: dom.window.DocumentFragment, localStorage: dom.window.localStorage })
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true })
  const req = createRequire(import.meta.url)
  req.extensions[".css"] = () => ({})
  const timers = new Map<number, () => void>()
  let timerId = 0
  dom.window.setTimeout = ((callback: () => void) => { timers.set(++timerId, callback); return timerId }) as typeof dom.window.setTimeout
  dom.window.clearTimeout = (id: number) => { timers.delete(id) }
  const { render, fireEvent, cleanup, act } = req("@testing-library/react")
  const { NextIntlClientProvider } = req("next-intl")
  const { WebsiteSettings } = req("../components/websites/website-settings")
  const { api } = req("../lib/api")
  const messages = req("../messages/en.json")
  const original = { getWebsite: api.getWebsite, saveWebsite: api.saveWebsite, publishWebsite: api.publishWebsite }
  let server = state()
  const calls: WebsiteSave[] = []
  let resolveSave: ((result: WebsiteState) => void) | undefined
  let failure: Error | undefined
  api.getWebsite = async () => structuredClone(server)
  api.saveWebsite = async (payload: WebsiteSave) => {
    calls.push(structuredClone(payload))
    if (failure) throw failure
    return new Promise<WebsiteState>((resolve) => { resolveSave = resolve })
  }
  api.publishWebsite = async () => { assert.fail("autosave must never publish") }
  async function tick() { await act(async () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((fn) => fn()) }) }
  async function settle(canonical?: WebsiteContentV2) {
    const payload = calls.at(-1)!
    server = { ...server, slug: payload.slug, content: canonical ?? payload.content, draft_revision: server.draft_revision + 1 }
    await act(async () => { resolveSave!(structuredClone(server)) })
  }
  try {
    let view!: { container: HTMLElement }
    await act(async () => { view = render(React.createElement(NextIntlClientProvider, { locale: "en", messages }, React.createElement(WebsiteSettings))) })
    const company = () => view.container.querySelector<HTMLInputElement>("#website-company-name")!
    assert.ok(company(), "business name input exists")
    await tick(); await tick()
    assert.equal(calls.length, 0, "initial revision metadata must not trigger saves")
    fireEvent.change(company(), { target: { value: "Demo Co updated" } })
    await tick()
    assert.equal(calls.length, 1)
    const canonical = structuredClone(calls[0].content) as WebsiteContentV2
    canonical.seo.title = "Server default"
    await settle(canonical)
    await tick(); await tick()
    assert.equal(calls.length, 1, "canonical response settles without more saves")
    fireEvent.change(company(), { target: { value: "First edit" } })
    await tick()
    assert.equal(calls.length, 2)
    fireEvent.change(company(), { target: { value: "Second edit " } })
    await tick(); await tick()
    assert.equal(calls.length, 2, "no concurrent saves during edits")
    assert.equal(company().value, "Second edit ", "input whitespace survives typing")
    await settle()
    assert.equal(company().value, "Second edit ", "newer edit survives response")
    await tick()
    assert.equal(calls.length, 3)
    assert.equal(calls[2].expected_draft_revision, server.draft_revision)
    assert.equal((calls[2].content as WebsiteContentV2).identity.company_name, "Second edit")
    await settle(); await tick(); await tick()
    assert.equal(calls.length, 3)
    const phone = view.container.querySelector<HTMLInputElement>("#website-phone")!
    fireEvent.change(phone, { target: { value: "bad" } })
    await tick(); await tick()
    assert.equal(calls.length, 3, "invalid input does not submit")
    fireEvent.change(phone, { target: { value: "5555551212" } })
    failure = new Error("network failed")
    fireEvent.change(company(), { target: { value: "Failed edit" } })
    await tick(); await tick(); await tick()
    assert.equal(calls.length, 4, "failed save does not retry on idle")
    failure = undefined
    const retry = [...view.container.querySelectorAll("button")].find((button) => button.textContent === messages.website.retry)
    assert.ok(retry, "explicit retry is offered")
    fireEvent.click(retry)
    assert.equal(calls.length, 5)
    await settle(); await tick(); await tick()
    assert.equal(calls.length, 5, "explicit retry settles")
    Object.defineProperty(dom.window.navigator, "onLine", { value: false, configurable: true })
    failure = new Error("offline")
    fireEvent.change(company(), { target: { value: "Offline edit" } })
    await tick(); await tick(); await tick()
    assert.equal(calls.length, 6, "offline failure does not retry on idle")
    Object.defineProperty(dom.window.navigator, "onLine", { value: true, configurable: true })
    failure = new Error("stale draft revision conflict")
    fireEvent.change(company(), { target: { value: "Conflict edit" } })
    await tick(); await tick(); await tick()
    assert.equal(calls.length, 7, "revision conflict does not retry on idle")
    assert.ok(calls.every((payload) => payload.approved_testimonial_ids?.length === 0))
  } finally { Object.assign(api, original); cleanup(); dom.window.close() }
})
