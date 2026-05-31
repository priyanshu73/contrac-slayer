"use client"

import { AuthGuard } from "@/components/auth-guard"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { ProposalBuilder } from "@/components/proposal-builder"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { Job, Proposal, Project } from "@/lib/types"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface ProposalPreviewPageProps {
  proposal: Proposal | null
  project?: Project | null
  job?: Job | null
  contractorName: string
  locale: string
  loading: boolean
  error: string | null
  breadcrumbs: BreadcrumbItem[]
  backHref: string
  backLabel: string
}

export function ProposalPreviewPage({
  proposal,
  project,
  job,
  contractorName,
  locale,
  loading,
  error,
  breadcrumbs,
  backHref,
  backLabel,
}: ProposalPreviewPageProps) {
  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
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
              <h1 className="text-2xl font-semibold text-slate-950">Unable to open preview</h1>
              <p className="mt-3 text-sm text-slate-600">{error || "Proposal not found."}</p>
              <Button asChild className="mt-6">
                <a href={backHref}>{backLabel}</a>
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
        items={breadcrumbs}
      />
      <ProposalBuilder
        proposal={proposal}
        project={project ?? undefined}
        job={job ?? undefined}
        contractorName={contractorName}
        locale={locale}
        publicMode={true}
        onProposalUpdated={() => {}}
      />
    </AuthGuard>
  )
}
