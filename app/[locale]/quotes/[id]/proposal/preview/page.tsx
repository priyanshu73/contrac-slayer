"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ProposalPreviewPage } from "@/components/proposal-preview-page"
import { api } from "@/lib/api"
import type { ContractorProfile, Job, Proposal } from "@/lib/types"

export default function QuoteProposalPreview() {
  const params = useParams()
  const locale = (params.locale as string) || "en"
  const jobId = Number(params.id)

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [contractorName, setContractorName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [jobRes, profileRes] = await Promise.all([
          api.getJob(jobId),
          api.getMyProfile().catch(() => null),
        ])
        const loadedJob = jobRes as Job
        setJob(loadedJob)
        setContractorName(
          (profileRes as ContractorProfile | null)?.company_name ||
          loadedJob?.contractor?.company_name || ""
        )
        const proposals = (await api.getJobProposals(jobId)) as Proposal[]
        setProposal(proposals[0] ?? null)
      } catch (err: any) {
        setError(err?.message || "Failed to load proposal.")
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [jobId])

  return (
    <ProposalPreviewPage
      proposal={proposal}
      job={job}
      contractorName={contractorName}
      locale={locale}
      loading={loading}
      error={error}
      breadcrumbs={[
        { label: "Quotes", href: `/${locale}/quotes` },
        { label: `Quote #${jobId}`, href: `/${locale}/quotes/${jobId}` },
        { label: "Proposal", href: `/${locale}/quotes/${jobId}/proposal` },
        { label: "Preview" },
      ]}
      backHref={`/${locale}/quotes/${jobId}`}
      backLabel="Back to Quote"
    />
  )
}
