import { discoveryQuestionnaireSchema } from "@/lib/discovery-questionnaire"
import { toSheetDbRow } from "@/lib/discovery-sheetdb"

const MAX_BODY_LENGTH = 32_000

export async function POST(request: Request) {
  const endpoint = process.env.SHEETDB_DISCOVERY_API_URL
  if (!endpoint) {
    return Response.json({ error: "unavailable" }, { status: 503 })
  }

  const body = await request.text().catch(() => "")
  if (!body || body.length > MAX_BODY_LENGTH) {
    return Response.json({ error: "invalid_submission" }, { status: 400 })
  }

  let submitted: unknown
  try {
    submitted = JSON.parse(body)
  } catch {
    return Response.json({ error: "invalid_submission" }, { status: 400 })
  }

  const parsed = discoveryQuestionnaireSchema.safeParse(submitted)
  if (!parsed.success) {
    return Response.json({ error: "invalid_submission" }, { status: 400 })
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ data: [toSheetDbRow(parsed.data)], mode: "RAW" }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      return Response.json({ error: "submission_failed" }, { status: 502 })
    }
    const result: unknown = await response.json()
    if (!result || typeof result !== "object" || !("created" in result) || result.created !== 1) {
      return Response.json({ error: "submission_failed" }, { status: 502 })
    }
    return Response.json({ submitted: true }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return Response.json({ error: "submission_failed" }, { status: 502 })
  }
}
