import assert from "node:assert/strict"
import { test } from "node:test"
import { api } from "../lib/api"

test("website uploads forward AbortSignal and do not report cancelled bytes as an asset", async () => {
  const original = globalThis.fetch
  const controller = new AbortController()
  let request: RequestInit | undefined
  globalThis.fetch = async (_input, options) => {
    request = options
    return new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Upload cancelled", "AbortError")), { once: true })
    })
  }
  try {
    const upload = api.uploadWebsiteAsset(new File(["image"], "photo.png", { type: "image/png" }), "project", { signal: controller.signal })
    assert.equal(request?.signal, controller.signal)
    assert.equal(request?.credentials, "include")
    assert.equal((request?.body as FormData).get("role"), "project")
    controller.abort()
    await assert.rejects(upload, { name: "AbortError" })
  } finally { globalThis.fetch = original }
})

test("existing two-argument upload contract and HTTP errors stay intact", async () => {
  const original = globalThis.fetch
  let successful = true
  globalThis.fetch = async () => new Response(JSON.stringify(successful ? { asset_id: "asset1", status: "pending", mime: "image/png", width: 10, height: 10 } : { detail: "Rejected image" }), { status: successful ? 201 : 422, headers: { "Content-Type": "application/json" } })
  try {
    const file = new File(["image"], "photo.png", { type: "image/png" })
    assert.equal((await api.uploadWebsiteAsset(file, "project")).asset_id, "asset1")
    successful = false
    await assert.rejects(api.uploadWebsiteAsset(file, "project"), /Rejected image/)
  } finally { globalThis.fetch = original }
})
