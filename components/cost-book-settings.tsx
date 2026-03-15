"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { UploadCloud, CheckCircle2, Trash2, Plus } from "lucide-react"

export interface CostBookItem {
  id?: number
  description: string
  cost_per_unit: number
  unit_of_measure: string
  category?: string
  item_code?: string
}

export function CostBookSettings() {
  const [items, setItems] = useState<CostBookItem[]>([])
  const [existingItems, setExistingItems] = useState<CostBookItem[]>([])
  const [isLoadingExisting, setIsLoadingExisting] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchExistingItems()
  }, [])

  const fetchExistingItems = async () => {
    try {
      setIsLoadingExisting(true)
      const data = await api.getCostBook()
      setExistingItems(data)
    } catch (err) {
      console.error("Failed to load existing cost book items:", err)
    } finally {
      setIsLoadingExisting(false)
    }
  }

  const handleDeleteExistingItem = async (itemId: number) => {
    if (!confirm("Are you sure you want to delete this specific item?")) return
    try {
      setIsDeleting(itemId)
      await api.deleteCostBookItem(itemId)
      setExistingItems(existingItems.filter(item => item.id !== itemId))
      setSuccess("Item deleted successfully.")
    } catch (err: any) {
      setError(err.message || "Failed to delete item.")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setIsUploading(true)
    setError("")
    setSuccess("")
    
    try {
      const parsedItems = await api.uploadCostBook(file)
      setItems(parsedItems)
      setSuccess("File parsed successfully using AI. Review items before saving.")
    } catch (err: any) {
      setError(err.message || "Failed to parse cost book. Ensure it's a valid CSV/Excel file.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSaveItems = async () => {
    if (items.length === 0) return
    setIsSaving(true)
    setError("")
    setSuccess("")
    
    try {
      await api.confirmCostBook(items)
      setSuccess(`Successfully saved ${items.length} items to your master cost book.`)
      setItems([])
      fetchExistingItems()
    } catch (err: any) {
      setError(err.message || "Failed to save cost book items.")
    } finally {
      setIsSaving(false)
    }
  }

  const updateItem = (index: number, field: keyof CostBookItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
  }

  const addNewItem = () => {
    setItems([{ description: "", cost_per_unit: 0, unit_of_measure: "each", category: "", item_code: "" }, ...items])
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">Master Cost Book</h3>
            <p className="text-sm text-slate-500 mt-1">
              Upload an Excel/CSV file of your pricing to standardize via AI, or add items manually.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv, .xls, .xlsx, .tsv"
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSaving}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Upload Excel/CSV
                </span>
              )}
            </Button>
            <Button onClick={addNewItem} disabled={isUploading || isSaving}>
              <Plus className="h-4 w-4 mr-1" /> Add Manual Item
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200 mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm border border-emerald-200 mb-4">
            {success}
          </div>
        )}

        {/* Existing Items Table (Read Only with Delete) */}
        {!isLoadingExisting && existingItems.length > 0 && items.length === 0 && (
          <div className="space-y-4 mb-8">
            <h4 className="text-sm font-semibold text-slate-700">Currently Saved Items ({existingItems.length})</h4>
            <div className="rounded-md border border-slate-200 max-h-[40vh] overflow-y-auto w-full">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-1/3">Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Cost ($)</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead className="w-12 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingItems.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell className="font-medium text-slate-700">{item.description}</TableCell>
                      <TableCell className="text-slate-600">{item.category || "-"}</TableCell>
                      <TableCell className="text-slate-600">${Number(item.cost_per_unit).toFixed(2)}</TableCell>
                      <TableCell className="text-slate-600">{item.unit_of_measure}</TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs">{item.item_code || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => item.id && handleDeleteExistingItem(item.id)}
                          disabled={isDeleting === item.id}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          {isDeleting === item.id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* New Uploads Staging Table */}
        {items.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <h4 className="text-sm font-semibold text-blue-700">Pending New Items</h4>
              <Button variant="ghost" size="sm" onClick={() => setItems([])} className="h-8 text-slate-500 hover:text-slate-700">
                Cancel
              </Button>
            </div>
            <div className="rounded-md border border-blue-200 max-h-[60vh] overflow-y-auto w-full">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-1/3">Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Cost ($)</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead className="w-12 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index} className="group">
                      <TableCell>
                        <Input 
                          value={item.description} 
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="h-8 shadow-none"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={item.category || ""} 
                          onChange={(e) => updateItem(index, 'category', e.target.value)}
                          className="h-8 shadow-none"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          step="0.01"
                          value={item.cost_per_unit} 
                          onChange={(e) => updateItem(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                          className="h-8 shadow-none w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={item.unit_of_measure} 
                          onChange={(e) => updateItem(index, 'unit_of_measure', e.target.value)}
                          className="h-8 shadow-none w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={item.item_code || ""} 
                          onChange={(e) => updateItem(index, 'item_code', e.target.value)}
                          className="h-8 shadow-none"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveItems} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? (
                 <span className="flex items-center gap-2">
                   <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                   Saving...
                 </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm & Save {items.length} Items
                  </span>
                )}
              </Button>
            </div>
          </div>
        ) : existingItems.length === 0 && !isLoadingExisting ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <UploadCloud className="h-10 w-10 text-slate-300 mb-3" />
            <p>No items saved yet.</p>
            <p className="text-sm mt-1">Upload a CSV/Excel file or click "Add Manual Item" to start.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
