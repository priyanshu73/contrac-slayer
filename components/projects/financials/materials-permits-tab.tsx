'use client'

import { useState, useEffect, useRef } from 'react'
import { Project, ProjectMaterial, ScopeQuoteLineItem } from '@/lib/types'
import { api } from '@/lib/api'
import { QuoteItemPicker } from './quote-item-picker'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { MoneyInput, parseMoney } from './money-input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, Loader2, Link2, Eye, Upload, FileDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface MaterialsPermitsTabProps {
  project: Project
  onRefreshTotal: () => void
  onProjectMediaChanged?: () => Promise<void> | void
}

export function MaterialsPermitsTab({ project, onRefreshTotal, onProjectMediaChanged }: MaterialsPermitsTabProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<ProjectMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingReceiptItemId, setUploadingReceiptItemId] = useState<number | null>(null)
  const [receiptPopoverItemId, setReceiptPopoverItemId] = useState<number | null>(null)
  const [pendingReceiptItemId, setPendingReceiptItemId] = useState<number | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<{name: string, url: string} | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null)
  const receiptInputRef = useRef<HTMLInputElement | null>(null)

  const getReceipts = (item: ProjectMaterial) => {
    if (item.receipts && item.receipts.length > 0) return item.receipts
    if (item.po_url) return [{ name: 'Attached Receipt', url: item.po_url }]
    return []
  }

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
      
      if (updates.cost !== undefined || updates.client_price !== undefined) {
        onRefreshTotal()
      }
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (itemId: number) => {
    try {
      setDeletingItemId(itemId)
      await api.deleteProjectMaterial(project.id, itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      onRefreshTotal()
      setDeleteConfirmId(null)
      toast({ title: 'Deleted' })
    } catch (err: any) {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeletingItemId(null)
    }
  }

  const openFilePickerForItem = (itemId: number) => {
    setPendingReceiptItemId(itemId)
    receiptInputRef.current?.click()
  }

  const handleReceiptUpload = async (files: FileList | File[], item: ProjectMaterial) => {
    try {
      setUploadingReceiptItemId(item.id)
      const fileArray = Array.from(files)
      const uploaded = await api.uploadProjectMedia(project.id, fileArray, 'PROJECT_DOCUMENT')
      
      const uploadedUrls = uploaded.map((u: any) => ({ name: u.file_name, url: u.file_url }))

      const currentReceipts = item.receipts || (item.po_url ? [{ name: 'Receipt', url: item.po_url }] : [])
      const newReceipts = [...currentReceipts, ...uploadedUrls]
      const poUrl = newReceipts.length > 0 ? newReceipts[0].url : null

      const updated = await api.updateProjectMaterial(project.id, item.id, { 
        receipts: newReceipts,
        po_url: poUrl
      })
      setItems(prev => prev.map(i => i.id === item.id ? (updated as ProjectMaterial) : i))
      toast({ title: 'Receipt(s) attached' })
      await onProjectMediaChanged?.()
    } catch (err: any) {
      toast({
        title: 'Receipt upload failed',
        description: err.message || 'Unable to upload receipt.',
        variant: 'destructive',
      })
    } finally {
      setUploadingReceiptItemId(null)
    }
  }

  const handleDeleteReceipt = async (item: ProjectMaterial, index: number) => {
    const currentReceipts = item.receipts || (item.po_url ? [{ name: 'Receipt', url: item.po_url }] : [])
    const newReceipts = [...currentReceipts]
    newReceipts.splice(index, 1)
    try {
      setUploadingReceiptItemId(item.id)
      const poUrl = newReceipts.length > 0 ? newReceipts[0].url : null
      const updated = await api.updateProjectMaterial(project.id, item.id, { 
        receipts: newReceipts,
        po_url: poUrl
      })
      setItems(prev => prev.map(i => i.id === item.id ? (updated as ProjectMaterial) : i))
      toast({ title: 'Receipt removed' })
    } catch (err: any) {
      toast({ title: 'Failed to remove receipt', variant: 'destructive' })
    } finally {
      setUploadingReceiptItemId(null)
    }
  }

  const handleReceiptInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target
    const files = target.files
    const itemId = pendingReceiptItemId
    if (!files || files.length === 0 || !itemId) {
      target.value = ''
      setPendingReceiptItemId(null)
      return
    }
    const item = items.find(i => i.id === itemId)
    if (!item) {
      target.value = ''
      setPendingReceiptItemId(null)
      return
    }
    await handleReceiptUpload(files, item)
    target.value = ''
    setPendingReceiptItemId(null)
  }

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createCategory, setCreateCategory] = useState<'JOB_MATERIAL' | 'SITE_SERVICE'>('JOB_MATERIAL')
  const [newItemName, setNewItemName] = useState('')
  const [newItemVendor, setNewItemVendor] = useState('')
  const [newItemCost, setNewItemCost] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openCreateDialog = (category: 'JOB_MATERIAL' | 'SITE_SERVICE') => {
    setCreateCategory(category)
    setNewItemName('')
    setNewItemVendor('')
    setNewItemCost('')
    setCreateDialogOpen(true)
  }

  const [quotePickerCategory, setQuotePickerCategory] = useState<'JOB_MATERIAL' | 'SITE_SERVICE' | null>(null)

  // Quote line items already pulled into materials — so the picker can mark them.
  const pulledItemIds = new Set(
    items.map((i) => i.source_job_item_id).filter((x): x is number => x != null)
  )

  // Seed material lines from selected quote line items (cost → cost, price → client_price).
  const handleAddFromQuote = async (
    category: 'JOB_MATERIAL' | 'SITE_SERVICE',
    lineItems: ScopeQuoteLineItem[],
  ) => {
    // Create sequentially and commit whatever succeeded — even if a later item fails —
    // so already-persisted rows appear immediately (and are deduped on re-open).
    // Rethrow on failure so the picker stays open instead of closing on a partial save.
    const created: ProjectMaterial[] = []
    try {
      for (const li of lineItems) {
        const newItem = await api.createProjectMaterial(project.id, {
          category,
          item_name: li.description,
          cost: li.cost,
          client_price: li.total,
          source_job_item_id: li.id,
        })
        created.push(newItem as ProjectMaterial)
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    
    try {
      setIsSubmitting(true)
      const newItem = await api.createProjectMaterial(project.id, {
        category: createCategory,
        item_name: newItemName.trim(),
        vendor: newItemVendor.trim() || null,
        cost: parseMoney(newItemCost),
        client_price: 0
      })
      setItems(prev => [...prev, newItem as ProjectMaterial])
      setCreateDialogOpen(false)
      if (parseMoney(newItemCost) > 0) onRefreshTotal()
    } catch(err: any) {
      toast({ title: 'Error creating item', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto" /></div>

  const jobMaterials = items.filter(i => i.category === 'JOB_MATERIAL')
  const siteServices = items.filter(i => i.category === 'SITE_SERVICE')

  const jobMaterialsCost = jobMaterials.reduce((acc, i) => acc + Number(i.cost), 0)
  const siteServicesCost = siteServices.reduce((acc, i) => acc + Number(i.cost), 0)

  return (
    <div className="space-y-6">
      {/* JOB MATERIALS */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="flex items-end justify-between gap-3 border-b bg-muted/30 px-5 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Job Materials</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Materials bought for the job.</p>
          </div>
          <span className="text-sm font-bold text-foreground tabular-nums shrink-0">{formatCurrency(jobMaterialsCost)}</span>
        </div>
        <CardContent className="p-4">
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-[200px]">Item</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Detailed Notes</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="w-[100px] text-center">PO / Receipt</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobMaterials.map(item => (
                <TableRow key={item.id} className="group hover:bg-muted border-b">
                  <TableCell className="font-medium text-foreground">
                    <Input 
                      className="border-border/40 hover:border-border bg-transparent h-8 shadow-none focus-visible:ring-1" 
                      defaultValue={item.item_name}
                      onBlur={e => { if(e.target.value !== item.item_name) handleUpdate(item.id, { item_name: e.target.value }) }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder="e.g. Home Depot"
                      className="border-border/40 hover:border-border bg-transparent h-8 shadow-none text-sm" 
                      defaultValue={item.vendor || ''}
                      onBlur={e => { if(e.target.value !== item.vendor) handleUpdate(item.id, { vendor: e.target.value }) }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder="Details..."
                      className="border-border/40 hover:border-border bg-transparent h-8 shadow-none text-sm text-muted-foreground" 
                      defaultValue={item.detailed_notes || ''}
                      onBlur={e => { if(e.target.value !== item.detailed_notes) handleUpdate(item.id, { detailed_notes: e.target.value }) }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyInput
                      value={item.cost}
                      onCommit={(n) => handleUpdate(item.id, { cost: n })}
                      className="w-24 h-8 text-right ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Popover
                      open={receiptPopoverItemId === item.id}
                      onOpenChange={(open) => setReceiptPopoverItemId(open ? item.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 hover:bg-primary/10 ${getReceipts(item).length > 0 ? 'text-status-active hover:text-status-active' : 'text-primary hover:text-primary'}`}
                          disabled={uploadingReceiptItemId === item.id}
                          title={getReceipts(item).length > 0 ? `${getReceipts(item).length} receipt(s) attached` : 'Attach receipt'}
                        >
                          {uploadingReceiptItemId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="center" className="w-56 p-2">
                        <div className="space-y-1">
                          {getReceipts(item).length > 0 && (
                            <div className="mb-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                              {getReceipts(item).map((receipt, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-1 p-1 rounded hover:bg-muted group">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 justify-start h-auto py-1.5 px-2 font-normal text-xs truncate"
                                    onClick={() => setPreviewAttachment(receipt)}
                                    title={receipt.name}
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-2 shrink-0 text-muted-foreground group-hover:text-status-active" />
                                    <span className="truncate">{receipt.name}</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10"
                                    onClick={() => handleDeleteReceipt(item, idx)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-sm"
                            onClick={() => openFilePickerForItem(item.id)}
                          >
                            <Upload className="w-4 h-4 mr-2" /> 
                            {getReceipts(item).length > 0 ? 'Add more receipts' : 'Attach receipt'}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
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
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="end" className="w-52 p-3">
                        <p className="mb-2 text-xs text-foreground">Delete this material?</p>
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
                            onClick={() => handleDelete(item.id)}
                          >
                            {deletingItemId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
              {jobMaterials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6 italic">No materials added.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setQuotePickerCategory('JOB_MATERIAL')} className="text-muted-foreground border-border hover:bg-muted">
            <FileDown className="w-4 h-4 mr-1" /> From quote
          </Button>
          <Button size="sm" onClick={() => openCreateDialog('JOB_MATERIAL')} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" /> Add Material
          </Button>
        </div>
        </CardContent>
      </Card>

      {/* SITE SERVICES & PERMITS */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="flex items-end justify-between gap-3 border-b bg-muted/30 px-5 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Site Services &amp; Admin</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Permits, utilities, disposal &amp; admin.</p>
          </div>
          <span className="text-sm font-bold text-foreground tabular-nums shrink-0">{formatCurrency(siteServicesCost)}</span>
        </div>
        <CardContent className="p-4">
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Service / Permit Name</TableHead>
                <TableHead>Agency / Vendor</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siteServices.map(item => (
                <TableRow key={item.id} className="group hover:bg-muted border-b">
                  <TableCell className="font-medium">
                    <Input 
                      className="border-border/40 hover:border-border bg-transparent h-8 shadow-none font-medium text-foreground" 
                      defaultValue={item.item_name}
                      onBlur={e => { if(e.target.value !== item.item_name) handleUpdate(item.id, { item_name: e.target.value }) }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder="e.g. City of Seattle"
                      className="border-border/40 hover:border-border bg-transparent h-8 shadow-none text-sm text-muted-foreground" 
                      defaultValue={item.vendor || ''}
                      onBlur={e => { if(e.target.value !== item.vendor) handleUpdate(item.id, { vendor: e.target.value }) }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyInput
                      value={item.cost}
                      onCommit={(n) => handleUpdate(item.id, { cost: n })}
                      className="w-24 h-8 text-right ml-auto"
                    />
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
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="end" className="w-52 p-3">
                        <p className="mb-2 text-xs text-foreground">Delete this service?</p>
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
                            onClick={() => handleDelete(item.id)}
                          >
                            {deletingItemId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              ))}
              {siteServices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6 italic">No site services added.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setQuotePickerCategory('SITE_SERVICE')} className="text-muted-foreground border-border hover:bg-muted">
            <FileDown className="w-4 h-4 mr-1" /> From quote
          </Button>
          <Button size="sm" onClick={() => openCreateDialog('SITE_SERVICE')} variant="outline" className="text-primary border-primary/30 hover:bg-primary/10">
            <Plus className="w-4 h-4 mr-1" /> Add Service
          </Button>
        </div>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {createCategory === 'JOB_MATERIAL' ? 'Add Material' : 'Add Site Service / Permit'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{createCategory === 'JOB_MATERIAL' ? 'Item Name' : 'Service / Permit Name'}</Label>
              <Input
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder={createCategory === 'JOB_MATERIAL' ? 'e.g. 2x4 Lumber' : 'e.g. City Building Permit'}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{createCategory === 'JOB_MATERIAL' ? 'Vendor' : 'Agency / Vendor'} <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={newItemVendor}
                onChange={e => setNewItemVendor(e.target.value)}
                placeholder={createCategory === 'JOB_MATERIAL' ? 'e.g. Home Depot' : 'e.g. City of Seattle'}
              />
            </div>
            <div className="space-y-2">
              <Label>Cost</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={newItemCost}
                onChange={e => setNewItemCost(e.target.value.replace(/[^0-9.]/g, ''))}
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
      <input
        ref={receiptInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
        onChange={handleReceiptInputChange}
      />

      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="max-w-[90vw] w-full h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-muted">
          <DialogHeader className="pt-4 pb-3 px-4 bg-white flex flex-row items-center justify-between shrink-0 shadow-sm z-10">
            <DialogTitle className="text-base truncate pr-8 font-medium text-foreground">{previewAttachment?.name || 'Preview'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative w-full h-[calc(90vh-65px)] flex items-center justify-center">
            {previewAttachment && (
              previewAttachment.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                <img src={previewAttachment.url} alt={previewAttachment.name} className="max-w-full max-h-full object-contain drop-shadow-md" />
              ) : previewAttachment.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={`${previewAttachment.url}#view=FitH`} className="w-full h-full border-0 bg-white" title={previewAttachment.name} />
              ) : (
                <div className="text-center p-8 flex flex-col items-center bg-white rounded-xl shadow-sm border max-w-md mx-auto">
                  <div className="bg-muted p-4 rounded-full mb-4">
                    <Link2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Preview Available</h3>
                  <p className="text-muted-foreground mb-6 text-sm">This file type cannot be previewed in the browser.</p>
                  <Button onClick={() => window.open(previewAttachment.url, '_blank')} className="bg-primary hover:bg-primary/90">
                    Download File
                  </Button>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {quotePickerCategory && (
        <QuoteItemPicker
          projectId={project.id}
          open={!!quotePickerCategory}
          onOpenChange={(o) => { if (!o) setQuotePickerCategory(null) }}
          pulledItemIds={pulledItemIds}
          destinationLabel={quotePickerCategory === 'JOB_MATERIAL' ? 'Job Materials' : 'Site Services'}
          onConfirm={(lineItems) => handleAddFromQuote(quotePickerCategory, lineItems)}
        />
      )}
    </div>
  )
}
