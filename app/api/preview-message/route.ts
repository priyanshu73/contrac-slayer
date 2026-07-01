import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const brief = typeof body?.brief === "string" ? body.brief.trim() : ""
  const city = typeof body?.city === "string" && body.city.trim() ? body.city.trim() : "your area"
  const state = typeof body?.state === "string" && body.state.trim() ? body.state.trim().toUpperCase() : ""
  const segment = typeof body?.segment === "string" && body.segment.trim() ? body.segment.trim().replaceAll("_", " ") : "property managers"
  const market = [city, state].filter(Boolean).join(", ")

  const subject = `Quick intro for ${segment} in ${market || "your market"}`
  const bodyText = [
    `Hi there,`,
    ``,
    `We help ${segment} in ${market || "your market"} keep trade work moving with reliable response times and clear communication.`,
    brief ? `Guidance we are using: ${brief}` : `We would keep the message concise, practical, and focused on maintenance or service reliability.`,
    ``,
    `If it helps, I can send over a short overview of how we support recurring maintenance and overflow jobs.`,
    ``,
    `Best,`,
    `ContractorOps sample outreach`,
  ].join("\n")

  return NextResponse.json({
    subject,
    body: bodyText,
  })
}
