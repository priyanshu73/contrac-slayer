'use client'

import { useState, useEffect } from 'react'
import { Project, ProjectCostItem, CostItemStatus, ScopeQuoteLineItem } from '@/lib/types'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

/**
 * Job costs — labour & subs, cost-only (no client price / no per-sub paid; those
 * live on the billing side and the Payments sidebar). Lines are grouped into
 * DIRECT job cost (imported from quotes) and INDIRECT cost (entered directly).
 */
export function JobCostsSection({ project, onRefreshTotal }: JobCostsSectionProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<ProjectCostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState<{ id: number; name: string }[]>([])

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

  // Trade-derived subs — defensive merge + fallback if the directory call fails.
  const tradeSubsMap = () => {
    const m = new Map<number, { id: number; name: string }>()
    project.trades?.forEach(trade => {
      if (trade.subcontractor_id && !m.has(trade.subcontractor_id)) {
        m.set(trade.subcontractor_id, {
          id: trade.subcontractor_id,
          name: trade.subcontractor_name || trade.trade_type,
        })
      }
    })
    return m
  }

  const loadSubs = async () => {
    try {
      const directory = await api.getSubcontractors(0, 500)
      const byId = tradeSubsMap()
      ;(directory || []).forEach((s: any) => {
        if (s?.id != null) {
          byId.set(s.id, { id: s.id, name: s.name || s.company_name || `Sub #${s.id}` })
        }
      })
      setSubs(Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)))
    } catch (e) {
      setSubs(Array.from(tradeSubsMap().values()))
    }
  }

  useEffect(() => {
    loadData()
    loadSubs()
  }, [project.id])

  const directItems = items.filter(i => i.source_job_item_id != null)
  const indirectItems = items.filter(i => i.source_job_item_id == null)

  const handleUpdateItem = async (itemId: number, updates: any) => {
    try {
      const updated = await api.updateProjectCostItem(project.id, itemId, updates)
      setItems(prev => prev.map(i => i.id === itemId ? (updated as ProjectCostItem) : i))
      if (updates.gc_cost !== undefined) onRefreshTotal()
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
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null)
  const [quotePickerOpen, setQuotePickerOpen] = useState(false)

  const pulledItemIds = new Set(
    items.map((i) => i.source_job_item_id).filter((x): x is number => x != null)
  )

  // Seed DIRECT cost lines from selected quote line items (cost → gc_cost).
  const handleAddFromQuote = async (lineItems: ScopeQuoteLineItem[]) => {
    const created: ProjectCostItem[] = []
    try {
      for (const li of lineItems) {
        const newItem = await api.createProjectCostItem(project.id, {
          phase: DIRECT_PHASE,
          line_item: li.description,
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

  // Manual add → an INDIRECT cost line (never linked to a quote).
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    try {
      setIsSubmitting(true)
      const newItem = await api.createProjectCostItem(project.id, {
        phase: INDIRECT_PHASE,
        line_item: newItemName.trim(),
        gc_cost: parseMoney(newItemAmount),
        client_price: 0,
      })
      setItems(prev => [...prev, newItem as ProjectCostItem])
      setNewItemName('')
      setNewItemAmount('')
      setCreateDialogOpen(false)
      if (parseMoney(newItemAmount) > 0) onRefreshTotal()
    } catch (err: any) {
      toast({ title: 'Error creating cost line', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: CostItemStatus) => {
    switch (status) {
      case 'COMPLETED': return 'bg-foreground/10 text-foreground'
      case 'GC_APPROVED': return 'bg-status-active/15 text-status-active'
      case 'IN_PROGRESS': return 'bg-primary/15 text-primary'
      case 'SCHEDULED': return 'bg-status-pending/15 text-status-pending'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const renderRows = (rows: ProjectCostItem[], emptyText: string) => (
    <div className="rounded-md border overflow-hidden">
      <Table className="table-fixed w-full">
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="w-[42%] text-xs uppercase tracking-wider">Line Item</TableHead>
            <TableHead className="w-[18%] text-right text-xs uppercase tracking-wider">Cost</TableHead>
            <TableHead className="w-[16%] text-center text-xs uppercase tracking-wider">Status</TableHead>
            <TableHead className="w-[20%] text-right text-xs uppercase tracking-wider">Subcontractor</TableHead>
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

              <TableCell className="text-right align-top text-sm">
                <MoneyInput
                  value={item.gc_cost}
                  onCommit={(n) => handleUpdateItem(item.id, { gc_cost: n })}
                  className="w-full h-7 px-1.5 text-sm text-right bg-transparent border-border/40 hover:border-border shadow-none focus-visible:ring-1"
                />
              </TableCell>

              <TableCell className="px-1.5">
                <Select
                  value={item.status}
                  onValueChange={(val) => handleUpdateItem(item.id, { status: val })}
                >
                  <SelectTrigger className={`h-7 min-h-0 text-[10px] w-full border-border/40 hover:border-border shadow-none bg-transparent font-semibold justify-center px-1 [&_svg]:hidden ${getStatusColor(item.status)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="GC_APPROVED">Approved</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              <TableCell className="text-right">
                <Select
                  value={item.subcontractor_id?.toString() || 'unassigned'}
                  onValueChange={(val) => handleUpdateItem(item.id, { subcontractor_id: val === 'unassigned' ? null : Number(val) })}
                >
                  <SelectTrigger className="h-7 text-[10px] w-full px-2 border-dashed bg-transparent shadow-none hover:border-border">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {subs.map(sub => (
                      <SelectItem key={sub.id} value={sub.id.toString()}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <TableCell colSpan={5} className="text-center text-muted-foreground py-6 italic">{emptyText}</TableCell>
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
        {renderRows(directItems, 'No direct cost lines yet — pull them from a quote.')}
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => setQuotePickerOpen(true)} className="text-muted-foreground border-border hover:bg-muted font-medium">
            <FileDown className="w-4 h-4 mr-1" /> Import from quote
          </Button>
        </div>
      </SectionCard>

      {/* INDIRECT COST — entered directly */}
      <SectionCard title="Indirect Cost" subtitle="Cost lines you enter directly (not from a quote)." total={indirectTotal}>
        {renderRows(indirectItems, 'No indirect cost lines yet.')}
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)} className="text-primary border-primary/30 hover:bg-primary/10 font-medium">
            <Plus className="w-4 h-4 mr-1" /> Add cost line
          </Button>
        </div>
      </SectionCard>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add indirect cost line</DialogTitle>
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
            <div className="space-y-2">
              <Label>Amount (cost)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={newItemAmount}
                onChange={e => setNewItemAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
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
