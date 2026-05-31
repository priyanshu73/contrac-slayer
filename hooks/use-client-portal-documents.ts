"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type {
  ClientPortalData,
  ClientPortalProposalItem,
  ClientPortalQuoteItem,
} from "@/lib/types"

type PortalDocumentsSeed = {
  quotes?: ClientPortalQuoteItem[]
  proposals?: ClientPortalProposalItem[]
}

/** Load quotes/proposals for client sidebar nav. Uses embedded API data when provided. */
export function useClientPortalDocuments(
  portalToken?: string | null,
  seed?: PortalDocumentsSeed | null
) {
  const hasSeed =
    (seed?.quotes?.length ?? 0) > 0 || (seed?.proposals?.length ?? 0) > 0

  const [quotes, setQuotes] = useState<ClientPortalQuoteItem[]>(seed?.quotes ?? [])
  const [proposals, setProposals] = useState<ClientPortalProposalItem[]>(
    seed?.proposals ?? []
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hasSeed) {
      setQuotes(seed?.quotes ?? [])
      setProposals(seed?.proposals ?? [])
      return
    }

    if (!portalToken) {
      setQuotes([])
      setProposals([])
      return
    }

    let cancelled = false
    setLoading(true)

    api
      .getClientPortal(portalToken)
      .then((data) => {
        if (cancelled) return
        const portal = data as ClientPortalData
        setQuotes(Array.isArray(portal.quotes) ? portal.quotes : [])
        setProposals(Array.isArray(portal.proposals) ? portal.proposals : [])
      })
      .catch(() => {
        if (!cancelled) {
          setQuotes([])
          setProposals([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [portalToken, hasSeed, seed?.quotes, seed?.proposals])

  return { quotes, proposals, loading }
}
