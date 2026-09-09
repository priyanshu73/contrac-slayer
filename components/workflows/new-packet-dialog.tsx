"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Search, Sparkles } from "lucide-react"

import { api } from "@/lib/api"
import type { Lead } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

// The estimator needs a real description. Below this the run drafts clarifying
// questions for the customer instead of line items. Same gate as the backend.
const MIN_DESCRIPTION_CHARS = 30

export function NewPacketDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const locale = useLocale()
  const { toast } = useToast()
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [startingId, setStartingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLeads(null)
    setError(null)
    try {
      const data = (await api.getMyLeads(undefined, 0, 100)) as Lead[]
      setLeads(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load leads")
      setLeads([])
    }
  }, [])

  useEffect(() => {
    if (open) {
      load()
      setQuery("")
    }
  }, [open, load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = leads ?? []
    if (!q) return rows
    return rows.filter((l) =>
      [l.name, l.email, l.phone, l.project_type, l.description]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [leads, query])

  async function start(lead: Lead) {
    setStartingId(lead.id)
    try {
      const res = await api.startWorkflowRun({
        kind: "lead_to_quote",
        trigger_ref_kind: "lead",
        trigger_ref_id: String(lead.id),
        context: { frontend_origin: window.location.origin, locale },
      })
      toast({ title: res.message })
      onOpenChange(false)
      router.push(`/${locale}/workflows/${res.run.uuid}`)
    } catch (e) {
      toast({
        title: "Couldn't start the packet",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
      setStartingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Draft a quote packet</DialogTitle>
          <DialogDescription>
            Pick a lead. The assistant drafts the client, estimate, quote and email, then waits for
            you to review it. Nothing is created or sent until you approve.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-9"
            placeholder="Search leads by name, email, phone or project"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {leads === null ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {leads.length === 0 ? "No leads yet." : "No lead matches that search."}
            </p>
          ) : (
            filtered.map((lead) => {
              const description = (lead.description ?? "").trim()
              const thin = description.length < MIN_DESCRIPTION_CHARS
              return (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{lead.name}</span>
                      {lead.project_type && (
                        <span className="text-xs text-muted-foreground">{lead.project_type}</span>
                      )}
                      {lead.converted_to_job_id && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          already quoted
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {description || "No description"}
                    </p>
                    {thin && (
                      <p className="mt-0.5 text-xs text-amber-700">
                        Too little detail to price. This drafts questions for the customer instead.
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={startingId !== null}
                    onClick={() => start(lead)}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {startingId === lead.id ? "Starting…" : "Draft"}
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
