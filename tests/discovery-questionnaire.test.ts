import { test } from "node:test"
import assert from "node:assert/strict"

import {
  DISCOVERY_CALL_URL,
  DISCOVERY_STEP_FIELDS,
  discoveryQuestionnaireSchema,
} from "../lib/discovery-questionnaire"

const complete = {
  business_name: "Oak Ridge Landscaping",
  business_type: ["landscaping", "general"],
  business_type_other: "",
  team_size: "2_5",
  service_areas: "78719, Austin",
  annual_revenue: "",
  existing_assets: ["website"],
  estimate_method: "documents",
  current_software: "",
  desired_features: ["calendar", "estimates"],
  ai_receptionist_interest: "maybe",
  commercial_leads_interest: "no",
  contact_name: "Alex Rivera",
  email: "alex@example.com",
  phone: "5125550148",
}

test("minimal discovery answers are valid without the optional revenue question", () => {
  assert.equal(discoveryQuestionnaireSchema.safeParse(complete).success, true)
  assert.equal(DISCOVERY_CALL_URL, "https://cal.com/contractorops-ctbvka/30min")
  assert.equal(DISCOVERY_STEP_FIELDS.length, 4)
})

test("questionnaire does not silently assume trade, goals, or interest answers", () => {
  assert.equal(discoveryQuestionnaireSchema.safeParse({ ...complete, business_type: [] }).success, false)
  assert.equal(discoveryQuestionnaireSchema.safeParse({ ...complete, desired_features: [] }).success, false)
  assert.equal(discoveryQuestionnaireSchema.safeParse({ ...complete, ai_receptionist_interest: "" }).success, false)
  assert.equal(discoveryQuestionnaireSchema.safeParse({ ...complete, commercial_leads_interest: "" }).success, false)
  assert.equal(discoveryQuestionnaireSchema.safeParse({ ...complete, team_size: "" }).success, false)
  assert.equal(discoveryQuestionnaireSchema.safeParse({ ...complete, estimate_method: "" }).success, false)
})

test("questionnaire requires valid contact details", () => {
  assert.equal(discoveryQuestionnaireSchema.safeParse({ ...complete, email: "not-an-email" }).success, false)
  assert.equal(discoveryQuestionnaireSchema.safeParse({ ...complete, phone: "123" }).success, false)
})
