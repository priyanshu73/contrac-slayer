"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProposalBuilder } from "@/components/proposal-builder"
import { api } from "@/lib/api"
import type { ContractorProfile, Job } from "@/lib/types"

export default function QuoteProposalPage() {
  const params = useParams()
  const locale = (params.locale as string) || "en"
  const identifier = params.id as string
  const [job, setJob] = useState<Job | null>(null)
  const [contractorName, setContractorName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [jobResponse, profileResponse] = await Promise.all([
          api.getJob(Number(identifier)),
          api.getMyProfile().catch(() => null),
        ])

        setJob(jobResponse as Job)
        setContractorName((profileResponse as ContractorProfile | null)?.company_name || (jobResponse as Job)?.contractor?.company_name || "")
      } catch (err: any) {
        setError(err?.message || "Failed to load quote proposal.")
      } finally {
        setLoading(false)
      }
    }

    if (/^\d+$/.test(identifier)) {
      void fetchData()
    } else {
      setLoading(false)
      setError("Proposal builder is only available for saved quote records.")
    }
  }, [identifier])

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
            <div className="h-48 animate-pulse rounded-[32px] bg-slate-200" />
            <div className="h-64 animate-pulse rounded-[32px] bg-slate-200" />
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error || !job) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-xl">
            <Card className="rounded-3xl p-8 text-center shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-950">Unable to open proposal</h1>
              <p className="mt-3 text-sm text-slate-600">{error || "Quote not found."}</p>
              <Button asChild className="mt-6">
                <a href={`/${locale}/quotes/${identifier}`}>Back to Quote</a>
              </Button>
            </Card>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <AppBreadcrumb
        className="px-4 pt-4 sm:px-6 sm:pt-6 print:hidden"
        items={[
          { label: "Quotes", href: `/${locale}/quotes` },
          { label: `Quote #${job.id}`, href: `/${locale}/quotes/${job.id}` },
          { label: "Proposal" },
        ]}
      />
      <ProposalBuilder job={job} contractorName={contractorName} locale={locale} onJobUpdated={setJob} />
    </AuthGuard>
  )
}
