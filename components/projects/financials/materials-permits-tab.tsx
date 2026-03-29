'use client'

import { useState, useEffect } from 'react'
import { Project, ProjectMaterial } from '@/lib/types'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, Loader2, Link2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface MaterialsPermitsTabProps {
  project: Project
  onRefreshTotal: () => void
}

export function MaterialsPermitsTab({ project, onRefreshTotal }: MaterialsPermitsTabProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<ProjectMaterial[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await api.getProjectMaterials(project.id)
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

  const handleUpdate = async (itemId: number, updates: any) => {
    try {
      const updated = await api.updateProjectMaterial(project.id, itemId, updates)
      setItems(prev => prev.map(i => i.id === itemId ? (updated as ProjectMaterial) : i))
      
      if (updates.cost !== undefined || updates.markup_pct !== undefined) {
        onRefreshTotal()
      }
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (itemId: number) => {
    if (!confirm('Delete this item?')) return
    try {
      await api.deleteProjectMaterial(project.id, itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      onRefreshTotal()
      toast({ title: 'Deleted' })
    } catch (err: any) {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createCategory, setCreateCategory] = useState<'JOB_MATERIAL' | 'SITE_SERVICE'>('JOB_MATERIAL')
  const [newItemName, setNewItemName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openCreateDialog = (category: 'JOB_MATERIAL' | 'SITE_SERVICE') => {
    setCreateCategory(category)
    setNewItemName('')
    setCreateDialogOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    
    try {
      setIsSubmitting(true)
      const newItem = await api.createProjectMaterial(project.id, {
        category: createCategory,
        item_name: newItemName.trim(),
        cost: 0,
        markup_pct: 0
      })
      setItems(prev => [...prev, newItem as ProjectMaterial])
      setCreateDialogOpen(false)
    } catch(err: any) {
      toast({ title: 'Error creating item', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto" /></div>

  const jobMaterials = items.filter(i => i.category === 'JOB_MATERIAL')
  const siteServices = items.filter(i => i.category === 'SITE_SERVICE')

  const totalCost = items.reduce((acc, i) => acc + Number(i.cost), 0)
  const totalClientPrice = items.reduce((acc, i) => acc + Number(i.client_price), 0)

  return (
    <div className="p-0">
      {/* JOB MATERIALS */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Job Materials</h2>
          <Button size="sm" onClick={() => openCreateDialog('JOB_MATERIAL')} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-1" /> Add Material
          </Button>
        </div>
        
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[200px]">Item</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Detailed Notes</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right w-[100px]">Markup %</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Client Price</TableHead>
                <TableHead className="w-[100px] text-center">PO / Receipt</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobMaterials.map(item => (
                <TableRow key={item.id} className="group hover:bg-slate-50 border-b">
                  <TableCell className="font-medium text-slate-800">
                    <Input 
                      className="border-transparent hover:border-slate-200 bg-transparent h-8 shadow-none focus-visible:ring-1" 
                      defaultValue={item.item_name}
                      onBlur={e => { if(e.target.value !== item.item_name) handleUpdate(item.id, { item_name: e.target.value }) }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder="e.g. Home Depot"
                      className="border-transparent hover:border-slate-200 bg-transparent h-8 shadow-none text-sm" 
                      defaultValue={item.vendor || ''}
                      onBlur={e => { if(e.target.value !== item.vendor) handleUpdate(item.id, { vendor: e.target.value }) }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder="Details..."
                      className="border-transparent hover:border-slate-200 bg-transparent h-8 shadow-none text-sm text-slate-500" 
                      defaultValue={item.detailed_notes || ''}
                      onBlur={e => { if(e.target.value !== item.detailed_notes) handleUpdate(item.id, { detailed_notes: e.target.value }) }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input 
                      type="number" 
                      className="w-24 h-8 text-right ml-auto" 
                      defaultValue={item.cost.toString()} 
                      onBlur={(e) => {
                        if(Number(e.target.value) !== item.cost) handleUpdate(item.id, { cost: Number(e.target.value) })
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                     <Input 
                        type="number" 
                        className="w-16 h-8 text-right ml-auto text-slate-500 group-hover:border-orange-300 transition-colors" 
                        defaultValue={item.markup_pct.toString()} 
                        onBlur={(e) => {
                          if(Number(e.target.value) !== item.markup_pct) handleUpdate(item.id, { markup_pct: Number(e.target.value) })
                        }}
                      />
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-800">
                    {formatCurrency(item.client_price)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50">
                      <Link2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {jobMaterials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-400 py-6 italic">No materials added.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* SITE SERVICES & PERMITS */}
      <div className="p-6 pt-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Site Services & Admin (Permits, Utilities)</h2>
          <Button size="sm" onClick={() => openCreateDialog('SITE_SERVICE')} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">
            <Plus className="w-4 h-4 mr-1" /> Add Service
          </Button>
        </div>
        
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead>Service / Permit Name</TableHead>
                <TableHead>Agency / Vendor</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right w-[100px]">Markup %</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Client Price</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siteServices.map(item => (
                <TableRow key={item.id} className="group hover:bg-slate-50 border-b">
                  <TableCell className="font-medium">
                    <Input 
                      className="border-transparent hover:border-slate-200 bg-transparent h-8 shadow-none font-medium text-slate-700" 
                      defaultValue={item.item_name}
                      onBlur={e => { if(e.target.value !== item.item_name) handleUpdate(item.id, { item_name: e.target.value }) }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder="e.g. City of Seattle"
                      className="border-transparent hover:border-slate-200 bg-transparent h-8 shadow-none text-sm text-slate-500" 
                      defaultValue={item.vendor || ''}
                      onBlur={e => { if(e.target.value !== item.vendor) handleUpdate(item.id, { vendor: e.target.value }) }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input 
                      type="number" 
                      className="w-24 h-8 text-right ml-auto" 
                      defaultValue={item.cost.toString()} 
                      onBlur={(e) => {
                        if(Number(e.target.value) !== item.cost) handleUpdate(item.id, { cost: Number(e.target.value) })
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                     <Input 
                        type="number" 
                        className="w-16 h-8 text-right ml-auto text-slate-500 group-hover:border-orange-300 transition-colors" 
                        defaultValue={item.markup_pct.toString()} 
                        onBlur={(e) => {
                          if(Number(e.target.value) !== item.markup_pct) handleUpdate(item.id, { markup_pct: Number(e.target.value) })
                        }}
                      />
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-800">
                    {formatCurrency(item.client_price)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {siteServices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-6 italic">No site services added.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-4 flex justify-between items-center rounded-b-lg mt-0 mx-0 shadow-inner">
        <h3 className="font-bold tracking-widest text-sm text-orange-400 font-mono">TOTAL MATERIALS & PERMITS</h3>
        <div className="flex gap-8 text-sm">
          <div className="text-right">
            <span className="text-slate-400 mr-2 text-xs uppercase">Total Cost</span>
            <span className="font-semibold tracking-wide text-slate-200">{formatCurrency(totalCost)}</span>
          </div>
          <div className="text-right border-l border-slate-700 pl-6">
            <span className="text-slate-400 mr-2 text-xs uppercase">Total Client Price</span>
            <span className="font-bold text-lg text-emerald-400">{formatCurrency(totalClientPrice)}</span>
          </div>
        </div>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {createCategory === 'JOB_MATERIAL' ? 'Add Material' : 'Add Site Service / Permit'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input 
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder={createCategory === 'JOB_MATERIAL' ? 'e.g. 2x4 Lumber' : 'e.g. City Building Permit'}
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
