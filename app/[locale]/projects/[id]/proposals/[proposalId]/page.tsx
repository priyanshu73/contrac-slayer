"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProposalBuilder } from "@/components/proposal-builder"
import { api } from "@/lib/api"
import type { Client, ContractorProfile, Job, Project, Proposal } from "@/lib/types"

export default function ProjectProposalPage() {
  const params = useParams()
  const t = useTranslations("proposals")
  const locale = (params.locale as string) || "en"
  const projectId = Number(params.id)
  const proposalId = Number(params.proposalId)

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [refJob, setRefJob] = useState<Job | null>(null)
  const [contractorName, setContractorName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId || !proposalId) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [proposalRes, projectRes, profileRes, clientsRes] = await Promise.all([
          api.getProposal(projectId, proposalId),
          api.getProject(projectId),
          api.getMyProfile().catch(() => null),
          api.getClients(0, 100).catch(() => []),
        ])

        const loadedProposal = proposalRes as Proposal
        const loadedProject = projectRes as Project
        const loadedClients = (Array.isArray(clientsRes) ? clientsRes : (clientsRes as any)?.items ?? []) as Client[]

        setProposal(loadedProposal)
        setProject(loadedProject)
        setClients(loadedClients)
        setContractorName(
          (profileRes as ContractorProfile | null)?.company_name || ""
        )

        // For project-linked proposals, the project's client is the source of truth.
        const linkedClientId = loadedProject.client_id ?? loadedProposal.client_id
        if (linkedClientId) {
          try {
            const clientData = (await api.getClient(linkedClientId)) as Client
            setClient(clientData)
          } catch {
            const fromList = loadedClients.find((c) => c.id === linkedClientId)
            if (fromList) setClient(fromList)
          }
        }

        // Load the first referenced quote for line-item context
        const firstRef = loadedProposal.quote_references?.[0]
        if (firstRef?.job_id) {
          try {
            const job = (await api.getJob(firstRef.job_id)) as Job
            setRefJob(job)
            if (job.client) {
              setClient((prev) => prev ?? (job.client as Client))
            } else if (job.client_id && !linkedClientId) {
              try {
                const clientData = (await api.getClient(job.client_id)) as Client
                setClient(clientData)
              } catch {
                // non-fatal
              }
            }
          } catch {
            // non-fatal — proposal builder works without a ref job
          }
        }
      } catch (err: any) {
        setError(err?.message || t("errors.loadProposal"))
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [projectId, proposalId, t])

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

  if (error || !proposal || !project) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-xl">
            <Card className="rounded-3xl p-8 text-center shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-950">{t("routePage.unableToOpen")}</h1>
              <p className="mt-3 text-sm text-slate-600">{error || t("errors.proposalNotFound")}</p>
              <Button asChild className="mt-6">
                <a href={`/${locale}/projects/${projectId}`}>{t("routePage.backToProject")}</a>
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
          { label: t("routePage.breadcrumbProjects"), href: `/${locale}/projects` },
          { label: project.title, href: `/${locale}/projects/${projectId}` },
          { label: proposal.title || t("routePage.breadcrumbProposal") },
        ]}
      />
      <ProposalBuilder
        proposal={proposal}
        project={project}
        client={client ?? undefined}
        clients={clients}
        job={refJob ?? undefined}
        contractorName={contractorName}
        locale={locale}
        onProposalUpdated={setProposal}
        onProjectClientChanged={async (clientId) => {
          try {
            await api.updateProject(projectId, { client_id: clientId })
            let updated = clients.find((c) => c.id === clientId) ?? null
            if (clientId && !updated) {
              try {
                updated = (await api.getClient(clientId)) as Client
              } catch {
                updated = null
              }
            }
            setClient(updated)
            setProject((prev) => prev ? { ...prev, client_id: clientId } : prev)
            setProposal((prev) => prev ? { ...prev, client_id: clientId } : prev)
          } catch {
            // non-fatal — the document already reflects the selection
          }
        }}
      />
    </AuthGuard>
  )
}
