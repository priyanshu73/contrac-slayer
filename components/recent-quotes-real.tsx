"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { ChevronRight, FileText, Plus } from "lucide-react"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface ClientInfo {
  id: number
  name: string
}

interface Quote {
  id: number
  client?: ClientInfo | null
  status: string
  total_amount: number
  title?: string | null
  project_type?: string | null
  created_at: string
}

function getStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case "DRAFT":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "SENT":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "VIEWED":
      return "border-violet-200 bg-violet-50 text-violet-700"
    case "ACCEPTED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "REJECTED":
      return "border-rose-200 bg-rose-50 text-rose-700"
    case "PAID":
      return "border-green-200 bg-green-50 text-green-700"
    case "IN_PROGRESS":
      return "border-sky-200 bg-sky-50 text-sky-700"
    case "COMPLETED":
      return "border-teal-200 bg-teal-50 text-teal-700"
    default:
      return "border-slate-200 bg-slate-50 text-slate-700"
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

function formatStatusLabel(status: string) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function RecentQuotesReal() {
  const t = useTranslations("dashboard")
  const locale = useLocale()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadQuotes = async () => {
      try {
        const data = await api.getMyJobs(undefined, 0, 4)
        if (!cancelled) {
          setQuotes(Array.isArray(data) ? (data as Quote[]).slice(0, 4) : [])
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch recent quotes:", error)
        }
        if (!cancelled) setQuotes([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadQuotes()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className="border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t("recentQuotes") || "Recent Quotes"}</h2>
        </div>
        <Link
          href={`/${locale}/quotes`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:border-sky-700 hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
        >
          {t("viewAll") || "View All"}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="grid grid-cols-[1.2fr_1fr_auto_auto] gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16 justify-self-end" />
              </div>
            </div>
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-900">{t("noQuotesYet") || "No quotes yet."}</p>
          <p className="mt-1 text-sm text-slate-500">Your newest quotes will show up here once you create them.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quotes.map((quote) => {
            return (
              <Link
                key={quote.id}
                href={`/${locale}/quotes/${quote.id}`}
                className="block rounded-xl border border-slate-200 bg-white px-2.5 py-2 transition-all hover:border-sky-200 hover:bg-sky-50/20"
              >
                <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">Quote No</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-700">#{quote.id}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">
                      {quote.client?.name || "Unknown Client"}
                    </p>
                  </div>

                  <div className="text-right">
                    <Badge variant="outline" className={`mb-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(quote.status)}`}>
                      {formatStatusLabel(quote.status)}
                    </Badge>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(quote.total_amount)}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Button asChild size="sm" className="mt-3 h-9 w-full bg-sky-600 text-sm font-semibold text-white hover:bg-sky-700">
        <Link href={`/${locale}/quotes/new`}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("createQuote") || "Create Quote"}
        </Link>
      </Button>
    </Card>
  )
}
