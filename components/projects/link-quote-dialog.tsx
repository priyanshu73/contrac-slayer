"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import type { Job } from "@/lib/types"

interface LinkQuoteDialogProps {
  projectId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onLinked: () => void
}

export function LinkQuoteDialog({ projectId, open, onOpenChange, onLinked }: LinkQuoteDialogProps) {
  const t = useTranslations("projects.quotes")
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState(false)
  const [quotes, setQuotes] = useState<Job[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("")

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const loadQuotes = async () => {
      try {
        setLoading(true)
        // Fetch all jobs for contractor, ideally we'd filter on backend to unlinked ones
        const data = await api.getMyJobs()
        if (!cancelled) {
          // Filter to quotes that are NOT linked to any project
          // By our schema, quotes are associated directly to projects
          const availableQuotes = Array.isArray(data) ? data.filter(q => !q.project_id) : []
          setQuotes(availableQuotes)
          setSelectedQuoteId("")
        }
      } catch (err) {
        console.error("Failed to load quotes", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadQuotes()
    return () => {
      cancelled = true
    }
  }, [open])

  const handleLink = async () => {
    if (!selectedQuoteId) return
    try {
      setLinking(true)
      await api.updateJob(Number(selectedQuoteId), { project_id: projectId })
      onLinked()
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to link quote", err)
      // Optional: Add a toast notification here
    } finally {
      setLinking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("linkQuoteDialogTitle") || "Link Quote to Project"}</DialogTitle>
          <DialogDescription>
            {t("linkQuoteDialogDescription") || "Select an existing quote to associate with this project. A quote can only belong to one project at a time."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select disabled={loading} value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading quotes..." : "Select a quote"} />
            </SelectTrigger>
            <SelectContent>
              {quotes.map(quote => (
                <SelectItem key={quote.id} value={quote.id.toString()}>
                  {quote.title || quote.job_number || `Quote #${quote.id}`}
                  {quote.client?.name ? ` for ${quote.client.name}` : ""} - {
                    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quote.total_amount || 0)
                  } ({quote.status})
                </SelectItem>
              ))}
              {quotes.length === 0 && !loading && (
                <SelectItem value="none" disabled>
                  No available quotes found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selectedQuoteId || selectedQuoteId === "none" || linking} onClick={handleLink}>
            {linking ? "Linking..." : "Link Quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
