import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("release keeps draft financial separation and reconciled draw previews", () => {
  const source = readFileSync(new URL("../components/quote-invoices-section.tsx", import.meta.url), "utf8")
  assert.match(source, /line\.state === "DRAFT"/)
  assert.match(source, /summary\.issued \?\? summary\.billed/)
  assert.match(source, /summary\.draft \?\? 0/)
  assert.match(source, /computeDraws\(/)
  assert.match(source, /draftAmounts\[i\]\?\.amount/)
  assert.doesNotMatch(source, /function draftAmount\(|<<<<<<<|>>>>>>>/)
})
