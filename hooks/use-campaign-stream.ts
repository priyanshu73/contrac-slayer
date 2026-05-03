"use client"

import { useEffect, useRef, useState } from "react"

export interface CampaignProgress {
  phase?: string
  leads_found?: number
  drafts_generated?: number
  emails_sent?: number
  emails_total?: number
}

export interface CampaignStreamState {
  status: string | null
  awaiting_checkpoint: string | null
  job_progress: CampaignProgress
  last_error: string | null
  connected: boolean
}

const INITIAL: CampaignStreamState = {
  status: null,
  awaiting_checkpoint: null,
  job_progress: {},
  last_error: null,
  connected: false,
}

/** Campaign statuses where the thread is stopped — SSE stream will close. */
export const TERMINAL_STATUSES = new Set([
  "AWAITING_REVIEW",
  "COMPLETED",
  "PAUSED",
  "FAILED",
  "CANCELLED",
])

/**
 * Opens a same-origin SSE connection to /api/campaigns/{uuid}/stream (Next.js proxy).
 * Streams live status + job_progress every ~2 seconds while the background thread runs.
 * Closes automatically when the campaign reaches a terminal state.
 *
 * Pass null/undefined campaignUuid to skip (safe during initial render).
 */
export function useCampaignStream(
  campaignUuid: string | null | undefined,
  active: boolean = true,
): CampaignStreamState {
  const [state, setState] = useState<CampaignStreamState>(INITIAL)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!campaignUuid || !active) {
      setState(INITIAL)
      return
    }

    const url = `/api/campaigns/${campaignUuid}/stream`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => setState((prev) => ({ ...prev, connected: true }))

    es.onmessage = (event) => {
      try {
        const data: {
          status?: string
          awaiting_checkpoint?: string
          job_progress?: CampaignProgress
          last_error?: string
        } = JSON.parse(event.data)

        setState({
          status: data.status ?? null,
          awaiting_checkpoint: data.awaiting_checkpoint ?? null,
          job_progress: data.job_progress ?? {},
          last_error: data.last_error ?? null,
          connected: true,
        })

        if (data.status && TERMINAL_STATUSES.has(data.status)) {
          es.close()
        }
      } catch {
        // malformed frame — ignore
      }
    }

    es.onerror = () => {
      setState((prev) => ({ ...prev, connected: false }))
      es.close()
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [campaignUuid, active])

  return state
}
