"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { ProposalPreviewPage } from "@/components/proposal-preview-page"
import { api } from "@/lib/api"
import type { ContractorProfile, Job, Proposal } from "@/lib/types"

export default function QuoteProposalPreview() {
  const params = useParams()
  const t = useTranslations("proposals")
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
        setError(err?.message || t("errors.loadProposal"))
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [jobId, t])

  return (
    <ProposalPreviewPage
      proposal={proposal}
      job={job}
      contractorName={contractorName}
      locale={locale}
      loading={loading}
      error={error}
      breadcrumbs={[
        { label: t("routePage.breadcrumbQuotes"), href: `/${locale}/quotes` },
        { label: t("routePage.breadcrumbQuoteNumber", { id: jobId }), href: `/${locale}/quotes/${jobId}` },
        { label: t("routePage.breadcrumbProposal"), href: `/${locale}/quotes/${jobId}/proposal` },
        { label: t("routePage.breadcrumbPreview") },
      ]}
      backHref={`/${locale}/quotes/${jobId}`}
      backLabel={t("routePage.backToQuote")}
    />
  )
}
