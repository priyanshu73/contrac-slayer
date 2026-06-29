"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import type { Job, Proposal } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { QuoteSidebarSection } from "@/components/quote-sidebar-section"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  ExternalLink,
  FileText,
  Loader2,
  MoreHorizontal,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react"

type ProposalRow =
  | {
      kind: "embedded"
      key: string
      title: string
      status?: string
      updatedAt?: string | null
      viewHref?: string
      editHref: string
    }
  | {
      kind: "project"
      key: string
      title: string
      status?: string
      updatedAt?: string | null
      projectId: number
      proposalId: number
      projectTitle?: string | null
      viewHref?: string
      editHref: string
    }

interface QuoteProposalsSectionProps {
  job: Job
  locale: string
  onChanged?: () => void
}

function formatDate(iso?: string | null): string | undefined {
  if (!iso) return undefined
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return undefined
  }
}


export function QuoteProposalsSection({ job, locale, onChanged }: QuoteProposalsSectionProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ProposalRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [jobProposals, setJobProposals] = useState<Proposal[]>([])

  useEffect(() => {
    api.getJobProposals(job.id)
      .then((data) => setJobProposals(Array.isArray(data) ? data as Proposal[] : []))
      .catch(() => setJobProposals([]))
  }, [job.id])

  const rows = useMemo<ProposalRow[]>(() => {
    const list: ProposalRow[] = []

    // Job-linked proposals (from the proposals table via /jobs/{id}/proposals)
    for (const p of jobProposals) {
      list.push({
        kind: "embedded",
        key: `quote-proposal-${p.id}`,
        title: (p as any).title || job.title || `Quote #${job.id} Proposal`,
        status: p.status,
        updatedAt: (p as any).updated_at ?? null,
        viewHref: `/${locale}/quotes/${job.id}/proposal/preview`,
        editHref: `/${locale}/quotes/${job.id}/proposal`,
      })
    }

    // Project proposals linked to the client
    for (const p of job.portal_proposals ?? []) {
      if (p.project_id == null) continue
      list.push({
        kind: "project",
        key: `project-${p.project_id}-${p.id}`,
        title: p.title || `Proposal #${p.id}`,
        status: p.status,
        updatedAt: p.updated_at,
        projectId: p.project_id,
        proposalId: p.id,
        projectTitle: p.project_title,
        viewHref: `/${locale}/projects/${p.project_id}/proposals/${p.id}/preview`,
        editHref: `/${locale}/projects/${p.project_id}/proposals/${p.id}`,
      })
    }

    return list
  }, [job.id, job.portal_proposals, job.title, jobProposals, locale])

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      if (pendingDelete.kind === "embedded") {
        const proposal = jobProposals.find((p) => `quote-proposal-${p.id}` === pendingDelete.key)
        if (proposal) await api.deleteJobProposal(job.id, proposal.id)
        setJobProposals((prev) => prev.filter((p) => `quote-proposal-${p.id}` !== pendingDelete.key))
        toast({ title: "Proposal deleted" })
      } else {
        await api.deleteProposal(pendingDelete.projectId, pendingDelete.proposalId)
        toast({ title: "Proposal deleted" })
      }
      setPendingDelete(null)
      onChanged?.()
    } catch (err: any) {
      toast({
        title: "Could not delete proposal",
        description: err?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const createHref = `/${locale}/quotes/${job.id}/proposal`

  return (
    <>
      <QuoteSidebarSection
        icon={<FileText className="h-3.5 w-3.5 shrink-0 text-sky-600" />}
        title="Proposals"
        count={rows.length}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        action={
          <Button asChild size="sm" className="h-7 gap-1 rounded-md bg-sky-600 px-2 text-[11px] font-semibold text-white hover:bg-sky-700">
            <Link href={createHref}>
              <Plus className="h-3 w-3" />
              {jobProposals.length > 0 ? "Edit" : "New"}
            </Link>
          </Button>
        }
      >
        {rows.length === 0 ? null : (
          <ul className="divide-y divide-sky-100/60">
            {rows.map((row) => {
              const updated = formatDate(row.updatedAt)
              return (
                <li key={row.key} className="px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={row.editHref}
                        className="block truncate text-[13px] font-semibold leading-tight text-slate-900 hover:text-sky-700"
                        title={row.title}
                      >
                        {row.title}
                      </Link>
                      {row.projectTitle && row.kind !== "embedded" ? (
                        <div className="mt-1">
                          <span className="truncate rounded-full bg-emerald-100 px-1.5 py-0 text-[9px] font-medium text-emerald-700" title={row.projectTitle}>
                            {row.projectTitle}
                          </span>
                        </div>
                      ) : null}
                      {updated ? (
                        <p className="mt-1 text-[10px] text-slate-400">Updated {updated}</p>
                      ) : null}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 shrink-0 text-slate-500 hover:bg-sky-100 hover:text-sky-700"
                          aria-label="Proposal actions"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => router.push(row.editHref)}>
                          <PencilLine className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        {row.viewHref ? (
                          <DropdownMenuItem onSelect={() => router.push(row.viewHref!)}>
                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                            Preview
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => {
                            e.preventDefault()
                            setPendingDelete(row)
                          }}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </QuoteSidebarSection>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen && !deleting) setPendingDelete(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete proposal?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.kind === "embedded"
                ? "This permanently removes the proposal saved on this quote."
                : "This permanently removes this proposal from the linked project. Public links to it will stop working."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete proposal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
