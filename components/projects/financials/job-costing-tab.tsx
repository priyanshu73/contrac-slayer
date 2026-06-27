'use client'

import { useState, useEffect } from 'react'
import { Project, ProjectCostItem, CostItemStatus, ScopeQuoteLineItem } from '@/lib/types'
import { api } from '@/lib/api'
import { QuoteItemPicker } from './quote-item-picker'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { MoneyInput } from './money-input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Loader2, FileDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface JobCostingTabProps {
  project: Project
  onRefreshTotal: () => void
}

const pct = (n: number) => `${Math.round(n)}%`

export function JobCostingTab({ project, onRefreshTotal }: JobCostingTabProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const companyName = user?.contractor_profile?.company_name || 'Contractor'
  const [items, setItems] = useState<ProjectCostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState<any[]>([])

  // Load Data
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

  // Build the trade-derived sub list (subs already assigned to a project trade).
  // Used as a defensive merge + as the fallback if the directory call fails.
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
      // Primary source: the contractor's full subcontractor directory. A cost
      // item's `subcontractor_id` is an FK to `subcontractors.id`, so the dropdown
      // must list the whole directory — not only subs already assigned to a trade
      // (the old behaviour, which left the dropdown at just "Unassigned" whenever
      // no trade had a sub assigned yet).
      const directory = await api.getSubcontractors(0, 500)
      const byId = tradeSubsMap()
      ;(directory || []).forEach((s: any) => {
        if (s?.id != null) {
          byId.set(s.id, { id: s.id, name: s.name || s.company_name || `Sub #${s.id}` })
        }
      })
      setSubs(Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)))
    } catch (e) {
      // Directory unavailable — fall back to subs referenced by project trades.
      setSubs(Array.from(tradeSubsMap().values()))
    }
  }

  useEffect(() => {
    loadData()
    loadSubs()
  }, [project.id])

  // Group items by phase
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.phase]) acc[item.phase] = []
    acc[item.phase].push(item)
    return acc
  }, {} as Record<string, ProjectCostItem[]>)

  // Handlers
  const handleUpdateItem = async (itemId: number, updates: any) => {
    try {
      const updated = await api.updateProjectCostItem(project.id, itemId, updates)
      setItems(prev => prev.map(i => i.id === itemId ? (updated as ProjectCostItem) : i))

      // If cost/markup changed, it might affect the total summary
      if (updates.gc_cost !== undefined || updates.client_price !== undefined || updates.paid !== undefined) {
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
      toast({ title: 'Item deleted' })
    } catch (err: any) {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeletingItemId(null)
    }
  }

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createDialogType, setCreateDialogType] = useState<'phase' | 'item'>('phase')
  const [createDialogPhase, setCreateDialogPhase] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null)
  const [quotePickerPhase, setQuotePickerPhase] = useState<string | null>(null)

  // Quote line items already pulled into this tab — so the picker can mark them.
  const pulledItemIds = new Set(
    items.map((i) => i.source_job_item_id).filter((x): x is number => x != null)
  )

  // Seed cost lines from selected quote line items (cost → gc_cost, price → client_price).
  const handleAddFromQuote = async (phase: string, lineItems: ScopeQuoteLineItem[]) => {
    // Create sequentially and commit whatever succeeded — even if a later item fails —
    // so already-persisted rows appear immediately (and are deduped on re-open).
    // Rethrow on failure so the picker stays open instead of closing on a partial save.
    const created: ProjectCostItem[] = []
    try {
      for (const li of lineItems) {
        const newItem = await api.createProjectCostItem(project.id, {
          phase,
          line_item: li.description,
          gc_cost: li.cost,
          client_price: li.total,
          source_job_item_id: li.id,
        })
        created.push(newItem as ProjectCostItem)
      }
      toast({ title: `Added ${created.length} item${created.length === 1 ? '' : 's'} from quote` })
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

  const openCreateDialog = (type: 'phase' | 'item', phaseContext?: string) => {
    setCreateDialogType(type)
    setCreateDialogPhase(phaseContext || '')
    setNewItemName('')
    setCreateDialogOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    try {
      setIsSubmitting(true)
      const phaseToUse = createDialogType === 'phase' ? newItemName.trim().toUpperCase() : createDialogPhase
      const lineItemToUse = createDialogType === 'phase' ? '' : newItemName.trim()

      const newItem = await api.createProjectCostItem(project.id, {
        phase: phaseToUse,
        line_item: lineItemToUse,
        gc_cost: 0,
        client_price: 0
      })
      setItems(prev => [...prev, newItem as ProjectCostItem])
      setCreateDialogOpen(false)
    } catch(err: any) {
      toast({ title: 'Error creating item', description: err.message, variant: 'destructive' })
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

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto" /></div>

  // Calculate Granular Totals
  const totalGcCost = items.reduce((acc, i) => acc + Number(i.gc_cost), 0)
  const totalClientPrice = items.reduce((acc, i) => acc + Number(i.client_price), 0)
  const totalPaid = items.reduce((acc, i) => acc + Number(i.paid), 0)
  const totalProfit = totalClientPrice - totalGcCost
  const margin = totalClientPrice > 0 ? (totalProfit / totalClientPrice) * 100 : 0
  const paidPct = totalGcCost > 0 ? Math.max(0, Math.min(100, (totalPaid / totalGcCost) * 100)) : 0
  const owedRemaining = Math.max(0, totalGcCost - totalPaid)

  const phasesToRender = Object.keys(groupedItems)

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Job Costing · Labour &amp; Subs</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">What you pay subs &amp; labour vs. what the client is billed.</p>
        </div>
        <Button size="sm" onClick={() => openCreateDialog('phase')} className="shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Add Phase
        </Button>
      </div>

      {/* Summary headline */}
      {items.length > 0 && (
        <Card className="border shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border bg-card px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">{companyName} Cost</p>
                <p className="text-lg font-bold tabular-nums leading-tight text-foreground">{formatCurrency(totalGcCost)}</p>
              </div>
              <div className="rounded-lg border bg-card px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Client Price</p>
                <p className="text-lg font-bold tabular-nums leading-tight text-primary">{formatCurrency(totalClientPrice)}</p>
              </div>
              <div className="rounded-lg border bg-card px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Profit · {pct(margin)} margin</p>
                <p className={`text-lg font-bold tabular-nums leading-tight ${totalProfit >= 0 ? 'text-status-active' : 'text-destructive'}`}>{formatCurrency(totalProfit)}</p>
              </div>
              <div className="rounded-lg border bg-card px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Paid to subs</p>
                <p className="text-lg font-bold tabular-nums leading-tight text-foreground">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
            {/* How much of what you owe subs has been paid out */}
            <div className="space-y-1.5">
              <div className="flex w-full h-2 overflow-hidden rounded-full bg-muted">
                <div className="bg-status-active transition-all duration-500" style={{ width: `${paidPct}%` }} />
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 text-[11px] font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-status-active" /> {pct(paidPct)} of cost paid to subs
                </span>
                {owedRemaining > 0.01 && <span className="tabular-nums">{formatCurrency(owedRemaining)} still owed</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {phasesToRender.length === 0 && (
        <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-muted">
          <p className="text-muted-foreground mb-4 font-medium">No phases or line items have been added to this project yet.</p>
          <Button onClick={() => openCreateDialog('phase')} className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" /> Create Your First Phase
          </Button>
        </div>
      )}

      <Accordion type="multiple" defaultValue={phasesToRender} className="w-full">
        {phasesToRender.map(phase => {
          const phaseItems = groupedItems[phase] || []
          const phaseTotal = phaseItems.reduce((acc, i) => acc + Number(i.client_price), 0)
          const phaseCost = phaseItems.reduce((acc, i) => acc + Number(i.gc_cost), 0)

          return (
            <AccordionItem key={phase} value={phase} className="border rounded-lg mb-3 px-4 last:mb-0">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex justify-between items-center w-full pr-4 gap-3">
                  <span className="font-bold text-foreground tracking-wide uppercase text-sm truncate">
                    {phase} <span className="text-muted-foreground font-normal ml-1">· {phaseItems.length} item{phaseItems.length === 1 ? '' : 's'}</span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums">cost {formatCurrency(phaseCost)}</span>
                    <span className="font-bold text-primary tabular-nums">{formatCurrency(phaseTotal)}</span>
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <div className="rounded-md border overflow-hidden">
                  <Table className="table-fixed w-full">
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-[28%] text-xs uppercase tracking-wider">Line Item</TableHead>
                        <TableHead className="w-[14%] text-right text-xs uppercase tracking-wider">{companyName} Cost</TableHead>
                        <TableHead className="w-[14%] text-right text-xs uppercase tracking-wider font-bold text-foreground">Client Price</TableHead>
                        <TableHead className="w-[14%] text-right text-xs uppercase tracking-wider">Paid</TableHead>
                        <TableHead className="w-[13%] text-center text-xs uppercase tracking-wider">Status</TableHead>
                        <TableHead className="w-[14%] text-right text-xs uppercase tracking-wider">Subcontractor</TableHead>
                        <TableHead className="w-[3%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phaseItems.map(item => (
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
                                e.currentTarget.style.height = 'auto';
                                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                              }}
                              onBlur={e => { if(e.target.value !== item.line_item) handleUpdateItem(item.id, { line_item: e.target.value }) }}
                            />
                          </TableCell>

                          <TableCell className="text-right align-top text-sm">
                            <MoneyInput
                              value={item.gc_cost}
                              onCommit={(n) => handleUpdateItem(item.id, { gc_cost: n })}
                              className="w-full h-7 px-1.5 text-sm text-right bg-transparent border-border/40 hover:border-border shadow-none focus-visible:ring-1"
                            />
                            <div className="mt-1 text-left text-[10px] font-medium text-status-active">
                              Profit: {formatCurrency(Number(item.client_price) - Number(item.gc_cost))}
                            </div>
                          </TableCell>

                          <TableCell className="text-right text-sm">
                            <MoneyInput
                              value={item.client_price}
                              onCommit={(n) => handleUpdateItem(item.id, { client_price: n })}
                              className="w-full h-7 px-1.5 text-sm text-right font-bold text-foreground bg-transparent border-border/40 hover:border-border shadow-none focus-visible:ring-1"
                            />
                          </TableCell>

                          <TableCell className="text-right align-top text-sm">
                            <MoneyInput
                              value={item.paid}
                              onCommit={(n) => handleUpdateItem(item.id, { paid: n })}
                              className={`w-full h-7 px-1.5 text-sm text-right font-semibold bg-transparent border-border/40 hover:border-border shadow-none focus-visible:ring-1 ${item.paid >= item.gc_cost && item.gc_cost > 0 ? 'text-status-active bg-status-active/10' : 'text-foreground'}`}
                            />
                            <div className="mt-1 text-left text-[10px] font-medium text-destructive">
                              Unpaid: ({formatCurrency(Math.max(Number(item.client_price) - Number(item.paid), 0))})
                            </div>
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
                                <SelectItem value="GC_APPROVED">{companyName} Approved</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="text-right">
                            <Select
                              value={item.subcontractor_id?.toString() || 'unassigned'}
                              onValueChange={(val) => handleUpdateItem(item.id, { subcontractor_id: val === 'unassigned' ? null : Number(val)})}
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
                                <p className="mb-2 text-xs text-foreground">Delete this line item?</p>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setDeleteConfirmId(null)}
                                  >
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
                      {phaseItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-6 italic">No items in this phase.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openCreateDialog('item', phase)} className="text-primary border-primary/30 hover:bg-primary/10 font-medium">
                    <Plus className="w-4 h-4 mr-1" /> Add Line Item to {phase}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuotePickerPhase(phase)} className="text-muted-foreground border-border hover:bg-muted font-medium">
                    <FileDown className="w-4 h-4 mr-1" /> From quote
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {createDialogType === 'phase' ? 'Create New Phase' : `Add Line Item to ${createDialogPhase}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{createDialogType === 'phase' ? 'Phase Name' : 'Line Item Title'}</Label>
              <Input
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder={createDialogType === 'phase' ? 'e.g. FRAMING' : 'e.g. Rough Lumber / Labor'}
                autoFocus
                required
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

      {quotePickerPhase && (
        <QuoteItemPicker
          projectId={project.id}
          open={!!quotePickerPhase}
          onOpenChange={(o) => { if (!o) setQuotePickerPhase(null) }}
          pulledItemIds={pulledItemIds}
          destinationLabel={`${quotePickerPhase} phase`}
          onConfirm={(lineItems) => handleAddFromQuote(quotePickerPhase, lineItems)}
        />
      )}
    </div>
  )
}
