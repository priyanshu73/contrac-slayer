import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { compareScheduledTimeAscending, loadFollowupActivity } from "../lib/followup-activity"
import type { ScheduledFollowup } from "../lib/types/followup"

function followup(id: number, status: ScheduledFollowup["status"]): ScheduledFollowup {
  return {
    id,
    sp_id: 7,
    customer_number: "+15551112222",
    scheduled_for: `2026-09-${String(20 + id).padStart(2, "0")}T17:00:00Z`,
    followup_type: "quote",
    source: "automation",
    message_text: `message ${id}`,
    status,
    created_at: "2026-09-20T17:00:00Z",
    updated_at: "2026-09-20T17:00:00Z",
  }
}

describe("follow-up activity loading", () => {
  it("keeps every pending page even when capped history contains the same row", async () => {
    const calls: Array<Record<string, unknown> | undefined> = []
    const reader = {
      async getScheduledFollowups(params?: Record<string, unknown>) {
        calls.push(params)
        if (params?.status === "all") {
          return { followups: [followup(1, "sent"), followup(2, "sent")], total: 900 }
        }
        if (params?.offset === 0) {
          return { followups: [followup(2, "pending"), followup(3, "pending")], total: 3 }
        }
        return { followups: [followup(4, "pending")], total: 3 }
      },
    }

    const rows = await loadFollowupActivity(reader)

    assert.deepEqual(calls, [
      { status: "all", limit: 500, sort: "desc" },
      { status: "pending", limit: 500, offset: 0, sort: "asc" },
      { status: "pending", limit: 500, offset: 2, sort: "asc" },
    ])
    assert.deepEqual(rows.map((row) => [row.id, row.status]), [
      [1, "sent"],
      [2, "pending"],
      [3, "pending"],
      [4, "pending"],
    ])
  })

  it("orders planned sends from nearest to furthest", () => {
    const rows = [followup(4, "pending"), followup(1, "pending"), followup(3, "pending")]
    rows.sort(compareScheduledTimeAscending)
    assert.deepEqual(rows.map((row) => row.id), [1, 3, 4])
  })
})
