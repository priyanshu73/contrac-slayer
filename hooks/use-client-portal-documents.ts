"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type {
  ClientPortalData,
  ClientPortalInvoice,
  ClientPortalProposalItem,
  ClientPortalQuoteItem,
} from "@/lib/types"

type PortalDocumentsSeed = {
  quotes?: ClientPortalQuoteItem[]
  proposals?: ClientPortalProposalItem[]
  invoices?: ClientPortalInvoice[]
}

/** Load quotes/proposals/invoices for client sidebar nav. Uses embedded API data when provided. */
export function useClientPortalDocuments(
  portalToken?: string | null,
  seed?: PortalDocumentsSeed | null
) {
  const hasSeed =
    (seed?.quotes?.length ?? 0) > 0 ||
    (seed?.proposals?.length ?? 0) > 0 ||
    (seed?.invoices?.length ?? 0) > 0

  const [quotes, setQuotes] = useState<ClientPortalQuoteItem[]>(seed?.quotes ?? [])
  const [proposals, setProposals] = useState<ClientPortalProposalItem[]>(
    seed?.proposals ?? []
  )
  const [invoices, setInvoices] = useState<ClientPortalInvoice[]>(seed?.invoices ?? [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hasSeed) {
      setQuotes(seed?.quotes ?? [])
      setProposals(seed?.proposals ?? [])
      setInvoices(seed?.invoices ?? [])
      return
    }

    if (!portalToken) {
      setQuotes([])
      setProposals([])
      setInvoices([])
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
        setInvoices(Array.isArray(portal.invoices) ? portal.invoices : [])
      })
      .catch(() => {
        if (!cancelled) {
          setQuotes([])
          setProposals([])
          setInvoices([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [portalToken, hasSeed, seed?.quotes, seed?.proposals, seed?.invoices])

  return { quotes, proposals, invoices, loading }
}
