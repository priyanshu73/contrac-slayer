'use client'

// Reusable "Add from quote" picker. Lists the line items of every quote linked to
// the project (anchor + change orders) so you can pull scope into Job Costing or
// Materials instead of re-typing it. Items already pulled in are greyed out, and
// quotes that aren't part of the contract (draft/rejected/superseded) are disabled
// so you can't seed cost lines from scope the contract total itself excludes.

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { ProjectScopeBilling, ScopeQuoteLineItem } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Check } from 'lucide-react'

interface QuoteItemPickerProps {
  projectId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** source_job_item_ids already pulled into this destination — shown as "Added". */
  pulledItemIds: Set<number>
  /** e.g. "FRAMING phase" or "Job Materials" — shown in the title. */
  destinationLabel: string
  onConfirm: (items: ScopeQuoteLineItem[]) => Promise<void> | void
}

export function QuoteItemPicker({
  projectId,
  open,
  onOpenChange,
  pulledItemIds,
  destinationLabel,
  onConfirm,
}: QuoteItemPickerProps) {
  const [scope, setScope] = useState<ProjectScopeBilling | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await api.getProjectScopeBilling(projectId)
        if (active) setScope(res)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [open, projectId])

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Only contract quotes (anchor or approved) are pullable; a superseded/rejected
  // quote is shown but disabled, never selectable.
  const allItems: ScopeQuoteLineItem[] = (scope?.quotes || [])
    .filter((q) => q.counts_toward_contract)
    .flatMap((q) => q.line_items)
  const chosen = allItems.filter((li) => selected.has(li.id))

  // Everything that can actually be picked (not already pulled in).
  const selectableItems = allItems.filter((li) => !pulledItemIds.has(li.id))
  const allSelected = selectableItems.length > 0 && selectableItems.every((li) => selected.has(li.id))
  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(selectableItems.map((li) => li.id)))

  const confirm = async () => {
    if (!chosen.length) return
    setSubmitting(true)
    try {
      await onConfirm(chosen)
      onOpenChange(false)
    } catch {
      // onConfirm already surfaced the error (toast). Keep the dialog open so the
      // user can retry/cancel — and so any rows that DID save aren't hidden behind a
      // close (they're committed to the destination list and deduped on re-open).
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Add from quote → {destinationLabel}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          </div>
        ) : !scope || scope.quotes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No quotes linked to this project.</p>
        ) : (
          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-4">
            {selectableItems.length > 0 && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-8 px-3 text-xs font-semibold text-primary border-primary/40 bg-primary/5 hover:bg-primary/15 hover:border-primary"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  {allSelected ? 'Clear selection' : `Select all (${selectableItems.length})`}
                </Button>
              </div>
            )}
            {scope.quotes.map((q) => (
              <div key={q.job_id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-foreground">{q.title}</span>
                  {q.is_anchor && (
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px]">
                      Primary
                    </Badge>
                  )}
                  {q.is_change_order && (
                    <Badge variant="outline" className="border-chart-4/20 bg-chart-4/10 text-chart-4 text-[10px]">
                      Change order
                    </Badge>
                  )}
                  {!q.counts_toward_contract && (
                    <Badge variant="outline" className="border-border text-[10px] text-muted-foreground">
                      Not in contract · {q.status}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {q.line_items.length === 0 && (
                    <p className="text-xs text-muted-foreground px-1">No line items on this quote.</p>
                  )}
                  {q.line_items.map((li) => {
                    const already = pulledItemIds.has(li.id)
                    const isSel = selected.has(li.id)
                    // Block items already pulled, or whose quote isn't part of the contract.
                    const blocked = already || !q.counts_toward_contract
                    return (
                      <button
                        key={li.id}
                        type="button"
                        disabled={blocked}
                        onClick={() => toggle(li.id)}
                        className={`w-full flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                          blocked
                            ? 'opacity-50 cursor-not-allowed border-border bg-muted'
                            : isSel
                            ? 'border-primary/30 bg-primary/10'
                            : 'border-border hover:border-border'
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSel ? 'bg-primary border-primary text-white' : 'border-border'
                          }`}
                        >
                          {isSel && <Check className="h-3 w-3" />}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-sm text-foreground">{li.description}</span>
                        {already && <Badge variant="outline" className="text-[10px] text-muted-foreground">Added</Badge>}
                        <span className="shrink-0 text-right text-xs tabular-nums">
                          <span className="text-muted-foreground">cost {formatCurrency(li.cost)}</span>
                          {' · '}
                          <span className="font-medium text-foreground">{formatCurrency(li.total)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            disabled={!chosen.length || submitting}
            onClick={confirm}
          >
            {submitting ? 'Adding…' : `Add ${chosen.length || ''} item${chosen.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
