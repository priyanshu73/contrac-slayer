"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { formatPhoneForDisplay, cn } from "@/lib/utils"
import { useLocale } from "next-intl"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cleanAddressString } from "@/lib/format-address"
import { ChevronDown, Send, Mail, MessageSquare, Link2, Check, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { ClientSendSmsDialog } from "@/components/client-send-sms-dialog"
import { ClientDocumentNav, clientDocumentNavContentClassName } from "@/components/client-document-nav"
import { useClientPortalDocuments } from "@/hooks/use-client-portal-documents"
import { buildClientDocumentNavProps } from "@/lib/client-portal-nav"

/** "progress_payment" -> "Progress Payment". Empty/unknown -> "". */
const formatCategory = (category?: string | null) =>
  (category || "")
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")

const DRAW_CATEGORIES = ["deposit", "progress_payment"]

/** Render a draw line like "Deposit (30% of contract)" as "...of quote" with the
 * word "quote" linked to `quoteHref`. Normalizes legacy "contract" wording too.
 * Falls back to plain (relabeled) text when there's no quote link. */
function renderDrawDescription(description: string, quoteHref?: string) {
  const m = description.match(/\b(contract|quote)\b/i)
  if (quoteHref && m && m.index !== undefined) {
    return (
      <>
        {description.slice(0, m.index)}
        <Link href={quoteHref} className="text-sky-700 underline underline-offset-2 hover:text-sky-900 print:no-underline print:text-gray-900">
          quote
        </Link>
        {description.slice(m.index + m[0].length)}
      </>
    )
  }
  return description.replace(/\b(contract|quote)\b/gi, "quote")
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "ONLINE_PAYMENT", label: "Online Payment" },
  { value: "OTHER", label: "Other" },
]

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
]

export function InvoiceDetail({ invoiceId, publicLink }: { invoiceId?: string; publicLink?: string }) {
  // A public link means the read-only client view: fetch via the public endpoint
  // (which carries the portal token in its payload) and hide contractor actions.
  const publicMode = !!publicLink
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [paymentRef, setPaymentRef] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [lineItemsOpen, setLineItemsOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [showSmsDialog, setShowSmsDialog] = useState(false)
  const { toast } = useToast()
  const { getContractorAISpId } = useAuth()
  const locale = useLocale()
  // In the public view the portal token rides along in the invoice payload, so
  // the sidebar (sibling quote + proposal + "My Portal") is driven by the same
  // source of truth as the quote/proposal viewers — never from the URL.
  const portalToken: string | undefined = invoice?.client_portal_token
  const portalDocuments = useClientPortalDocuments(publicMode ? portalToken ?? null : null)

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true)
      if (publicLink) {
        const data = await api.getInvoiceByPublicLink(publicLink)
        setInvoice(data)
        return
      }
      const id = parseInt(invoiceId ?? "")
      if (isNaN(id)) {
        setInvoice(null)
        return
      }
      const data = await api.getInvoiceDetail(id)
      setInvoice(data)
    } catch (err) {
      console.error("Failed to load invoice:", err)
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }, [invoiceId, publicLink])

  useEffect(() => {
    fetchInvoice()
  }, [fetchInvoice])

  const handleRecordPayment = async () => {
    if (!invoice) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid payment amount.", variant: "destructive" })
      return
    }
    setRecordingPayment(true)
    try {
      const result = await api.recordInvoicePayment(invoice.id, {
        amount,
        payment_method: paymentMethod,
        reference_number: paymentRef || undefined,
        notes: paymentNotes || undefined,
      })
      toast({
        title: "Payment recorded",
        description: result.message || `Payment of $${amount.toFixed(2)} recorded.`,
      })
      setShowPaymentModal(false)
      setPaymentAmount("")
      setPaymentRef("")
      setPaymentNotes("")
      await fetchInvoice()
    } catch (err: any) {
      toast({
        title: "Failed to record payment",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setRecordingPayment(false)
    }
  }

  const handleSendEmail = async () => {
    if (!invoice) return
    setSendingEmail(true)
    try {
      const base = typeof window !== "undefined" ? `${window.location.origin}/${locale}` : undefined
      const result = await api.sendInvoiceViaEmail(invoice.id, base)
      toast({ title: "Invoice sent", description: result.message })
      await fetchInvoice()
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: err?.message || "Make sure Gmail is connected in Settings.",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const buildInvoiceUrl = (publicLinkValue: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/invoices/${publicLinkValue}`

  const handleCopyInvoiceLink = async () => {
    if (!invoice) return
    setGeneratingLink(true)
    try {
      let link: string = invoice.public_link
      if (!link) {
        const res = await api.ensureInvoicePublicLink(invoice.id)
        link = res.public_link
        setInvoice((prev: any) => (prev ? { ...prev, public_link: link } : prev))
      }
      await navigator.clipboard.writeText(buildInvoiceUrl(link))
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err: any) {
      toast({ title: "Couldn't copy link", description: err?.message, variant: "destructive" })
    } finally {
      setGeneratingLink(false)
    }
  }

  const handleOpenSms = async () => {
    if (!invoice) return
    if (!invoice.public_link) {
      try {
        const res = await api.ensureInvoicePublicLink(invoice.id)
        setInvoice((prev: any) => (prev ? { ...prev, public_link: res.public_link } : prev))
      } catch {
        // proceed even if link generation fails; message just omits the link
      }
    }
    setShowSmsDialog(true)
  }

  const smsPresetMessage = invoice
    ? `Hi ${invoice.client_name || "there"}, here's your invoice${invoice.contractor_company_name ? ` from ${invoice.contractor_company_name}` : ""}${invoice.public_link ? `: ${buildInvoiceUrl(invoice.public_link)}` : "."}`
    : ""

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return
    setUpdatingStatus(true)
    try {
      await api.updateInvoiceStatus(invoice.id, newStatus)
      toast({ title: "Status updated", description: `Invoice marked as ${newStatus}.` })
      await fetchInvoice()
    } catch (err: any) {
      toast({
        title: "Failed to update status",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-32 bg-muted rounded"></div>
      </Card>
    )
  }

  if (!invoice) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-muted p-6">
            <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">Invoice not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The invoice you&apos;re looking for doesn&apos;t exist or hasn&apos;t been created yet.
            </p>
            {!publicMode && (
              <Button variant="outline" asChild>
                <Link href={`/${locale}/invoices`}>Back to Invoices</Link>
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PAID":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
      case "SENT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "DRAFT":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
      case "OVERDUE":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "PARTIALLY_PAID":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
      case "CANCELLED":
        return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  // A draw invoice charges a % of the contract — its own line_items are just the
  // draw. Show the quote's real scope (quote_items) as the collapsible Line Items,
  // and the draw charge as a separate line below. Lump-sum invoices use their own
  // line_items as the scope.
  const ownLines = invoice.line_items || []
  const drawLine =
    ownLines.length === 1 && DRAW_CATEGORIES.includes(ownLines[0]?.category)
      ? ownLines[0]
      : null
  const isDraw = !!drawLine
  const scopeItems = isDraw ? (invoice.quote_items || []) : ownLines

  // Where the "quote" word links: the client view uses the quote's public link,
  // the contractor view the internal quote page.
  const quoteHref = publicMode
    ? (invoice.quote_public_link ? `/${locale}/quotes/${invoice.quote_public_link}` : undefined)
    : (invoice.job_id ? `/${locale}/quotes/${invoice.job_id}` : undefined)

  const navProps = buildClientDocumentNavProps({
    locale,
    portalToken,
    activeView: "invoice",
    documents: portalDocuments,
    preferred: {
      // Point the quote item at this invoice's originating quote when known.
      quotePublicLink: invoice.quote_public_link,
      invoicePublicLink: invoice.public_link,
    },
  })

  return (
    <>
    {publicMode && (
      <ClientDocumentNav
        locale={locale}
        portalToken={portalToken}
        activeView="invoice"
        {...navProps}
      />
    )}
    <div className={cn("min-h-screen bg-gray-50 py-4 pb-24 sm:py-8 sm:pb-8 print:min-h-0 print:py-0 print:pb-0 print:bg-white print:mt-0 print:pt-0", publicMode && clientDocumentNavContentClassName() + " print:ml-0 print:mt-0")}>
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:pl-6 lg:pr-8 xl:pl-8 xl:pr-12 print:max-w-full print:px-0 print:mx-0 print:mt-0 print:pt-0">
        {/* Layout: Invoice centered, Actions on far right */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8 xl:gap-12 print:flex-col print:gap-0">
          {/* Invoice Content - Centered */}
          <div className="w-full lg:flex-1 lg:max-w-[900px] lg:min-w-0 lg:mx-auto print:max-w-full">
      <Card className="bg-white shadow-lg print:shadow-none print:border-none print:rounded-none print:m-0 print:mt-0 print:pt-0 p-4 sm:p-6 md:p-8 lg:p-12 print:p-6 print:break-inside-avoid print:pt-6">
        {/* Header with Logo */}
        <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 print:mb-4 print:pb-2 border-b-2 border-gray-200 print:break-inside-avoid">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 print:gap-2">
            <div className="flex items-center gap-3 sm:gap-4 print:gap-2">
              {invoice.contractor_logo_url ? (
                <div className="relative w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 print:w-12 print:h-12 rounded-lg overflow-hidden border-2 border-gray-200 print:border-gray-300">
                  <Image
                    src={invoice.contractor_logo_url}
                    alt={invoice.contractor_company_name || "Company Logo"}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 print:w-12 print:h-12 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                  <span className="text-lg sm:text-2xl md:text-3xl print:text-lg font-bold text-white">
                    {(invoice.contractor_company_name || "I")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-lg sm:text-2xl md:text-3xl print:text-xl font-bold text-gray-900">
                  {invoice.contractor_company_name || "Invoice"}
                </h1>
                <p className="text-xs sm:text-sm print:text-xs text-gray-600 mt-0.5 sm:mt-1">
                  {cleanAddressString(invoice.contractor_address) || ""}
                </p>
                {invoice.contractor_phone && (
                  <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                    {formatPhoneForDisplay(invoice.contractor_phone)}
                  </p>
                )}
                {invoice.contractor_email && (
                  <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                    {invoice.contractor_email}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg sm:text-xl md:text-2xl print:text-lg font-bold text-gray-900 mb-1 sm:mb-2">INVOICE</h2>
              <p className="text-xs sm:text-sm print:text-xs text-gray-600 font-medium">#{invoice.invoice_number}</p>
              <p className="text-xs sm:text-sm print:text-xs text-gray-500">{formatDate(invoice.issue_date)}</p>
              <div className="inline-block mt-1.5 print:hidden">
                <Badge className={`${getStatusColor(invoice.status)} text-xs print:text-xs border-0`}>
                  {invoice.status?.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="mb-4 sm:mb-6 print:mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 print:gap-3 print:break-inside-avoid">
          <div>
            <div className="space-y-0.5 print:space-y-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 print:text-[10px]">Bill To</p>
              <p className="text-base sm:text-lg print:text-base font-semibold text-gray-900">
                {invoice.client_name || 'Unknown Client'}
              </p>
              {invoice.client_address && (
                <p className="text-xs sm:text-sm print:text-xs text-gray-600 whitespace-pre-line">
                  {cleanAddressString(invoice.client_address)}
                </p>
              )}
              {invoice.client_email && (
                <p className="text-xs sm:text-sm print:text-xs text-gray-600">{invoice.client_email}</p>
              )}
              {invoice.client_phone && (
                <p className="text-xs sm:text-sm print:text-xs text-gray-600">{formatPhoneForDisplay(invoice.client_phone)}</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm print:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 sm:mb-2 print:mb-1">
              Invoice Details
            </h3>
            <div className="space-y-0.5 print:space-y-0">
              <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                <span className="font-medium">Invoice #:</span> {invoice.invoice_number}
              </p>
              <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                <span className="font-medium">Issue Date:</span> {formatDate(invoice.issue_date)}
              </p>
              <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                <span className="font-medium">Due Date:</span> {formatDate(invoice.due_date)}
              </p>
              {invoice.payment_terms && (
                <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                  <span className="font-medium">Terms:</span> {invoice.payment_terms}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Project / Scope section intentionally removed — neither the payment
            label nor the project name/description is shown on the invoice. */}

        {/* Line Items (the quote scope — collapsed by default, forced open in print) */}
        {scopeItems.length > 0 && (
          <div className="mb-4 sm:mb-6 print:mb-4 print:break-inside-avoid">
            <button
              type="button"
              onClick={() => setLineItemsOpen((o) => !o)}
              className="flex w-full items-center gap-1.5 mb-2 sm:mb-3 print:mb-2 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-700 uppercase tracking-wide print:hidden"
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", lineItemsOpen && "rotate-180")} />
              Line Items ({scopeItems.length})
            </button>
            <h3 className="hidden print:block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Line Items
            </h3>
            <div className={cn("border border-gray-200 rounded-lg overflow-hidden print:border-gray-300 overflow-x-auto", lineItemsOpen ? "block" : "hidden print:block")}>
              <table className="w-full print:text-sm min-w-[300px] sm:min-w-[640px] md:min-w-0 print:min-w-0">
                <thead className="bg-gray-50 print:bg-gray-100">
                  <tr>
                    <th className="hidden sm:table-cell print:table-cell px-2 py-1.5 sm:px-3 sm:py-2 print:px-2 print:py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Category
                    </th>
                    <th className="px-2 py-1.5 sm:px-3 sm:py-2 print:px-2 print:py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="hidden sm:table-cell print:table-cell px-2 py-1.5 sm:px-3 sm:py-2 print:px-2 print:py-1 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Qty
                    </th>
                    <th className="hidden sm:table-cell print:table-cell px-2 py-1.5 sm:px-3 sm:py-2 print:px-2 print:py-1 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Rate
                    </th>
                    <th className="px-2 py-1.5 sm:px-3 sm:py-2 print:px-2 print:py-1 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-300">
                  {scopeItems.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50 print:hover:bg-transparent print:break-inside-avoid">
                      <td className="hidden sm:table-cell print:table-cell px-2 py-2 sm:px-3 sm:py-3 print:px-2 print:py-2 text-xs sm:text-sm text-gray-500 capitalize print:text-xs whitespace-nowrap">
                        {formatCategory(item.category) || "—"}
                      </td>
                      <td className="px-2 py-2 sm:px-3 sm:py-3 print:px-2 print:py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm sm:text-base font-medium text-gray-900 print:text-sm break-words">
                            {item.description}
                          </p>
                        </div>
                        <div className="sm:hidden print:hidden flex flex-col mt-1 text-xs text-gray-600">
                          {item.category && <span>{formatCategory(item.category)}</span>}
                          <span>QTY: {item.quantity} {item.unit_of_measure}</span>
                          <span>{formatCurrency(item.unit_price)} each</span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell print:table-cell px-2 py-2 sm:px-3 sm:py-3 print:px-2 print:py-2 text-right text-xs sm:text-sm text-gray-600 print:text-xs whitespace-nowrap">
                        {item.quantity} {item.unit_of_measure}
                      </td>
                      <td className="hidden sm:table-cell print:table-cell px-2 py-2 sm:px-3 sm:py-3 print:px-2 print:py-2 text-right text-xs sm:text-sm text-gray-600 print:text-xs whitespace-nowrap">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-2 py-2 sm:px-3 sm:py-3 print:px-2 print:py-2 text-right text-xs sm:text-sm font-semibold text-gray-900 print:text-sm whitespace-nowrap">
                        {formatCurrency(item.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Draw charge — what this invoice actually bills (a % of the contract) */}
        {isDraw && (
          <div className="mb-4 sm:mb-6 print:mb-4 print:break-inside-avoid rounded-lg border border-sky-200 bg-sky-50/50 print:bg-transparent px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-semibold text-sky-700 uppercase tracking-wide">This invoice bills</p>
                <p className="text-sm sm:text-base font-semibold text-gray-900 break-words">
                  {renderDrawDescription(drawLine.description, quoteHref)}
                </p>
              </div>
              <span className="shrink-0 text-base sm:text-lg font-bold text-gray-900 tabular-nums">
                {formatCurrency(drawLine.total_amount)}
              </span>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="mb-4 sm:mb-6 print:mb-4 print:break-inside-avoid">
          <div className="ml-auto flex flex-col md:w-1/2 lg:w-1/3 xl:w-1/4 min-w-[250px] space-y-0.5 sm:space-y-1 print:space-y-0.5">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-900 font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Tax ({invoice.tax_rate}%):</span>
                <span className="text-gray-900">{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="text-emerald-600 font-medium">-{formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 sm:pt-2 border-t-2 border-gray-300">
              <span className="text-base sm:text-lg font-bold text-gray-900">Grand Total:</span>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</span>
            </div>
            
            {invoice.amount_paid > 0 && (
              <>
                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="text-emerald-600 font-medium">Amount Paid:</span>
                  <span className="text-emerald-600 font-medium">-{formatCurrency(invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 sm:pt-2 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Balance Due:</span>
                  <span className={`text-xl font-bold ${invoice.balance_due <= 0 ? 'text-emerald-600' : 'text-primary'}`}>
                    {formatCurrency(invoice.balance_due)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment terms / Terms & conditions / Notes */}
        {(invoice.terms_and_conditions || invoice.notes) && (
          <div className="mt-5 sm:mt-6 print:mt-4 pt-4 border-t border-gray-200 space-y-3 print:break-inside-avoid">
            {invoice.terms_and_conditions && (
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase mb-1">Terms &amp; Conditions</p>
                <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-line">{invoice.terms_and_conditions}</p>
              </div>
            )}
            {invoice.notes && (
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase mb-1">Notes</p>
                <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mt-4 sm:mt-8 print:mt-4 pt-4 sm:pt-6 print:pt-3 border-t-2 border-gray-300 print:break-inside-avoid">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 sm:mb-3">
              Payment History
            </h3>
            <div className="space-y-2 sm:space-y-3 print:space-y-2">
              {invoice.payments.map((payment: any) => (
                <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-gray-50 print:bg-transparent print:p-0 border border-gray-100 print:border-none print:border-b print:border-gray-200 print:pb-2 print:rounded-none">
                  <div>
                    <p className="font-semibold text-emerald-600 text-base sm:text-lg print:text-emerald-700">
                      +{formatCurrency(payment.amount)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 print:mt-0 pt-0.5">
                      <span className="text-xs sm:text-sm text-gray-700 font-medium tracking-wide">
                        {payment.payment_method?.replace("_", " ")}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs sm:text-sm text-gray-500">
                        {formatDate(payment.payment_date)}
                      </span>
                      {payment.reference_number && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            Ref: {payment.reference_number}
                          </span>
                        </>
                      )}
                    </div>
                    {payment.notes && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 italic print:mt-0.5">
                        "{payment.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      </div>

      {/* Actions Sidebar - Far Right (contractor only) */}
      {!publicMode && (
      <div className="w-full lg:w-72 xl:w-80 lg:flex-shrink-0 print:hidden">
        <div className="lg:sticky lg:top-8 space-y-4">
          <Card className="bg-white shadow-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="flex flex-col gap-3">

              {/* Record Payment */}
              {!["PAID", "CANCELLED"].includes(invoice.status?.toUpperCase()) && (
                <Button
                  size="lg"
                  className="w-full justify-start h-12 text-base"
                  onClick={() => {
                    setPaymentAmount(invoice.balance_due > 0 ? invoice.balance_due.toFixed(2) : "")
                    setShowPaymentModal(true)
                  }}
                >
                  <svg className="mr-3 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  Record Payment
                </Button>
              )}

              {/* Send to Client — Email / SMS / Copy link */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="lg"
                    className="w-full justify-start h-12 text-base"
                    variant="outline"
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? (
                      <Loader2 className="mr-3 h-5 w-5 shrink-0 animate-spin" />
                    ) : (
                      <Send className="mr-3 h-5 w-5 shrink-0" />
                    )}
                    {sendingEmail ? "Sending…" : "Send to Client"}
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onClick={handleSendEmail}
                    disabled={sendingEmail || !invoice.client_email}
                  >
                    <Mail className="mr-2 h-4 w-4 text-slate-500" />
                    Send via Email
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleOpenSms}
                    disabled={!invoice.client_phone || !getContractorAISpId()}
                  >
                    <MessageSquare className="mr-2 h-4 w-4 text-slate-500" />
                    Send via SMS
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCopyInvoiceLink} disabled={generatingLink}>
                    {copiedLink ? (
                      <Check className="mr-2 h-4 w-4 text-emerald-600" />
                    ) : generatingLink ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="mr-2 h-4 w-4 text-slate-500" />
                    )}
                    {copiedLink ? "Copied!" : "Copy invoice link"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Print */}
              <Button
                size="lg"
                className="w-full justify-start h-12 text-base"
                variant="outline"
                onClick={handlePrint}
              >
                <svg className="mr-3 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print PDF
              </Button>

              {/* View Quote */}
              {invoice.job_id && (
                <Button
                  size="lg"
                  className="w-full justify-start h-12 text-base"
                  variant="outline"
                  asChild
                >
                  <Link href={`/${locale}/quotes/${invoice.job_id}`}>
                    <svg className="mr-3 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Quote
                  </Link>
                </Button>
              )}
            </div>
          </Card>

          {/* Status Card */}
          <Card className="bg-white shadow-lg p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Change Status</h3>
            <Select
              value={invoice.status}
              onValueChange={(val) => handleStatusChange(val)}
              disabled={updatingStatus}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Change Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        </div>
      </div>
      )}
      </div>

      {/* Record Payment Modal (contractor only) */}
      {!publicMode && (
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-lg font-semibold">Record Payment</DialogTitle>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Balance due: <strong className="text-foreground">{formatCurrency(invoice.balance_due)}</strong>
            </p>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-ref">Reference Number (optional)</Label>
              <Input
                id="payment-ref"
                placeholder="e.g. Check #1234"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (optional)</Label>
              <Input
                id="payment-notes"
                placeholder="e.g. Partial payment for materials"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleRecordPayment}
                disabled={recordingPayment}
              >
                {recordingPayment ? "Recording…" : "Record Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {!publicMode && invoice && getContractorAISpId() && invoice.client_phone && (
        <ClientSendSmsDialog
          key={invoice.public_link || "no-link"}
          open={showSmsDialog}
          onOpenChange={setShowSmsDialog}
          spId={getContractorAISpId() as number}
          clientName={invoice.client_name || ""}
          clientPhone={invoice.client_phone}
          clientId={invoice.client_id}
          presetMessage={smsPresetMessage}
        />
      )}
    </div>
    </div>
    </>
  )
}
