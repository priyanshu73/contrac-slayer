"use client"

import { useEffect, useState } from "react"
import type { Job, Project } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { LinkQuoteDialog } from "./link-quote-dialog"

interface ProjectQuotesProps {
  project: Project
}

export function ProjectQuotes({ project }: ProjectQuotesProps) {
  const t = useTranslations("projects.quotes")
  const locale = useLocale()
  const router = useRouter()
  const [quotes, setQuotes] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)

  const fetchQuotes = async () => {
    if (!project.id) return
    try {
      setLoading(true)
      const data = await api.getProjectQuotes(project.id)
      setQuotes(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [project.id])

  if (!project.id) {
    return (
      <Card className="border-slate-200 shadow-sm p-6 text-sm text-slate-500">
        Project ID is required.
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            {t("title") || "Associated Quotes"}
          </h3>
          <Badge variant="outline" className="text-[11px]">
            {quotes.length}
          </Badge>
        </div>
        <Button size="sm" onClick={() => setIsLinkDialogOpen(true)}>
          {t("linkQuote") || "Link Quote"}
        </Button>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-slate-500">{t("loading") || "Loading quotes..."}</div>
      ) : quotes.length === 0 ? (
        <div className="p-4 text-sm text-slate-500">{t("empty") || "No quotes are linked to this project yet."}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {quotes.map((quote) => (
            <div key={quote.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {quote.title || quote.job_number || `Quote #${quote.id}`}
                </p>
                {quote.job_description && (
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                    {quote.job_description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-slate-900">
                  {quote.total_amount != null
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(quote.total_amount)
                    : "—"}
                </p>
                {quote.status && (
                  <Badge variant="outline" className="text-[11px]">
                    {quote.status}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/quotes/${quote.id}`)}>
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LinkQuoteDialog
        projectId={project.id}
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        onLinked={() => fetchQuotes()}
      />
    </Card>
  )
}
