"use client"

import { useEffect, useState } from "react"
import type { Proposal, Project } from "@/lib/types"
import { api } from "@/lib/api"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2, FileText, Plus, Eye, Pencil, Trash2, Clock } from "lucide-react"
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

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
    setDeleteConfirmId(null)
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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Proposals</span>
          {proposals.length > 0 && (
            <span className="rounded-full bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
              {proposals.length}
            </span>
          )}
          <span className="text-xs text-slate-400 hidden sm:inline">
            — linked to this project
          </span>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm ring-1 ring-indigo-400/20 hover:from-indigo-400 hover:to-indigo-600 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Proposal
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-slate-400">No proposals yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {proposals.map((proposal) => {
            const vis = proposalStatusVisual(proposal.status)
            const displayTitle = proposal.title || `Proposal #${proposal.id}`
            const viewCount = proposal.customer_view_count ?? 0
            const dateIso = proposal.updated_at || proposal.created_at
            const dateLabel = proposal.updated_at ? "Updated" : "Created"

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
                  className="group flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {/* Status dot + icon */}
                  <div className="relative shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white", vis.dot)} />
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

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-3 -translate-y-[20%]">
                      {/* Created/Updated date */}
                      <div className="flex flex-col items-end text-slate-400 leading-none">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium">
                          <Clock className="h-3 w-3" />
                          {dateLabel}
                        </span>
                        <span className="text-xs tabular-nums mt-0.5">
                          {new Date(dateIso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const href = `/${locale}/proposals/${proposal.public_link}`
                          if (typeof window !== "undefined") {
                            window.open(href, "_blank", "noopener,noreferrer")
                          } else {
                            router.push(href)
                          }
                        }}
                        className="flex flex-col items-center justify-center text-center w-11 h-10 gap-0.5 text-[10px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
                        title="Preview"
                      >
                        <span className="leading-tight">Preview</span>
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/${locale}/projects/${project.id}/proposals/${proposal.id}`)
                        }}
                        className="flex flex-col items-center justify-center text-center w-11 h-10 gap-0.5 text-[10px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
                        title="Edit"
                      >
                        <span className="leading-tight">Edit</span>
                        <Pencil className="w-4 h-4" />
                      </button>

                      {deleting === proposal.id ? (
                        <span className="flex flex-col items-center justify-center text-center w-11 h-10 gap-0.5 text-[10px] font-medium text-slate-500">
                          <span className="leading-tight">Deleting…</span>
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </span>
                      ) : (
                        <Popover
                          open={deleteConfirmId === proposal.id}
                          onOpenChange={(open) => {
                            if (!open) setDeleteConfirmId(null)
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirmId(proposal.id)
                              }}
                              className="flex flex-col items-center justify-center text-center w-11 h-10 gap-0.5 text-[10px] font-medium text-slate-500 hover:text-rose-600 transition-colors"
                              title="Delete"
                            >
                              <span className="leading-tight">Delete</span>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            side="top"
                            align="end"
                            className="w-auto p-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <p className="text-xs text-slate-600 mb-2 font-medium">Delete this proposal?</p>
                            <div className="flex items-center gap-1.5 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null) }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2.5 text-xs"
                                onClick={(e) => { e.stopPropagation(); handleDelete(proposal.id) }}
                              >
                                Delete
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
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
