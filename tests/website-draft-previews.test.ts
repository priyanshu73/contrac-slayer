import assert from "node:assert/strict"
import { test } from "node:test"
import React from "react"
import { createRequire } from "node:module"
import { JSDOM } from "jsdom"
import type { WebsiteContentV2 } from "../lib/types/website"

test("draft previews hydrate on reload and asset change, retry failures and revoke blobs", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement })
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true })
  const req = createRequire(import.meta.url)
  const { render, act, cleanup } = req("@testing-library/react")
  const { useWebsiteDraftPreviews } = req("../lib/use-website-draft-previews")
  const { api } = req("../lib/api")
  const original = api.getWebsiteAssetPreview
  const originalRevoke = URL.revokeObjectURL
  const revoked: string[] = []; URL.revokeObjectURL = url => revoked.push(url)
  let reject = false
  const calls: Array<[string, number]> = []
  api.getWebsiteAssetPreview = async (id: string, width: number) => { calls.push([id, width]); if (reject) throw new Error("offline"); return `blob:${id}` }
  const content = (id: string) => ({ branding: { logo_asset_id: null, hero_asset_id: null }, projects: [{ images: [{ asset_id: id }] }] }) as WebsiteContentV2
  let result: { previews: Record<string, string>; failed: boolean; retry: () => void }
  function Harness({ id }: { id: string }) { result = useWebsiteDraftPreviews(content(id), true); return null }
  try {
    let view: ReturnType<typeof render>
    await act(async () => { view = render(React.createElement(Harness, { id: "saved-private-photo" })) })
    assert.equal(result!.previews["saved-private-photo"], "blob:saved-private-photo")
    assert.deepEqual(calls[0], ["saved-private-photo", 960])
    reject = true
    await act(async () => { view!.rerender(React.createElement(Harness, { id: "new-upload" })) })
    assert.equal(result!.failed, true)
    assert.equal(result!.previews["new-upload"], undefined)
    assert.ok(revoked.includes("blob:saved-private-photo"))
    reject = false
    await act(async () => { result!.retry() })
    assert.equal(result!.previews["new-upload"], "blob:new-upload")
    cleanup(); assert.ok(revoked.includes("blob:new-upload"))
  } finally { api.getWebsiteAssetPreview = original; URL.revokeObjectURL = originalRevoke; cleanup() }
})
