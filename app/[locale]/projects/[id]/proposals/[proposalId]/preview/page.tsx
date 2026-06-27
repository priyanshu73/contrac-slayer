"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { ProposalPreviewPage } from "@/components/proposal-preview-page"
import { api } from "@/lib/api"
import type { ContractorProfile, Project, Proposal } from "@/lib/types"

export default function ProjectProposalPreview() {
  const params = useParams()
  const t = useTranslations("proposals")
  const locale = (params.locale as string) || "en"
  const projectId = Number(params.id)
  const proposalId = Number(params.proposalId)

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [contractorName, setContractorName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId || !proposalId) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [proposalRes, projectRes, profileRes] = await Promise.all([
          api.getProposal(projectId, proposalId),
          api.getProject(projectId),
          api.getMyProfile().catch(() => null),
        ])
        setProposal(proposalRes as Proposal)
        setProject(projectRes as Project)
        setContractorName((profileRes as ContractorProfile | null)?.company_name || "")
      } catch (err: any) {
        setError(err?.message || t("errors.loadProposal"))
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [projectId, proposalId, t])

  return (
    <ProposalPreviewPage
      proposal={proposal}
      project={project}
      contractorName={contractorName}
      locale={locale}
      loading={loading}
      error={error}
      breadcrumbs={[
        { label: t("routePage.breadcrumbProjects"), href: `/${locale}/projects` },
        { label: project?.title ?? t("routePage.breadcrumbProjectNumber", { id: projectId }), href: `/${locale}/projects/${projectId}` },
        { label: proposal?.title || t("routePage.breadcrumbProposalNumber", { id: proposalId }), href: `/${locale}/projects/${projectId}/proposals/${proposalId}` },
        { label: t("routePage.breadcrumbPreview") },
      ]}
      backHref={`/${locale}/projects/${projectId}`}
      backLabel={t("routePage.backToProject")}
    />
  )
}
