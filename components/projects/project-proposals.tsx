"use client"

import { useEffect, useState } from "react"
import type { Proposal, Project } from "@/lib/types"
import { api } from "@/lib/api"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Loader2, FileText, Plus, Eye, Pencil, Trash2, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ProjectProposalsProps {
  project: Project
}

type StatusVisual = { dot: string; badge: string }

function proposalStatusVisual(status: string | undefined): StatusVisual {
  const s = String(status ?? "").toUpperCase()
  const map: Record<string, StatusVisual> = {
    DRAFT:  { dot: "bg-slate-300",   badge: "bg-slate-50 text-slate-500 border-slate-200" },
    SENT:   { dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
    VIEWED: { dot: "bg-sky-500",     badge: "bg-sky-50 text-sky-700 border-sky-200" },
  }
  return map[s] ?? { dot: "bg-indigo-400", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" }
}

export function ProjectProposals({ project }: ProjectProposalsProps) {
  const locale = useLocale()
  const router = useRouter()
  const { toast } = useToast()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const fetchProposals = async () => {
    if (!project.id) return
    try {
      setLoading(true)
      const data = await api.getProjectProposals(project.id)
      setProposals(Array.isArray(data) ? data : [])
    } catch (err: any) {
      toast({ title: "Failed to load proposals", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProposals() }, [project.id])

  const handleNew = async () => {
    try {
      const created = await api.createProposal(project.id, {}) as Proposal
      router.push(`/${locale}/projects/${project.id}/proposals/${created.id}`)
    } catch (err: any) {
      toast({ title: "Failed to create proposal", description: err.message, variant: "destructive" })
    }
  }

  const handleDelete = async (proposalId: number) => {
    setDeleting(proposalId)
    try {
      await api.deleteProposal(project.id, proposalId)
      toast({ title: `Proposal #${proposalId} deleted.` })
      fetchProposals()
    } catch (err: any) {
      toast({ title: "Failed to delete proposal", description: err.message, variant: "destructive" })
    } finally {
      setDeleting(null)
    }
  }

  if (!project.id) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-900">Proposals</span>
          {proposals.length > 0 && (
            <span className="rounded-md bg-slate-100 text-slate-600 text-xs font-semibold px-1.5 py-0.5 leading-none">
              {proposals.length}
            </span>
          )}
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Proposal
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FileText className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mt-1">No proposals yet</p>
          <p className="text-xs text-slate-400">Create a proposal to send to the client</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 px-3 pb-3">
          {proposals.map((proposal) => {
            const vis = proposalStatusVisual(proposal.status)
            const displayTitle = proposal.title || `Proposal #${proposal.id}`
            const viewCount = proposal.customer_view_count ?? 0
            const dateIso = proposal.updated_at || proposal.created_at
            const isBusy = deleting === proposal.id

            return (
              <li key={proposal.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/${locale}/projects/${project.id}/proposals/${proposal.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      router.push(`/${locale}/projects/${project.id}/proposals/${proposal.id}`)
                    }
                  }}
                  className="group flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors">
                    <FileText className="h-4 w-4" />
                  </div>

                  {/* Title + status */}
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-950 block">
                      {displayTitle}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border", vis.badge)}>
                        {proposal.status}
                      </span>
                      {viewCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <Eye className="h-2.5 w-2.5" />
                          {viewCount} view{viewCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <span className="text-xs tabular-nums text-slate-400 shrink-0">
                    {new Date(dateIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>

                  {/* Actions menu */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => router.push(`/${locale}/projects/${project.id}/proposals/${proposal.id}`)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const href = `/${locale}/proposals/${proposal.public_link}`
                              if (typeof window !== "undefined") {
                                window.open(href, "_blank", "noopener,noreferrer")
                              }
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(proposal.id)}
                            className="text-rose-600 focus:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
