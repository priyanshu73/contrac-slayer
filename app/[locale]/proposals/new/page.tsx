"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { ArrowLeft, FileText, FolderOpen, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/api"
import type { Proposal, ProjectListItem } from "@/lib/types"

function getStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case "PLANNING": return "bg-amber-500/15 text-amber-700"
    case "IN_PROGRESS": return "bg-sky-500/15 text-sky-700"
    case "ON_HOLD": return "bg-orange-500/15 text-orange-700"
    case "COMPLETED": return "bg-teal-500/15 text-teal-700"
    case "CANCELLED": return "bg-rose-500/15 text-rose-700"
    default: return "bg-muted text-muted-foreground"
  }
}

function formatStatusLabel(status: string) {
  return String(status || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

interface ProjectWithProposals extends ProjectListItem {
  proposals?: Proposal[]
  loadingProposals?: boolean
}

export default function NewProposalPage() {
  const router = useRouter()
  const locale = useLocale()

  const [projects, setProjects] = useState<ProjectWithProposals[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingFor, setCreatingFor] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = (await api.getProjects({ limit: 200 })) as ProjectWithProposals[]
        if (cancelled) return
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        )
        setProjects(sorted)

        // Load proposals for each project in parallel
        sorted.forEach(async (project) => {
          try {
            const proposals = (await api.getProjectProposals(project.id)) as Proposal[]
            if (cancelled) return
            setProjects((prev) =>
              prev.map((p) => (p.id === project.id ? { ...p, proposals } : p))
            )
          } catch {
            // non-fatal — just won't show proposal count
          }
        })
      } catch {
        if (!cancelled) setProjects([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const handleNewProposal = async (project: ProjectWithProposals) => {
    setCreatingFor(project.id)
    try {
      const proposal = (await api.createProposal(project.id, {
        title: `${project.title} Proposal`,
      })) as Proposal
      router.push(`/${locale}/projects/${project.id}/proposals/${proposal.id}`)
    } catch (err: any) {
      console.error("Failed to create proposal:", err)
      setCreatingFor(null)
    }
  }

  const openExistingProposal = (projectId: number, proposalId: number) => {
    router.push(`/${locale}/projects/${projectId}/proposals/${proposalId}`)
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold leading-none">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Create Proposal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Pick a project to create a proposal for</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex animate-pulse items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-48 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-28 rounded bg-muted" />
                </div>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-1 text-base font-semibold">No projects yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create a project first, then build a proposal for it.
                </p>
                <Button size="sm" onClick={() => router.push(`/${locale}/projects`)}>
                  Go to Projects
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const proposalCount = project.proposals?.length ?? null
              const isCreating = creatingFor === project.id

              return (
                <Card key={project.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">{project.title}</h3>
                        <Badge className={`shrink-0 px-1.5 py-0 text-[10px] ${getStatusColor(project.status)}`}>
                          {formatStatusLabel(project.status)}
                        </Badge>
                        {proposalCount !== null && proposalCount > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {proposalCount} proposal{proposalCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Existing proposals list */}
                      {project.proposals && project.proposals.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {project.proposals.map((proposal) => (
                            <button
                              key={proposal.id}
                              onClick={() => openExistingProposal(project.id, proposal.id)}
                              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {proposal.title || `Proposal #${proposal.id}`}
                              </span>
                              <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                                proposal.status === "SENT" ? "bg-blue-100 text-blue-700" :
                                proposal.status === "VIEWED" ? "bg-violet-100 text-violet-700" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {proposal.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNewProposal(project)}
                      disabled={isCreating}
                      className="shrink-0"
                    >
                      {isCreating ? (
                        <span className="flex items-center gap-1.5">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Creating…
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          New Proposal
                        </span>
                      )}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
