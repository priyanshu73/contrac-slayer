'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Trash2, Plus, Loader2, Link2, Eye, Upload } from 'lucide-react'
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
        client_price: 0
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
                      className="w-24 h-8 text-right font-bold text-slate-800 ml-auto" 
                      defaultValue={item.client_price.toString()} 
                      onBlur={(e) => {
                        if(Number(e.target.value) !== item.client_price) handleUpdate(item.id, { client_price: Number(e.target.value) })
                      }}
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
                          className={`h-8 w-8 hover:bg-orange-50 ${getReceipts(item).length > 0 ? 'text-emerald-600 hover:text-emerald-700' : 'text-orange-500 hover:text-orange-600'}`}
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
                                <div key={idx} className="flex items-center justify-between gap-1 p-1 rounded hover:bg-slate-100 group">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 justify-start h-auto py-1.5 px-2 font-normal text-xs truncate"
                                    onClick={() => setPreviewAttachment(receipt)}
                                    title={receipt.name}
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-2 shrink-0 text-slate-400 group-hover:text-emerald-600" />
                                    <span className="truncate">{receipt.name}</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50"
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
                          className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="end" className="w-52 p-3">
                        <p className="mb-2 text-xs text-slate-700">Delete this material?</p>
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
                      className="w-24 h-8 text-right font-bold text-slate-800 ml-auto" 
                      defaultValue={item.client_price.toString()} 
                      onBlur={(e) => {
                        if(Number(e.target.value) !== item.client_price) handleUpdate(item.id, { client_price: Number(e.target.value) })
                      }}
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
                          className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="end" className="w-52 p-3">
                        <p className="mb-2 text-xs text-slate-700">Delete this service?</p>
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
      <input
        ref={receiptInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
        onChange={handleReceiptInputChange}
      />

      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="max-w-[90vw] w-full h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-slate-100">
          <DialogHeader className="pt-4 pb-3 px-4 bg-white flex flex-row items-center justify-between shrink-0 shadow-sm z-10">
            <DialogTitle className="text-base truncate pr-8 font-medium text-slate-800">{previewAttachment?.name || 'Preview'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative w-full h-[calc(90vh-65px)] flex items-center justify-center">
            {previewAttachment && (
              previewAttachment.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                <img src={previewAttachment.url} alt={previewAttachment.name} className="max-w-full max-h-full object-contain drop-shadow-md" />
              ) : previewAttachment.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={`${previewAttachment.url}#view=FitH`} className="w-full h-full border-0 bg-white" title={previewAttachment.name} />
              ) : (
                <div className="text-center p-8 flex flex-col items-center bg-white rounded-xl shadow-sm border max-w-md mx-auto">
                  <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <Link2 className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-800 mb-2">No Preview Available</h3>
                  <p className="text-slate-500 mb-6 text-sm">This file type cannot be previewed in the browser.</p>
                  <Button onClick={() => window.open(previewAttachment.url, '_blank')} className="bg-orange-500 hover:bg-orange-600">
                    Download File
                  </Button>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
