"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProposalBuilder } from "@/components/proposal-builder"
import { ClientDocumentNav, clientDocumentNavContentClassName } from "@/components/client-document-nav"
import { useClientPortalDocuments } from "@/hooks/use-client-portal-documents"
import { resolveQuoteNavUrl } from "@/lib/client-portal-nav"
import { api } from "@/lib/api"
import type { Proposal, PublicProposalLookup } from "@/lib/types"

export default function PublicProposalPage() {
  const params = useParams()
  const t = useTranslations("proposals")
  const locale = (params.locale as string) || "en"
  const identifier = params.id as string
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { quotes: portalQuotes } = useClientPortalDocuments(
    proposal?.client_portal_token,
    proposal ? { quotes: proposal.portal_quotes, proposals: proposal.portal_proposals } : null
  )

  useEffect(() => {
    let cancelled = false

    const loadProposal = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = (await api.getProposalByPublicLink(identifier)) as PublicProposalLookup
        if (!cancelled) {
          setProposal(response.proposal ?? null)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || t("errors.publicProposalNotFound"))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProposal()

    return () => {
      cancelled = true
    }
  }, [identifier, t])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-10 w-72 animate-pulse rounded-full bg-slate-200" />
          <div className="h-48 animate-pulse rounded-[32px] bg-slate-200" />
          <div className="h-64 animate-pulse rounded-[32px] bg-slate-200" />
        </div>
      </div>
    )
  }

  const fallbackQuoteUrl = resolveQuoteNavUrl(
    portalQuotes,
    locale,
    proposal?.linked_quote_public_link
  )

  // No saved proposal for this link — a calm empty state, not an error.
  if (error || !proposal || !proposal.proposal_document) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl">
          <Card className="rounded-3xl p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-950">{t("public.noProposal")}</h1>
            <p className="mt-3 text-sm text-slate-600">
              {t("public.noProposalDescription")}
            </p>
            {fallbackQuoteUrl ? (
              <Button asChild className="mt-6">
                <a href={fallbackQuoteUrl}>{t("public.viewQuote")}</a>
              </Button>
            ) : null}
          </Card>
        </div>
      </div>
    )
  }

  const contractorName =
    proposal.proposal_document.contractorName || t("doc.contractor")
  const quoteUrl = resolveQuoteNavUrl(
    portalQuotes.length > 0 ? portalQuotes : (proposal.portal_quotes ?? []),
    locale,
    proposal.linked_quote_public_link
  )

  return (
    <div className="flex min-h-screen">
      <ClientDocumentNav
        locale={locale}
        portalToken={proposal.client_portal_token}
        activeView="proposal"
        hasQuote={Boolean(quoteUrl)}
        hasProposal
        quoteUrl={quoteUrl}
      />

      <div className={clientDocumentNavContentClassName()}>
        <ProposalBuilder
          proposal={proposal}
          contractorName={contractorName}
          locale={locale}
          publicMode={true}
          onProposalUpdated={setProposal}
        />
      </div>
    </div>
  )
}
