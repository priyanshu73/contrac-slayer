import assert from "node:assert/strict"
import { test } from "node:test"
import { api } from "../lib/api"

class FakeXHR {
  static instance: FakeXHR
  upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {}
  withCredentials = false
  timeout = 0
  status = 201
  responseText = '{"asset_id":"confirmed"}'
  onload?: () => void
  onerror?: () => void
  onabort?: () => void
  ontimeout?: () => void
  constructor() { FakeXHR.instance = this }
  open(_method: string, _url: string) {}
  send(_body: FormData) {}
  abort() { this.onabort?.() }
}

test("XHR upload reports real byte events, handles HTTP failure and abort", async () => {
  const original = globalThis.XMLHttpRequest
  globalThis.XMLHttpRequest = FakeXHR as unknown as typeof XMLHttpRequest
  try {
    const file = new File(["image"], "photo.png", { type: "image/png" })
    const progress: number[] = []
    const first = api.uploadWebsiteAsset(file, "project", { onProgress: (value) => progress.push(value) })
    const xhr = FakeXHR.instance
    assert.equal(xhr.withCredentials, true)
    assert.equal(xhr.timeout, 0, "no deadline-driven automatic duplicate retry")
    xhr.upload.onprogress!({ lengthComputable: true, loaded: 5, total: 10 })
    assert.deepEqual(progress, [50])
    xhr.onload!()
    assert.equal((await first).asset_id, "confirmed")
    const failed = api.uploadWebsiteAsset(file, "project", { onProgress: () => {} })
    FakeXHR.instance.status = 422
    FakeXHR.instance.responseText = '{"detail":"Rejected image"}'
    FakeXHR.instance.onload!()
    await assert.rejects(failed, /Rejected image/)
    const controller = new AbortController()
    const cancelled = api.uploadWebsiteAsset(file, "project", { onProgress: () => {}, signal: controller.signal })
    controller.abort()
    await assert.rejects(cancelled, { name: "AbortError" })
    const timeout = api.uploadWebsiteAsset(file, "project", { onProgress: () => {} })
    FakeXHR.instance.ontimeout!()
    await assert.rejects(timeout, /completion is unknown/)
  } finally { globalThis.XMLHttpRequest = original }
})
