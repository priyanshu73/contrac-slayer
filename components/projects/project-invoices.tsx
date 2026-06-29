"use client"

import { useEffect, useState } from "react"
import type { Project } from "@/lib/types"
import { api } from "@/lib/api"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ReceiptText } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectInvoicesProps {
  project: Project
}

interface ProjectInvoice {
  id: number
  invoice_number: string
  job_id?: number | null
  title?: string | null
  status: string
  total_amount: number
  amount_paid: number
  balance_due: number
  issue_date?: string | null
  due_date?: string | null
  client_name?: string | null
  created_at?: string | null
}

function invoiceStatusBadge(status: string | undefined): string {
  const s = String(status ?? "").toUpperCase()
  const map: Record<string, string> = {
    DRAFT:          "bg-slate-50 text-slate-500 border-slate-200",
    SENT:           "bg-amber-50 text-amber-700 border-amber-200",
    PENDING:        "bg-amber-50 text-amber-700 border-amber-200",
    PARTIALLY_PAID: "bg-sky-50 text-sky-700 border-sky-200",
    PAID:           "bg-emerald-50 text-emerald-700 border-emerald-200",
    OVERDUE:        "bg-rose-50 text-rose-700 border-rose-200",
    CANCELLED:      "bg-slate-100 text-slate-500 border-slate-200",
  }
  return map[s] ?? "bg-indigo-50 text-indigo-700 border-indigo-200"
}

export function ProjectInvoices({ project }: ProjectInvoicesProps) {
  const locale = useLocale()
  const router = useRouter()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([])
  const [loading, setLoading] = useState(false)

  const fetchInvoices = async () => {
    if (!project.id) return
    try {
      setLoading(true)
      const data = await api.getProjectInvoices(project.id)
      setInvoices(Array.isArray(data) ? data : [])
    } catch (err: any) {
      toast({ title: "Failed to load invoices", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInvoices() }, [project.id])

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

  if (!project.id) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-900">Invoices</span>
          {invoices.length > 0 && (
            <span className="rounded-md bg-slate-100 text-slate-600 text-xs font-semibold px-1.5 py-0.5 leading-none">
              {invoices.length}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <ReceiptText className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mt-1">No invoices yet</p>
          <p className="text-xs text-slate-400">Invoices created from this project&apos;s quotes show up here</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 px-3 pb-3">
          {invoices.map((invoice) => {
            const badge = invoiceStatusBadge(invoice.status)
            const label = `Invoice ${invoice.invoice_number}`
            const description = invoice.title && invoice.title !== label ? invoice.title : ""
            const hasBalance = invoice.balance_due > 0 && String(invoice.status).toUpperCase() !== "CANCELLED"

            return (
              <li key={invoice.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/${locale}/invoices/${invoice.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      router.push(`/${locale}/invoices/${invoice.id}`)
                    }
                  }}
                  className="group flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors">
                    <ReceiptText className="h-4 w-4" />
                  </div>

                  {/* Number + description + status */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">{label}</span>
                      {description && (
                        <span className="text-xs text-slate-400 truncate">{description}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border", badge)}>
                        {String(invoice.status).replace(/_/g, " ")}
                      </span>
                      {hasBalance && (
                        <span className="text-[10px] text-slate-400">
                          {fmt(invoice.balance_due)} due
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <span className="text-sm font-bold tabular-nums text-slate-900 shrink-0">
                    {fmt(invoice.total_amount)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
