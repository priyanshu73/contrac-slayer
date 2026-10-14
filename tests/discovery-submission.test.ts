import { test } from "node:test"
import assert from "node:assert/strict"

import { POST } from "../app/[locale]/(public)/discover/submit/route"
import { toSheetDbRow } from "../lib/discovery-sheetdb"

const answers = {
  business_name: "Oak Ridge Landscaping",
  business_type: ["landscaping", "general"],
  business_type_other: "",
  team_size: "2_5",
  service_areas: "78719, Austin",
  annual_revenue: "",
  existing_assets: ["google_account", "website"],
  estimate_method: "documents",
  current_software: "",
  desired_features: ["calendar", "estimates"],
  ai_receptionist_interest: "maybe",
  commercial_leads_interest: "no",
  contact_name: "Alex Rivera",
  email: "alex@example.com",
  phone: "5125550148",
} as const

function request(body: unknown) {
  return new Request("http://localhost/en/discover/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("SheetDB row uses expected flat columns", () => {
  const row = toSheetDbRow({
    ...answers,
    business_type: [...answers.business_type],
    existing_assets: [...answers.existing_assets],
    desired_features: [...answers.desired_features],
  })
  assert.equal(row.business_type, "landscaping, general")
  assert.equal(row.desired_features, "calendar, estimates")
  assert.equal(row.has_google_account, "Yes")
  assert.equal(row.has_business_profile, "No")
  assert.equal(row.has_website, "Yes")
  assert.match(row.id, /^[0-9a-f-]{36}$/)
  assert.ok(!Number.isNaN(Date.parse(row.timestamp)))
})

test("discovery POST validates, forwards once, and fails closed", async () => {
  const previousEndpoint = process.env.SHEETDB_DISCOVERY_API_URL
  const previousFetch = globalThis.fetch
  let calls = 0
  let forwarded: unknown

  try {
    delete process.env.SHEETDB_DISCOVERY_API_URL
    assert.equal((await POST(request(answers))).status, 503)

    process.env.SHEETDB_DISCOVERY_API_URL = "https://sheetdb.io/api/v1/test"
    assert.equal((await POST(request({ ...answers, email: "bad" }))).status, 400)

    globalThis.fetch = async (_input, init) => {
      calls += 1
      forwarded = JSON.parse(String(init?.body))
      return Response.json({ created: 1 }, { status: 201 })
    }
    const success = await POST(request(answers))
    assert.equal(success.status, 200)
    assert.equal(calls, 1)
    assert.equal((forwarded as { data: { email: string }[] }).data[0].email, answers.email)
    assert.equal((forwarded as { mode: string }).mode, "RAW")

    globalThis.fetch = async () => Response.json({ error: "failed" }, { status: 500 })
    assert.equal((await POST(request(answers))).status, 502)

    globalThis.fetch = async () => Response.json({ created: 0 })
    assert.equal((await POST(request(answers))).status, 502)
  } finally {
    globalThis.fetch = previousFetch
    if (previousEndpoint === undefined) delete process.env.SHEETDB_DISCOVERY_API_URL
    else process.env.SHEETDB_DISCOVERY_API_URL = previousEndpoint
  }
})
