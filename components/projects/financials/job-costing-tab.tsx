'use client'

import { useState, useEffect } from 'react'
import { Project, ProjectCostItem, ScopeQuoteLineItem } from '@/lib/types'
import { api } from '@/lib/api'
import { QuoteItemPicker } from './quote-item-picker'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MoneyInput } from './money-input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Plus, Loader2, FileDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent } from '@/components/ui/card'
import { parseMoney } from './money-input'

interface JobCostsSectionProps {
  project: Project
  onRefreshTotal: () => void
}

// Cost bucket a line belongs to. Direct = pulled from a quote (has source_job_item_id),
// Indirect = entered by hand on the P&L. Used only to seed the phase field.
const DIRECT_PHASE = 'DIRECT'
const INDIRECT_PHASE = 'INDIRECT'

/** Blank → null (a cleared Qty/Rate cell), otherwise the parsed number. */
const parseNumOrNull = (raw: string): number | null => {
  if (raw.trim() === '') return null
  return parseMoney(raw)
}

/**
 * Job costs — P&L-sheet style line items (Line Item / Qty / Unit / Rate /
 * Amount / Notes). Amount follows the sheet's formula: qty × rate when a rate
 * is set; typed directly when rate is blank (the sheet's "-" rows). Lines are
 * grouped into DIRECT job cost (from quotes or added by hand) and INDIRECT cost.
 */
export function JobCostsSection({ project, onRefreshTotal }: JobCostsSectionProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<ProjectCostItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await api.getProjectCostItems(project.id)
      setItems(data)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [project.id])

  // Bucket by phase so manually-added direct lines (no source quote) still land
  // in the Direct box. Legacy lines with ad-hoc phases fall through to Indirect.
  const directItems = items.filter(i => i.phase === DIRECT_PHASE)
  const indirectItems = items.filter(i => i.phase !== DIRECT_PHASE)

  const handleUpdateItem = async (itemId: number, updates: any) => {
    try {
      const updated = await api.updateProjectCostItem(project.id, itemId, updates)
      setItems(prev => prev.map(i => i.id === itemId ? (updated as ProjectCostItem) : i))
      // Qty/rate edits recompute the amount server-side — refresh on any of them.
      if (updates.gc_cost !== undefined || updates.quantity !== undefined || updates.rate !== undefined) {
        onRefreshTotal()
      }
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' })
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    try {
      setDeletingItemId(itemId)
      await api.deleteProjectCostItem(project.id, itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      onRefreshTotal()
      setDeleteConfirmId(null)
      toast({ title: 'Cost line deleted' })
    } catch (err: any) {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeletingItemId(null)
    }
  }

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createBucket, setCreateBucket] = useState<typeof DIRECT_PHASE | typeof INDIRECT_PHASE>(INDIRECT_PHASE)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newItemRate, setNewItemRate] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [newItemNotes, setNewItemNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null)
  const [quotePickerOpen, setQuotePickerOpen] = useState(false)

  // Rate entered in the dialog → Amount is the formula qty × rate (like the sheet).
  const newRateSet = newItemRate.trim() !== ''
  const computedNewAmount = newRateSet ? parseMoney(newItemQty) * parseMoney(newItemRate) : null

  const pulledItemIds = new Set(
    items.map((i) => i.source_job_item_id).filter((x): x is number => x != null)
  )

  // Seed DIRECT cost lines from selected quote line items (cost → gc_cost).
  // Qty/unit carry over from the quote; rate stays blank so the amount is the
  // quote's cost basis exactly (no rounding drift from a derived per-unit rate).
  const handleAddFromQuote = async (lineItems: ScopeQuoteLineItem[]) => {
    const created: ProjectCostItem[] = []
    try {
      for (const li of lineItems) {
        const newItem = await api.createProjectCostItem(project.id, {
          phase: DIRECT_PHASE,
          line_item: li.description,
          quantity: li.quantity || null,   // 0/absent → blank, not "0"
          unit: li.unit_of_measure || null,
          gc_cost: li.cost,
          client_price: li.total,
          source_job_item_id: li.id,
        })
        created.push(newItem as ProjectCostItem)
      }
      toast({ title: `Added ${created.length} direct cost line${created.length === 1 ? '' : 's'}` })
    } catch (err: any) {
      toast({ title: 'Error adding from quote', description: err.message, variant: 'destructive' })
      throw err
    } finally {
      if (created.length) {
        setItems((prev) => [...prev, ...created])
        onRefreshTotal()
      }
    }
  }

  const openCreateDialog = (bucket: typeof DIRECT_PHASE | typeof INDIRECT_PHASE) => {
    setCreateBucket(bucket)
    setNewItemName('')
    setNewItemQty('')
    setNewItemUnit('')
    setNewItemRate('')
    setNewItemAmount('')
    setNewItemNotes('')
    setCreateDialogOpen(true)
  }

  // Manual add → a cost line (never linked to a quote) in the chosen bucket.
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    const amount = newRateSet ? (computedNewAmount ?? 0) : parseMoney(newItemAmount)
    try {
      setIsSubmitting(true)
      const newItem = await api.createProjectCostItem(project.id, {
        phase: createBucket,
        line_item: newItemName.trim(),
        quantity: parseNumOrNull(newItemQty),
        unit: newItemUnit.trim() || null,
        rate: parseNumOrNull(newItemRate),
        notes: newItemNotes.trim() || null,
        gc_cost: amount,
        client_price: 0,
      })
      setItems(prev => [...prev, newItem as ProjectCostItem])
      setCreateDialogOpen(false)
      if (amount > 0) onRefreshTotal()
    } catch (err: any) {
      toast({ title: 'Error creating cost line', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const cellInputClass = 'border-border/40 hover:border-border bg-transparent h-7 px-1.5 text-sm shadow-none focus-visible:ring-1 w-full'

  const renderRows = (rows: ProjectCostItem[], emptyText: string) => (
    <div className="rounded-md border overflow-hidden">
      <Table className="table-fixed w-full">
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="w-[26%] text-xs uppercase tracking-wider">Line Item</TableHead>
            <TableHead className="w-[8%] text-right text-xs uppercase tracking-wider">Qty</TableHead>
            <TableHead className="w-[9%] text-xs uppercase tracking-wider">Unit</TableHead>
            <TableHead className="w-[12%] text-right text-xs uppercase tracking-wider">Rate</TableHead>
            <TableHead className="w-[13%] text-right text-xs uppercase tracking-wider">Amount</TableHead>
            <TableHead className="w-[28%] text-xs uppercase tracking-wider">Notes</TableHead>
            <TableHead className="w-[4%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(item => (
            <TableRow key={item.id} className="group hover:bg-muted border-b">
              <TableCell className="font-medium text-foreground align-top pt-2 min-w-0 text-sm">
                <Textarea
                  className="border-border/40 hover:border-border bg-transparent min-h-[28px] h-auto p-1 text-sm shadow-none focus-visible:ring-1 w-full resize-none overflow-hidden leading-snug whitespace-pre-wrap [overflow-wrap:anywhere]"
                  defaultValue={item.line_item}
                  rows={1}
                  ref={(el) => {
                    if (!el) return
                    el.style.height = 'auto'
                    el.style.height = `${el.scrollHeight}px`
                  }}
                  onInput={(e) => {
                    e.currentTarget.style.height = 'auto'
                    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
                  }}
                  onBlur={e => { if (e.target.value !== item.line_item) handleUpdateItem(item.id, { line_item: e.target.value }) }}
                />
              </TableCell>

              {/* QTY — blank allowed */}
              <TableCell className="text-right align-top">
                <Input
                  type="text"
                  inputMode="decimal"
                  className={`${cellInputClass} text-right`}
                  defaultValue={item.quantity != null ? String(Number(item.quantity)) : ''}
                  placeholder="-"
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  onBlur={e => {
                    const parsed = parseNumOrNull(e.target.value)
                    if (parsed !== (item.quantity != null ? Number(item.quantity) : null)) {
                      handleUpdateItem(item.id, { quantity: parsed })
                    }
                  }}
                />
              </TableCell>

              {/* UNIT */}
              <TableCell className="align-top">
                <Input
                  type="text"
                  className={cellInputClass}
                  defaultValue={item.unit ?? ''}
                  placeholder="-"
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  onBlur={e => {
                    const val = e.target.value.trim() || null
                    if (val !== (item.unit ?? null)) handleUpdateItem(item.id, { unit: val })
                  }}
                />
              </TableCell>

              {/* RATE — blank = "-" (amount entered directly, like the sheet) */}
              <TableCell className="text-right align-top">
                <Input
                  type="text"
                  inputMode="decimal"
                  className={`${cellInputClass} text-right`}
                  defaultValue={item.rate != null ? String(Number(item.rate)) : ''}
                  placeholder="-"
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  onBlur={e => {
                    const parsed = parseNumOrNull(e.target.value)
                    if (parsed !== (item.rate != null ? Number(item.rate) : null)) {
                      handleUpdateItem(item.id, { rate: parsed })
                    }
                  }}
                />
              </TableCell>

              {/* AMOUNT — formula (read-only) when rate is set; editable otherwise */}
              <TableCell className="text-right align-top text-sm">
                {item.rate != null ? (
                  <div
                    className="h-7 px-1.5 flex items-center justify-end tabular-nums font-medium text-foreground"
                    title={`${Number(item.quantity ?? 0)} × ${formatCurrency(Number(item.rate))}`}
                  >
                    {formatCurrency(Number(item.gc_cost))}
                  </div>
                ) : (
                  <MoneyInput
                    key={`amt-${item.id}-${item.gc_cost}`}
                    value={Number(item.gc_cost)}
                    onCommit={(n) => handleUpdateItem(item.id, { gc_cost: n })}
                    className="w-full h-7 px-1.5 text-sm text-right bg-transparent border-border/40 hover:border-border shadow-none focus-visible:ring-1"
                  />
                )}
              </TableCell>

              {/* NOTES */}
              <TableCell className="align-top pt-2 min-w-0 text-sm">
                <Textarea
                  className="border-border/40 hover:border-border bg-transparent min-h-[28px] h-auto p-1 text-sm shadow-none focus-visible:ring-1 w-full resize-none overflow-hidden leading-snug whitespace-pre-wrap [overflow-wrap:anywhere] text-muted-foreground italic"
                  defaultValue={item.notes ?? ''}
                  rows={1}
                  ref={(el) => {
                    if (!el) return
                    el.style.height = 'auto'
                    el.style.height = `${el.scrollHeight}px`
                  }}
                  onInput={(e) => {
                    e.currentTarget.style.height = 'auto'
                    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'
                  }}
                  onBlur={e => {
                    const val = e.target.value.trim() || null
                    if (val !== (item.notes ?? null)) handleUpdateItem(item.id, { notes: val })
                  }}
                />
              </TableCell>

              <TableCell className="px-1">
                <Popover
                  open={deleteConfirmId === item.id}
                  onOpenChange={(open) => setDeleteConfirmId(open ? item.id : null)}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-52 p-3">
                    <p className="mb-2 text-xs text-foreground">Delete this cost line?</p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setDeleteConfirmId(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs bg-destructive hover:bg-destructive/90 text-white"
                        disabled={deletingItemId === item.id}
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        Confirm
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-6 italic">{emptyText}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto" /></div>

  const directTotal = directItems.reduce((acc, i) => acc + Number(i.gc_cost), 0)
  const indirectTotal = indirectItems.reduce((acc, i) => acc + Number(i.gc_cost), 0)

  const SectionCard = ({ title, subtitle, total, children }: { title: string; subtitle: string; total: number; children: React.ReactNode }) => (
    <Card className="border shadow-sm overflow-hidden">
      <div className="flex items-end justify-between gap-3 border-b bg-muted/30 px-5 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="text-sm font-bold text-foreground tabular-nums shrink-0">{formatCurrency(total)}</span>
      </div>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* DIRECT JOB COST — imported from quotes */}
      <SectionCard title="Direct Job Cost" subtitle="Cost lines imported from your quotes." total={directTotal}>
        {renderRows(directItems, 'No direct cost lines yet — add one or pull them from a quote.')}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => openCreateDialog(DIRECT_PHASE)} className="text-primary border-primary/30 hover:bg-primary/10 font-medium">
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuotePickerOpen(true)} className="text-muted-foreground border-border hover:bg-muted font-medium">
            <FileDown className="w-4 h-4 mr-1" /> Import from quote
          </Button>
        </div>
      </SectionCard>

      {/* INDIRECT COST — entered directly */}
      <SectionCard title="Indirect Cost" subtitle="Cost lines you enter directly (not from a quote)." total={indirectTotal}>
        {renderRows(indirectItems, 'No indirect cost lines yet.')}
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => openCreateDialog(INDIRECT_PHASE)} className="text-primary border-primary/30 hover:bg-primary/10 font-medium">
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      </SectionCard>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add {createBucket === DIRECT_PHASE ? 'direct' : 'indirect'} cost line</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Line item</Label>
              <Input
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder="e.g. Haul-off & disposal"
                autoFocus
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Qty</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={newItemQty}
                  onChange={e => setNewItemQty(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="-"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={newItemUnit}
                  onChange={e => setNewItemUnit(e.target.value)}
                  placeholder="e.g. days"
                />
              </div>
              <div className="space-y-2">
                <Label>Rate</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={newItemRate}
                  onChange={e => setNewItemRate(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="-"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount {newRateSet && <span className="text-xs text-muted-foreground font-normal">(qty × rate)</span>}</Label>
              {newRateSet ? (
                <div className="h-9 flex items-center rounded-md border bg-muted/40 px-3 text-sm tabular-nums font-medium">
                  {formatCurrency(computedNewAmount ?? 0)}
                </div>
              ) : (
                <Input
                  type="text"
                  inputMode="decimal"
                  value={newItemAmount}
                  onChange={e => setNewItemAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={newItemNotes}
                onChange={e => setNewItemNotes(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {quotePickerOpen && (
        <QuoteItemPicker
          projectId={project.id}
          open={quotePickerOpen}
          onOpenChange={(o) => { if (!o) setQuotePickerOpen(false) }}
          pulledItemIds={pulledItemIds}
          destinationLabel="Direct Job Cost"
          onConfirm={(lineItems) => handleAddFromQuote(lineItems)}
        />
      )}
    </div>
  )
}
