import assert from "node:assert/strict"
import test from "node:test"
import { canApproveDiscoveredLead, canOverrideGeography } from "../lib/discovery-review"

test("only qualified non-rejected prospects can be selected for approval", () => {
  const eligible = { score: 72, meta_context: { qualification: { version: 1, eligible: true } } }
  assert.equal(canApproveDiscoveredLead(eligible), true)
  assert.equal(canApproveDiscoveredLead({ ...eligible, score: 0 }), false)
  assert.equal(canApproveDiscoveredLead({ ...eligible, status: "REJECTED" }), false)
  assert.equal(canApproveDiscoveredLead({ score: 72 }), false)
  assert.equal(canApproveDiscoveredLead({ ...eligible, meta_context: { qualification: { version: 1, eligible: false } } }), false)
})

test("geography-only unverified leads need an explicit per-row override", () => {
  const lead = { score: 72, meta_context: { qualification: { version: 1, tier: "unverified", eligible: false, segment_match: true, geography_match: false, minimum_score: 40 } } }
  assert.equal(canApproveDiscoveredLead(lead), false)
  assert.equal(canOverrideGeography(lead), true)
  assert.equal(canOverrideGeography({ ...lead, score: 30 }), false)
  assert.equal(canOverrideGeography({ ...lead, status: "REJECTED" }), false)
  assert.equal(canOverrideGeography({ ...lead, meta_context: { qualification: { ...lead.meta_context.qualification, segment_match: false } } }), false)
  assert.equal(canOverrideGeography({ ...lead, meta_context: { qualification: { ...lead.meta_context.qualification, tier: "blocked" } } }), false)
})
