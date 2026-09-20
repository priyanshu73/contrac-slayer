import type { FollowupSource, FollowupStatus, ScheduledFollowup } from "@/lib/types/followup"

interface ScheduledFollowupReader {
  getScheduledFollowups(params?: {
    status?: FollowupStatus | "all"
    limit?: number
    offset?: number
    sort?: "asc" | "desc"
    customer_number?: string
    source?: FollowupSource
  }): Promise<{ followups: ScheduledFollowup[]; total: number }>
}

const PAGE_SIZE = 500

export function compareScheduledTimeAscending(a: ScheduledFollowup, b: ScheduledFollowup): number {
  return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
}

export async function loadFollowupActivity(reader: ScheduledFollowupReader): Promise<ScheduledFollowup[]> {
  const [recent, firstPendingPage] = await Promise.all([
    reader.getScheduledFollowups({ status: "all", limit: PAGE_SIZE, sort: "desc" }),
    reader.getScheduledFollowups({ status: "pending", limit: PAGE_SIZE, offset: 0, sort: "asc" }),
  ])

  const pending = [...(firstPendingPage.followups ?? [])]
  let offset = pending.length
  while (offset < firstPendingPage.total) {
    const page = await reader.getScheduledFollowups({
      status: "pending",
      limit: PAGE_SIZE,
      offset,
      sort: "asc",
    })
    const rows = page.followups ?? []
    if (rows.length === 0) break
    pending.push(...rows)
    offset += rows.length
  }

  const byId = new Map<number, ScheduledFollowup>()
  for (const row of [...(recent.followups ?? []), ...pending]) byId.set(row.id, row)
  return [...byId.values()]
}
