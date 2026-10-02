import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { test } from "node:test"
import React from "react"
import { JSDOM } from "jsdom"
import type { WebsiteContentV2 } from "../lib/types/website"
import { addWebsiteProject, addWebsiteProjectImage } from "../lib/website-gallery"

function fixture(): WebsiteContentV2 {
  return { schema_version: 2, identity: { company_name: "Demo", trade_code: "remodeling", custom_trade_label: null, headline: "Work", description: "", about: "", established_year: null }, public_contact: { phone: "", email: null, social_links: [], address_visibility: "hidden", display_address: null }, branding: { template_id: "modern", template_version: 2, theme: { palette: "slate", font_pair_id: "system", logo_size: "medium", density: "comfortable", button_style: "rounded" }, logo_asset_id: null, hero_asset_id: null, hero_focal_point: null, logo_alt: "", hero_alt: "", legacy_logo_url: null, legacy_hero_image_url: null }, availability: null, services: [], service_areas: [], legacy_service_area: "", projects: [], credentials: [], testimonials: [], faqs: [], sections: [], seo: { title: null, description: null, share_image_asset_id: null } }
}

test("real gallery edits projects/photos and attaches only confirmed uploads without losing newer edits", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement })
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true })
  globalThis.requestAnimationFrame = callback => { callback(0); return 0 }
  dom.window.confirm = () => { throw new Error("Native confirm must not be used") }
  const req = createRequire(import.meta.url)
  req.extensions[".css"] = () => ({})
  const { render, fireEvent, cleanup, act } = req("@testing-library/react")
  const { NextIntlClientProvider } = req("next-intl")
  const { ProjectGalleryEditor } = req("../components/websites/project-gallery-editor")
  const { api } = req("../lib/api")
  const original = { uploadWebsiteAsset: api.uploadWebsiteAsset, getWebsiteAssetPreview: api.getWebsiteAssetPreview }
  let finishUpload: ((value: { asset_id: string }) => void) | undefined
  let uploadCalls = 0
  api.uploadWebsiteAsset = async () => { uploadCalls++; return new Promise(resolve => { finishUpload = resolve }) }
  api.getWebsiteAssetPreview = async () => "blob:private-test"
  let latest = addWebsiteProject(fixture(), "p1", "Kitchen")
  latest = addWebsiteProjectImage(latest, "p1", "i1", "asset1")
  function Harness() {
    const [content, setContent] = React.useState(latest)
    const [rights, setRights] = React.useState(false)
    latest = content
    return React.createElement(NextIntlClientProvider, { locale: "en", messages: req("../messages/en.json") }, React.createElement(ProjectGalleryEditor, { content, rightsAttested: rights, setRightsAttested: setRights, onChange: (update: (value: WebsiteContentV2) => WebsiteContentV2) => setContent(update) }))
  }
  try {
    let view!: ReturnType<typeof render>
    await act(async () => { view = render(React.createElement(Harness)) })
    const fileInput = () => view.container.querySelector("input[type=file]") as HTMLInputElement
    assert.equal(fileInput().disabled, true, "rights are never prechecked")
    fireEvent.click(view.getByRole("checkbox"))
    const title = view.getByLabelText("Project title")
    fireEvent.change(title, { target: { value: "Kitchen revised" } })
    assert.equal(latest.projects[0].title, "Kitchen revised")
    fireEvent.change(view.getByLabelText("Caption (optional)"), { target: { value: "Custom finish " } })
    assert.equal(latest.projects[0].images[0].caption, "Custom finish ")
    const file = new File(["image"], "photo.png", { type: "image/png" })
    await act(async () => { fireEvent.change(fileInput(), { target: { files: [file] } }) })
    assert.equal(uploadCalls, 1)
    assert.equal(latest.projects[0].images.length, 1, "pending asset is not in draft")
    fireEvent.change(title, { target: { value: "Newer edit while uploading" } })
    await act(async () => { finishUpload!({ asset_id: "asset2" }) })
    assert.equal(latest.projects[0].title, "Newer edit while uploading")
    assert.equal(latest.projects[0].images.length, 2)
    assert.equal(latest.projects[0].images[1].asset_id, "asset2")
    const hiddenInput = fileInput()
    assert.equal(hiddenInput.tabIndex, -1)
    assert.equal(hiddenInput.getAttribute("aria-hidden"), "true")
    assert.equal(view.queryByRole("button", { name: "Browse" }), null)
    fireEvent.click(view.getByRole("button", { name: /^Move photo up: Photo 2/ }))
    assert.equal(latest.projects[0].images[0].asset_id, "asset2")
    fireEvent.click(view.getByRole("button", { name: /^Move photo down: Photo 1/ }))
    assert.equal(latest.projects[0].images[0].asset_id, "asset1")

    fireEvent.click(view.getByRole("button", { name: "Add a project" }))
    assert.equal(latest.projects.length, 2)
    const projects = view.getAllByLabelText(/Project [12]/).filter((el: HTMLElement) => el.tagName === "SECTION")
    assert.equal(projects.length, 2)
    assert.equal(latest.projects[1].title, "", "no invented project facts")
    await act(async () => { fireEvent.change(fileInput(), { target: { files: [new File(["x"], "bad.gif", { type: "image/gif" })] } }) })
    assert.equal(uploadCalls, 1, "unsupported types never reach transport")
    await act(async () => { fireEvent.change(fileInput(), { target: { files: [file] } }) })
    fireEvent.click(view.getByRole("checkbox"))
    await act(async () => { finishUpload!({ asset_id: "revoked-asset" }) })
    assert.equal(latest.projects[0].images.length, 2, "revoked rights cannot append a completed upload")
    assert.equal(view.queryByText("revoked-asset"), null)
    fireEvent.click(view.getByRole("checkbox"))
    await act(async () => { fireEvent.change(fileInput(), { target: { files: [file] } }) })
    fireEvent.click(view.getAllByRole("button", { name: /^Remove project:/ })[0])
    fireEvent.click(view.getByRole("button", { name: "Remove from draft" }))
    await act(async () => { finishUpload!({ asset_id: "deleted-project-asset" }) })
    assert.equal(latest.projects.length, 1)
    assert.equal(latest.projects[0].images.length, 0, "deleted destination cannot redirect its photo to another project")

  } finally { Object.assign(api, original); cleanup() }
})

test("public project gallery renders all photos, captions and explicit before/after labels", () => {
  const req = createRequire(import.meta.url)
  req.extensions[".css"] = () => ({})
  const { renderToStaticMarkup } = req("react-dom/server")
  const { ProjectPhotoGallery } = req("../components/websites/project-photo-gallery")
  const images = [
    { id: "i1", order: 0, asset_id: "a1", alt: "Original kitchen", caption: "Before caption", pair_id: "pair", pair_role: "before" },
    { id: "i2", order: 1, asset_id: "a2", alt: "Finished kitchen", caption: "After caption", pair_id: "pair", pair_role: "after" },
    { id: "i3", order: 2, asset_id: "a3", alt: "Detail", caption: "Detail caption", pair_id: null, pair_role: null },
  ]
  const html = renderToStaticMarkup(React.createElement(ProjectPhotoGallery, { images, title: "Kitchen", asset: (id: string) => `/private/${id}` }))
  const doc = new JSDOM(html).window.document
  assert.equal(doc.querySelectorAll("img").length, 3)
  assert.equal(doc.querySelectorAll("figcaption").length, 3)
  assert.match(doc.body.textContent || "", /Before.*After/)
})


test("private draft renderer uses authenticated blob previews and never public fallback", () => {
  const req = createRequire(import.meta.url); req.extensions[".css"] = () => ({})
  const { renderToStaticMarkup } = req("react-dom/server")
  const { ContractorWebsite } = req("../components/websites/contractor-website")
  let content = addWebsiteProject(fixture(), "p1", "Private project")
  content = addWebsiteProjectImage(content, "p1", "i1", "private-asset")
  content.sections = [{ key: "projects", enabled: true, order: 0, background: "default" }]
  const site = { slug: "demo", contractor_uuid: "demo", content }
  const renderDoc = (preview: boolean, assetPreviews: Record<string, string>) => new JSDOM(renderToStaticMarkup(React.createElement(ContractorWebsite, { site, preview, assetPreviews }))).window.document
  assert.equal(renderDoc(true, {}).querySelector("img"), null)
  assert.equal(renderDoc(true, { "private-asset": "blob:authenticated" }).querySelector("img")?.getAttribute("src"), "blob:authenticated")
  assert.match(renderDoc(false, {}).querySelector("img")?.getAttribute("src") || "", /websites\/demo\/assets\/private-asset\/960/)
})
