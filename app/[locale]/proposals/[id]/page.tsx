"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProposalBuilder } from "@/components/proposal-builder"
import { api } from "@/lib/api"
import type { Job } from "@/lib/types"

export default function PublicProposalPage() {
  const params = useParams()
  const locale = (params.locale as string) || "en"
  const identifier = params.id as string
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadProposal = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = (await api.getProposalByPublicLink(identifier)) as Job
        if (!cancelled) {
          setJob(response)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load proposal.")
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
  }, [identifier])

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

  if (error || !job || !job.proposal_document) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl">
          <Card className="rounded-3xl p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-950">Unable to open proposal</h1>
            <p className="mt-3 text-sm text-slate-600">{error || "Proposal not found."}</p>
            {job?.quote_public_link ? (
              <Button asChild className="mt-6">
                <a href={`/${locale}/quotes/${job.quote_public_link}`}>View Quote</a>
              </Button>
            ) : null}
          </Card>
        </div>
      </div>
    )
  }

  const contractorName = job.contractor?.company_name || job.proposal_document.contractorName || "Contractor"

  return (
    <ProposalBuilder
      job={job}
      contractorName={contractorName}
      locale={locale}
      publicMode={true}
      onJobUpdated={setJob}
    />
  )
}
