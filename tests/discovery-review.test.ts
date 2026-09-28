import assert from "node:assert/strict"
import test from "node:test"
import { canApproveDiscoveredLead } from "../lib/discovery-review"

test("only qualified non-rejected prospects can be selected for approval", () => {
  const eligible = { score: 72, meta_context: { qualification: { version: 1, eligible: true } } }
  assert.equal(canApproveDiscoveredLead(eligible), true)
  assert.equal(canApproveDiscoveredLead({ ...eligible, score: 0 }), false)
  assert.equal(canApproveDiscoveredLead({ ...eligible, status: "REJECTED" }), false)
  assert.equal(canApproveDiscoveredLead({ score: 72 }), false)
  assert.equal(canApproveDiscoveredLead({ ...eligible, meta_context: { qualification: { version: 1, eligible: false } } }), false)
})
