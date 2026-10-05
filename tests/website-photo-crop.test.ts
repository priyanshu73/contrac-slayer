import assert from "node:assert/strict"
import { test } from "node:test"
import { websitePhotoCropStyle } from "../lib/website-photo-crop"

test("crop defaults preserve old framing and bounded values have shared preview/public semantics", () => {
  assert.deepEqual(websitePhotoCropStyle(), { objectPosition: "50% 50%", transformOrigin: "50% 50%", transform: "scale(1)" })
  assert.deepEqual(websitePhotoCropStyle({ x: 0, y: 1, zoom: 3 }), { objectPosition: "0% 100%", transformOrigin: "0% 100%", transform: "scale(3)" })
  assert.deepEqual(websitePhotoCropStyle({ x: NaN, y: -1, zoom: Infinity }), { objectPosition: "50% 0%", transformOrigin: "50% 0%", transform: "scale(1)" })
})

import { createRequire } from "node:module"
import React from "react"
import { JSDOM } from "jsdom"
import { addWebsiteProject, addWebsiteProjectImage, updateWebsiteProjectImage, moveWebsiteProjectImage, pairWebsiteProjectImages, unpairWebsiteProjectImage } from "../lib/website-gallery"
import { switchTemplate } from "../lib/website-content"
import type { WebsiteContentV2 } from "../lib/types/website"

test("crop is immutable and survives pairing, reordering, template changes and JSON reload", () => {
  const base = { projects: [], branding: {} } as unknown as WebsiteContentV2
  let content = addWebsiteProject(base, "p", "Work")
  content = addWebsiteProjectImage(content, "p", "i", "a")
  content = addWebsiteProjectImage(content, "p", "j", "b")
  const previous = content
  const crop = { x: .1, y: .9, zoom: 2 }
  content = updateWebsiteProjectImage(content, "p", "i", { crop })
  assert.equal(previous.projects[0].images[0].crop, undefined)
  content = pairWebsiteProjectImages(content, "p", "i", "j", "pair")
  content = moveWebsiteProjectImage(content, "p", "i", 1)
  content = unpairWebsiteProjectImage(content, "p", "i")
  content = switchTemplate(content, "quiet-gallery")
  content = JSON.parse(JSON.stringify(content))
  assert.deepEqual(content.projects[0].images.find(i => i.id === "i")?.crop, crop)
})

test("pair renderer applies separate saved crops with captions outside clipped frames", () => {
  const req = createRequire(import.meta.url); req.extensions[".css"] = () => ({})
  const { renderToStaticMarkup } = req("react-dom/server")
  const { ProjectPhotoGallery } = req("../components/websites/project-photo-gallery")
  const images = [
    { id: "i", order: 0, asset_id: "a", alt: "Before", caption: "Before detail", pair_id: "pair", pair_role: "before", crop: { x: 0, y: .5, zoom: 2 } },
    { id: "j", order: 1, asset_id: "b", alt: "After", caption: "After detail", pair_id: "pair", pair_role: "after", crop: { x: 1, y: .5, zoom: 3 } },
  ]
  const doc = new JSDOM(renderToStaticMarkup(React.createElement(ProjectPhotoGallery, { images, title: "Work", asset: (id: string) => `blob:${id}` }))).window.document
  const imgs = doc.querySelectorAll("img")
  assert.equal(imgs.length, 2)
  assert.equal((imgs[0] as HTMLElement).style.transform, "scale(2)")
  assert.equal((imgs[1] as HTMLElement).style.transformOrigin, "100% 50%")
  for (const figure of doc.querySelectorAll("figure")) {
    assert.equal(figure.children[0].tagName, "DIV")
    assert.equal(figure.children[1].tagName, "FIGCAPTION")
  }
})
