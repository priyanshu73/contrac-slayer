'use client'

import { useState, useEffect } from 'react'
import { Project, ProjectLaborEntry } from '@/lib/types'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { MoneyInput, parseMoney } from './money-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, Loader2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface LaborSectionProps {
  project: Project
  onRefreshTotal: () => void
}

/**
 * Per-worker crew pay (the P&L "Labor" breakdown). The subtotal is the
 * fully-loaded labor cost that rolls into Total Job Cost — pure cost, no client
 * price.
 */
export function LaborSection({ project, onRefreshTotal }: LaborSectionProps) {
  const { toast } = useToast()
  const [entries, setEntries] = useState<ProjectLaborEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newWorker, setNewWorker] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Add-crew dialog: pick from previously-used crew, or type a brand-new name.
  const [addMode, setAddMode] = useState<'existing' | 'new'>('new')
  const [roster, setRoster] = useState<{ worker_name: string; last_amount: number | null }[]>([])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await api.getProjectLaborEntries(project.id)
      setEntries(data)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [project.id])

  // Names already on this project — hide them from the "existing crew" picker.
  const existingNames = new Set(entries.map(e => e.worker_name?.trim().toLowerCase()))
  const availableRoster = roster.filter(r => !existingNames.has(r.worker_name.trim().toLowerCase()))

  const openCreate = async () => {
    setNewWorker('')
    setNewAmount('')
    setCreateOpen(true)
    try {
      const data = await api.getCrewRoster()
      setRoster(data || [])
      // Default to the picker when there's a roster to pick from, else new entry.
      setAddMode((data || []).length ? 'existing' : 'new')
    } catch {
      setRoster([])
      setAddMode('new')
    }
  }

  const handlePickExisting = (name: string) => {
    const match = availableRoster.find(r => r.worker_name === name)
    setNewWorker(name)
    setNewAmount(match?.last_amount != null ? String(match.last_amount) : '')
  }

  const handleUpdate = async (entryId: number, updates: any) => {
    try {
      const updated = await api.updateProjectLaborEntry(project.id, entryId, updates)
      setEntries(prev => prev.map(e => e.id === entryId ? (updated as ProjectLaborEntry) : e))
      if (updates.amount !== undefined) onRefreshTotal()
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' })
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorker.trim()) return
    try {
      setIsSubmitting(true)
      const created = await api.createProjectLaborEntry(project.id, {
        worker_name: newWorker.trim(),
        amount: parseMoney(newAmount),
      })
      setEntries(prev => [...prev, created as ProjectLaborEntry])
      setNewWorker('')
      setNewAmount('')
      setCreateOpen(false)
      if (parseMoney(newAmount) > 0) onRefreshTotal()
    } catch (err: any) {
      toast({ title: 'Error adding worker', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (entryId: number) => {
    try {
      setDeletingId(entryId)
      await api.deleteProjectLaborEntry(project.id, entryId)
      setEntries(prev => prev.filter(e => e.id !== entryId))
      onRefreshTotal()
    } catch (err: any) {
      toast({ title: 'Delete failed', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  const total = entries.reduce((acc, e) => acc + Number(e.amount), 0)

  return (
    <Card className="border shadow-sm overflow-hidden">
      <div className="flex items-end justify-between gap-3 border-b bg-muted/30 px-5 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Labor</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Crew pay — the total rolls into job cost as fully-loaded labor.</p>
        </div>
        <span className="text-sm font-bold text-foreground tabular-nums shrink-0">{formatCurrency(total)}</span>
      </div>
      <CardContent className="p-4">

      <div className="rounded-md border overflow-hidden">
        <Table className="table-fixed w-full">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[70%] text-xs uppercase tracking-wider">Crew</TableHead>
              <TableHead className="w-[26%] text-right text-xs uppercase tracking-wider">Amount</TableHead>
              <TableHead className="w-[4%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6"><Loader2 className="animate-spin w-5 h-5 mx-auto text-muted-foreground" /></TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-6 italic">No crew added.</TableCell>
              </TableRow>
            ) : entries.map(entry => (
              <TableRow key={entry.id} className="group hover:bg-muted border-b">
                <TableCell className="font-medium text-foreground">
                  <Input
                    className="border-border/40 hover:border-border bg-transparent h-8 shadow-none focus-visible:ring-1"
                    defaultValue={entry.worker_name}
                    placeholder="e.g. Raul"
                    onBlur={e => { if (e.target.value !== entry.worker_name) handleUpdate(entry.id, { worker_name: e.target.value }) }}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <MoneyInput
                    value={entry.amount}
                    onCommit={(n) => handleUpdate(entry.id, { amount: n })}
                    className="w-full h-8 px-1.5 text-sm text-right bg-transparent border-border/40 hover:border-border shadow-none focus-visible:ring-1"
                  />
                </TableCell>
                <TableCell className="px-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    disabled={deletingId === entry.id}
                    onClick={() => handleDelete(entry.id)}
                  >
                    {deletingId === entry.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3">
        <Button variant="outline" size="sm" onClick={openCreate} className="text-primary border-primary/30 hover:bg-primary/10 font-medium">
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add crew</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
            {availableRoster.length > 0 && (
              <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                <button
                  type="button"
                  onClick={() => { setAddMode('existing'); setNewWorker(''); setNewAmount('') }}
                  className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${addMode === 'existing' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  Existing crew
                </button>
                <button
                  type="button"
                  onClick={() => { setAddMode('new'); setNewWorker(''); setNewAmount('') }}
                  className={`rounded px-2 py-1.5 text-xs font-medium transition-colors ${addMode === 'new' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  New crew member
                </button>
              </div>
            )}
            <div className="space-y-2">
              <Label>Crew</Label>
              {addMode === 'existing' && availableRoster.length > 0 ? (
                <Select value={newWorker || undefined} onValueChange={handlePickExisting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a crew member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoster.map(r => (
                      <SelectItem key={r.worker_name} value={r.worker_name}>
                        {r.worker_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={newWorker}
                  onChange={e => setNewWorker(e.target.value)}
                  placeholder="e.g. Raul"
                  autoFocus
                  required
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Amount (pay)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting || !newWorker.trim()} className="bg-primary hover:bg-primary/90">
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
