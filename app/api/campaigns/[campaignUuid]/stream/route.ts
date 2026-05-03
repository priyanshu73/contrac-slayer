import { cookies } from "next/headers"
import { NextRequest } from "next/server"

const BACKEND = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000"

/**
 * Proxies the SSE stream from the FastAPI backend.
 * The browser calls this same-origin route; it forwards the session cookie
 * to the backend and streams events back transparently.
 *
 * GET /api/campaigns/[campaignUuid]/stream
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignUuid: string }> }
) {
  const { campaignUuid } = await params
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value

  const backendUrl = `${BACKEND}/api/campaigns/${campaignUuid}/stream`

  const backendResponse = await fetch(backendUrl, {
    headers: {
      Accept: "text/event-stream",
      ...(session ? { Cookie: `session=${session}` } : {}),
    },
    // Signal forwarding so client disconnect cancels backend stream
    signal: req.signal,
  })

  if (!backendResponse.ok || !backendResponse.body) {
    return new Response(JSON.stringify({ error: "stream_unavailable" }), {
      status: backendResponse.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(backendResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  })
}
