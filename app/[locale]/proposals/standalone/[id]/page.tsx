"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProposalBuilder } from "@/components/proposal-builder"
import { api } from "@/lib/api"
import type { Client, ContractorProfile, Proposal } from "@/lib/types"

export default function StandaloneProposalPage() {
  const params = useParams()
  const locale = (params.locale as string) || "en"
  const proposalId = Number(params.id)

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [contractorName, setContractorName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!proposalId) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [proposalRes, profileRes, clientsRes] = await Promise.all([
          api.getStandaloneProposal(proposalId),
          api.getMyProfile().catch(() => null),
          api.getClients(0, 100).catch(() => []),
        ])

        const loadedProposal = proposalRes as Proposal
        const loadedClients = (Array.isArray(clientsRes) ? clientsRes : (clientsRes as any)?.items ?? []) as Client[]

        setProposal(loadedProposal)
        setClients(loadedClients)
        setContractorName((profileRes as ContractorProfile | null)?.company_name || "")

        if (loadedProposal.client_id) {
          const fromList = loadedClients.find((c) => c.id === loadedProposal.client_id)
          if (fromList) {
            setClient(fromList)
          } else {
            try {
              setClient((await api.getClient(loadedProposal.client_id)) as Client)
            } catch {
              // non-fatal
            }
          }
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load proposal.")
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [proposalId])

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

  if (error || !proposal) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-xl">
            <Card className="rounded-3xl p-8 text-center shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-950">Unable to open proposal</h1>
              <p className="mt-3 text-sm text-slate-600">{error || "Proposal not found."}</p>
              <Button asChild className="mt-6">
                <a href={`/${locale}/proposals/new`}>Back to Proposals</a>
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
          { label: "Proposals", href: `/${locale}/proposals/new` },
          { label: proposal.title || "Proposal" },
        ]}
      />
      <ProposalBuilder
        proposal={proposal}
        client={client ?? undefined}
        clients={clients}
        contractorName={contractorName}
        locale={locale}
        onProposalUpdated={setProposal}
      />
    </AuthGuard>
  )
}
