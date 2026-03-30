'use client'

import { useState, useEffect } from 'react'
import { Project, ProjectCostItem, CostItemStatus } from '@/lib/types'
import { api } from '@/lib/api'
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
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Loader2, Save } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface JobCostingTabProps {
  project: Project
  onRefreshTotal: () => void
}

export function JobCostingTab({ project, onRefreshTotal }: JobCostingTabProps) {
  const { toast } = useToast()
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

  const loadSubs = async () => {
    try {
      if (project.trades && project.trades.length > 0) {
        const uniqueSubs = new Map()
        project.trades.forEach(trade => {
          if (trade.subcontractor_id) {
            if (!uniqueSubs.has(trade.subcontractor_id)) {
              uniqueSubs.set(trade.subcontractor_id, {
                id: trade.subcontractor_id,
                name: trade.subcontractor_name || trade.trade_type
              })
            }
          }
        })
        setSubs(Array.from(uniqueSubs.values()))
      }
    } catch(e) {}
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
      case 'COMPLETED': return 'bg-slate-800 text-white'
      case 'GC_APPROVED': return 'bg-emerald-500 text-white'
      case 'IN_PROGRESS': return 'bg-orange-500 text-white'
      case 'SCHEDULED': return 'bg-yellow-500 text-white'
      default: return 'bg-slate-200 text-slate-800'
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto" /></div>

  // Calculate Granular Totals
  const totalGcCost = items.reduce((acc, i) => acc + Number(i.gc_cost), 0)
  const totalClientPrice = items.reduce((acc, i) => acc + Number(i.client_price), 0)
  const totalPaid = items.reduce((acc, i) => acc + Number(i.paid), 0)

  const phasesToRender = Object.keys(groupedItems)

  return (
    <div className="p-0">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-bold text-slate-800">Job Costing (Labour & Subs)</h2>
        <Button size="sm" onClick={() => openCreateDialog('phase')} className="bg-slate-800 text-white hover:bg-slate-700">
          <Plus className="w-4 h-4 mr-1" /> Add Phase
        </Button>
      </div>

      {phasesToRender.length === 0 && (
        <div className="text-center py-12 px-4 border border-dashed rounded-lg bg-slate-50 mt-4">
          <p className="text-slate-500 mb-4 font-medium">No phases or line items have been added to this project yet.</p>
          <Button onClick={() => openCreateDialog('phase')} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Create Your First Phase
          </Button>
        </div>
      )}

      <Accordion type="multiple" defaultValue={phasesToRender} className="w-full mt-4">
        {phasesToRender.map(phase => {
          const phaseItems = groupedItems[phase] || []
          const phaseTotal = phaseItems.reduce((acc, i) => acc + Number(i.client_price), 0)

          return (
            <AccordionItem key={phase} value={phase} className="px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex justify-between items-center w-full pr-4">
                  <span className="font-bold text-slate-700 tracking-wide uppercase text-sm">
                    {phase} <span className="text-slate-400 font-normal ml-2">({phaseItems.length} items)</span>
                  </span>
                  <span className="font-bold text-orange-600">{formatCurrency(phaseTotal)}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6">
                <div className="rounded-md border overflow-x-hidden">
                  <Table className="table-fixed w-full">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[40%]">Line Item</TableHead>
                        <TableHead className="w-[150px] min-w-[150px] text-right">GC Cost</TableHead>
                        <TableHead className="w-[150px] min-w-[150px] text-right font-bold text-slate-800">Client Price</TableHead>
                        <TableHead className="w-[150px] min-w-[150px] text-right">Paid</TableHead>
                        <TableHead className="w-[120px] min-w-[120px] text-center">Status</TableHead>
                        <TableHead className="w-[130px] min-w-[130px] text-right">Subcontractor</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {phaseItems.map(item => (
                        <TableRow key={item.id} className="group hover:bg-slate-50 border-b">
                          <TableCell className="font-medium text-slate-700 align-top pt-3 min-w-0">
                            <Textarea 
                              className="border-transparent hover:border-slate-200 bg-transparent min-h-[32px] h-auto p-1.5 shadow-none focus-visible:ring-1 w-full resize-none overflow-hidden leading-snug whitespace-pre-wrap [overflow-wrap:anywhere]" 
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

                          <TableCell className="text-right align-top">
                            <Input 
                              type="number" 
                              className="w-full h-8 text-right bg-transparent border-transparent hover:border-slate-200 shadow-none focus-visible:ring-1" 
                              defaultValue={item.gc_cost.toString()} 
                              onBlur={(e) => {
                                if(Number(e.target.value) !== item.gc_cost) 
                                  handleUpdateItem(item.id, { gc_cost: Number(e.target.value) })
                              }}
                            />
                            <div className="mt-1 text-left text-[11px] font-medium text-emerald-600">
                              Profit: {formatCurrency(Number(item.client_price) - Number(item.gc_cost))}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <Input 
                              type="number" 
                              className="w-full h-8 text-right font-bold text-slate-800 bg-transparent border-transparent hover:border-slate-200 shadow-none focus-visible:ring-1" 
                              defaultValue={item.client_price.toString()} 
                              onBlur={(e) => {
                                if(Number(e.target.value) !== item.client_price) 
                                  handleUpdateItem(item.id, { client_price: Number(e.target.value) })
                              }}
                            />
                          </TableCell>

                          <TableCell className="text-right align-top">
                            <Input 
                              type="number" 
                              className={`w-full h-8 text-right font-semibold bg-transparent border-transparent hover:border-slate-200 shadow-none focus-visible:ring-1 ${item.paid >= item.gc_cost && item.gc_cost > 0 ? 'text-emerald-600 bg-emerald-50/50' : 'text-slate-700'}`}
                              defaultValue={item.paid.toString()} 
                              onBlur={(e) => {
                                if(Number(e.target.value) !== item.paid) 
                                  handleUpdateItem(item.id, { paid: Number(e.target.value) })
                              }}
                            />
                            <div className="mt-1 text-left text-[11px] font-medium text-red-600">
                              Unpaid: ({formatCurrency(Math.max(Number(item.client_price) - Number(item.paid), 0))})
                            </div>
                          </TableCell>

                          <TableCell className="px-2">
                            <Select 
                              value={item.status}
                              onValueChange={(val) => handleUpdateItem(item.id, { status: val })}
                            >
                              <SelectTrigger className={`h-7 min-h-0 text-[11px] w-full border-transparent hover:border-slate-200 shadow-none bg-transparent font-semibold justify-center px-1.5 [&_svg]:hidden ${getStatusColor(item.status)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="GC_APPROVED">GC Approved</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell className="text-right">
                            <Select 
                              value={item.subcontractor_id?.toString() || 'unassigned'}
                              onValueChange={(val) => handleUpdateItem(item.id, { subcontractor_id: val === 'unassigned' ? null : Number(val)})}
                            >
                              <SelectTrigger className="h-8 text-xs w-full border-dashed bg-transparent shadow-none hover:border-slate-300">
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

                          <TableCell>
                            <Popover
                              open={deleteConfirmId === item.id}
                              onOpenChange={(open) => setDeleteConfirmId(open ? item.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent side="top" align="end" className="w-52 p-3">
                                <p className="mb-2 text-xs text-slate-700">Delete this line item?</p>
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
                                    className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
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
                          <TableCell colSpan={8} className="text-center text-slate-400 py-6 italic">No items in this phase.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={() => openCreateDialog('item', phase)} className="text-orange-600 border-orange-200 hover:bg-orange-50 font-medium">
                    <Plus className="w-4 h-4 mr-1" /> Add Line Item to {phase}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      <div className="bg-slate-900 text-white p-4 flex justify-between items-center rounded-b-lg mt-4 shadow-inner">
        <h3 className="font-bold tracking-widest text-sm text-slate-300">TOTAL PROJECT SUBS</h3>
        <div className="flex gap-8 text-sm">
          <div className="text-right">
            <span className="text-slate-400 mr-2 text-xs">Total GC Cost</span>
            <span className="font-semibold">{formatCurrency(totalGcCost)}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 mr-2 text-xs">Client Price</span>
            <span className="font-bold text-orange-400">{formatCurrency(totalClientPrice)}</span>
          </div>
          <div className="text-right border-l border-slate-700 pl-6">
            <span className="text-slate-400 mr-2 text-xs">Total Paid</span>
            <span className="font-semibold text-emerald-400">{formatCurrency(totalPaid)}</span>
          </div>
        </div>
      </div>

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
              <Button type="submit" disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600">
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
