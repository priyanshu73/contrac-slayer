"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useLocale } from "next-intl"
import { api } from "@/lib/api"
import type {
  ClientPortalData,
  ClientPortalQuoteItem,
  ClientPortalProposalItem,
  ClientPortalQuoteRequest,
  ClientPortalBooking,
  ClientPortalInvoice,
} from "@/lib/types"
import { Loader2, FileText, Receipt, ClipboardList, Calendar, CreditCard, ExternalLink, Mail, Phone, MapPin, Video, MapPinned } from "lucide-react"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtTime(date: string) {
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

function fmtMoney(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount)
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    SENT: "bg-blue-50 text-blue-700 border-blue-200",
    VIEWED: "bg-violet-50 text-violet-700 border-violet-200",
    ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    DRAFT: "bg-slate-100 text-slate-500 border-slate-200",
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    OVERDUE: "bg-rose-50 text-rose-700 border-rose-200",
    PARTIALLY_PAID: "bg-sky-50 text-sky-700 border-sky-200",
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
    COMPLETED: "bg-slate-100 text-slate-600 border-slate-200",
    NEW: "bg-blue-50 text-blue-700 border-blue-200",
    QUOTED: "bg-violet-50 text-violet-700 border-violet-200",
    CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }
  const colors = colorMap[status] ?? "bg-slate-50 text-slate-600 border-slate-200"
  const label = status.replace(/_/g, " ").charAt(0) + status.replace(/_/g, " ").slice(1).toLowerCase()
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${colors}`}>
      {label}
    </span>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-slate-400">{icon}</span>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</h2>
    </div>
  )
}

function ClientContactLine({
  icon,
  href,
  children,
  className,
}: {
  icon: React.ReactNode
  href?: string
  children: React.ReactNode
  className?: string
}) {
  const baseClassName = `flex items-center gap-2 text-sm text-slate-600 ${className ?? ""}`.trim()
  const content = (
    <>
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="break-words">{children}</span>
    </>
  )

  if (href) {
    return (
      <a href={href} className={`${baseClassName} hover:text-slate-900 transition-colors`}>
        {content}
      </a>
    )
  }

  return <div className={baseClassName}>{content}</div>
}

// ─── Section components ───────────────────────────────────────────────────────

function ProposalRow({ p, locale }: { p: ClientPortalProposalItem; locale: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="min-w-0 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-slate-500" />
        </div>
        <div className="min-w-0">
          {p.project_title && (
            <p className="text-sm font-semibold text-slate-900 truncate">{p.project_title}</p>
          )}
          <p className={`${p.project_title ? "mt-1" : ""} text-sm text-slate-500 truncate`}>{p.title || "Proposal"}</p>
          {p.updated_at && (
            <p className="text-[11px] text-slate-400 mt-0.5">Updated {fmt(p.updated_at)}</p>
          )}
        </div>
      </div>
      {p.public_link ? (
        <a
          href={`/${locale}/proposals/${p.public_link}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="shrink-0 text-xs text-slate-400 italic">Not yet available</span>
      )}
    </div>
  )
}

function QuoteRow({ q, locale }: { q: ClientPortalQuoteItem; locale: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="min-w-0">
        {q.project_title && (
          <p className="text-sm font-semibold text-slate-900 truncate">{q.project_title}</p>
        )}
        <p className={`${q.project_title ? "mt-1" : ""} text-sm text-slate-500 truncate`}>{q.title || "Quote"}</p>
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={q.status} />
          {q.estimated_total != null && (
            <span className="text-xs text-slate-500 font-medium">{fmtMoney(Number(q.estimated_total))}</span>
          )}
        </div>
      </div>
      {q.quote_public_link ? (
        <a
          href={`/${locale}/quotes/${q.quote_public_link}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="shrink-0 text-xs text-slate-400 italic">Not yet shared</span>
      )}
    </div>
  )
}

function QuoteRequestRow({ r }: { r: ClientPortalQuoteRequest }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm space-y-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{r.project_type || "Quote Request"}</p>
        <StatusBadge status={r.status} />
      </div>
      {r.description && (
        <p className="text-xs text-slate-500 line-clamp-2">{r.description}</p>
      )}
      <p className="text-[11px] text-slate-400">{fmt(r.created_at)}</p>
    </div>
  )
}

function BookingRow({ b }: { b: ClientPortalBooking }) {
  const isVirtual = b.booking_type?.toLowerCase() === "virtual"
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isVirtual
              ? <Video className="h-3.5 w-3.5 text-slate-400" />
              : <MapPinned className="h-3.5 w-3.5 text-slate-400" />}
            <p className="text-sm font-medium text-slate-900">{isVirtual ? "Virtual Meeting" : "On-site Visit"}</p>
          </div>
          <p className="text-xs text-slate-500">{fmtTime(b.start_time)}</p>
          {b.location && <p className="text-xs text-slate-400">{b.location}</p>}
          {b.google_meet_link && (
            <a href={b.google_meet_link} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              Join meeting <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <StatusBadge status={b.status} />
      </div>
    </div>
  )
}

function InvoiceRow({ inv, locale, token }: { inv: ClientPortalInvoice; locale: string; token: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{inv.title || `Invoice ${inv.invoice_number}`}</p>
          <p className="text-[11px] text-slate-400">#{inv.invoice_number}{inv.due_date ? ` · Due ${fmt(inv.due_date)}` : ""}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={inv.status} />
          <p className="text-sm font-semibold text-slate-900">{fmtMoney(Number(inv.total_amount))}</p>
          {Number(inv.balance_due) > 0 && inv.status !== "PAID" && (
            <p className="text-[11px] text-rose-500">{fmtMoney(Number(inv.balance_due))} due</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <a
          href={`/${locale}/invoices/${inv.id}/customer?token=${token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          View invoice <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const params = useParams()
  const locale = useLocale()
  const token = params.token as string
  const [portal, setPortal] = useState<ClientPortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const data = (await api.getClientPortal(token)) as ClientPortalData
        if (!cancelled) setPortal(data)
      } catch {
        if (!cancelled) setError("This link is invalid or has expired.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !portal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-slate-700 font-medium">{error ?? "Something went wrong."}</p>
          <p className="text-sm text-slate-400">Please contact your contractor for a new link.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {portal.contractor_logo_url && (
              <img
                src={portal.contractor_logo_url}
                alt={portal.contractor_name}
                className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0"
              />
            )}
            <div className="flex-1 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{portal.contractor_name}</p>
                <h1 className="text-xl font-semibold text-slate-900 leading-tight">{portal.project_title}</h1>
                {portal.project_description && (
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">{portal.project_description}</p>
                )}
              </div>
              {portal.client && (
                <div className="space-y-1 md:justify-self-end md:text-right">
                  {portal.client.email && (
                    <ClientContactLine
                      href={`mailto:${portal.client.email}`}
                      icon={<Mail className="h-4 w-4" />}
                      className="md:justify-end"
                    >
                      {portal.client.email}
                    </ClientContactLine>
                  )}
                  {portal.client.phone && (
                    <ClientContactLine
                      href={`tel:${portal.client.phone}`}
                      icon={<Phone className="h-4 w-4" />}
                      className="md:justify-end"
                    >
                      {portal.client.phone}
                    </ClientContactLine>
                  )}
                  {portal.client.address && (
                    <ClientContactLine icon={<MapPin className="h-4 w-4" />} className="md:justify-end">
                      {portal.client.address}
                    </ClientContactLine>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Proposals */}
        {portal.proposals.length > 0 && (
          <section>
            <SectionHeader icon={<FileText className="h-4 w-4" />} title="Proposal" />
            <div className="space-y-2">
              {portal.proposals.map((p) => <ProposalRow key={p.id} p={p} locale={locale} />)}
            </div>
            {portal.proposals.length === 1 && (
              <p className="mt-2 text-[11px] text-slate-400 px-1">Additional proposals may be shared as your project progresses.</p>
            )}
          </section>
        )}

        {/* Quotes */}
        {portal.quotes.length > 0 && (
          <section>
            <SectionHeader icon={<Receipt className="h-4 w-4" />} title="Quotes" />
            <div className="space-y-2">
              {portal.quotes.map((q) => <QuoteRow key={q.id} q={q} locale={locale} />)}
            </div>
          </section>
        )}

        {/* Quote requests */}
        {portal.quote_requests.length > 0 && (
          <section>
            <SectionHeader icon={<ClipboardList className="h-4 w-4" />} title="Quote Requests" />
            <div className="space-y-2">
              {portal.quote_requests.map((r) => <QuoteRequestRow key={r.id} r={r} />)}
            </div>
          </section>
        )}

        {/* Bookings */}
        {portal.bookings.length > 0 && (
          <section>
            <SectionHeader icon={<Calendar className="h-4 w-4" />} title="Appointments" />
            <div className="space-y-2">
              {portal.bookings.map((b) => <BookingRow key={b.id} b={b} />)}
            </div>
          </section>
        )}

        {/* Invoices */}
        {portal.invoices.length > 0 && (
          <section>
            <SectionHeader icon={<CreditCard className="h-4 w-4" />} title="Invoices" />
            <div className="space-y-2">
              {portal.invoices.map((inv) => <InvoiceRow key={inv.id} inv={inv} locale={locale} token={token} />)}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!portal.client &&
          portal.proposals.length === 0 &&
          portal.quotes.length === 0 &&
          portal.quote_requests.length === 0 &&
          portal.bookings.length === 0 &&
          portal.invoices.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-slate-500 text-sm">No documents have been shared yet.</p>
            <p className="text-slate-400 text-xs mt-1">Check back later or contact your contractor.</p>
          </div>
        )}
      </div>
    </div>
  )
}
