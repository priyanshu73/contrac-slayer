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
import { formatPhoneForDisplay } from "@/lib/utils"
import { useLocale } from "next-intl"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { cleanAddressString } from "@/lib/format-address"

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

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
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
  const { toast } = useToast()
  const locale = useLocale()

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true)
      const id = parseInt(invoiceId)
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
  }, [invoiceId])

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
      const result = await api.sendInvoiceViaEmail(invoice.id)
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
            <Button variant="outline" asChild>
              <Link href={`/${locale}/invoices`}>Back to Invoices</Link>
            </Button>
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
  return (
    <div className="min-h-screen bg-gray-50 py-4 pb-24 sm:py-8 sm:pb-8 print:min-h-0 print:py-0 print:pb-0 print:bg-white print:mt-0 print:pt-0">
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
              <div className="inline-block print:hidden">
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

        {/* Line Items */}
        <div className="mb-4 sm:mb-6 print:mb-4 print:break-inside-avoid">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 sm:mb-3 print:mb-2">
            Line Items
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden print:border-gray-300 overflow-x-auto">
            <table className="w-full print:text-sm min-w-[300px] sm:min-w-[600px] md:min-w-0 print:min-w-0">
              <thead className="bg-gray-50 print:bg-gray-100">
                <tr>
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
                {(invoice.line_items || []).map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50 print:hover:bg-transparent print:break-inside-avoid">
                    <td className="px-2 py-2 sm:px-3 sm:py-3 print:px-2 print:py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base font-medium text-gray-900 print:text-sm break-words">
                          {item.description}
                        </p>
                      </div>
                      <div className="sm:hidden print:hidden flex flex-col mt-1 text-xs text-gray-600">
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
              <span className="text-base sm:text-lg font-bold text-gray-900">Total:</span>
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

        {invoice.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg print:bg-transparent print:p-0 print:border-none print:break-inside-avoid">
            <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</p>
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

      {/* Actions Sidebar - Far Right */}
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

              {/* Send to Client */}
              <Button
                size="lg"
                className="w-full justify-start h-12 text-base"
                variant="outline"
                onClick={handleSendEmail}
                disabled={sendingEmail}
              >
                <svg className="mr-3 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {sendingEmail ? "Sending…" : "Send to Client"}
              </Button>

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
      </div>

      {/* Record Payment Modal */}
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
    </div>
    </div>
  )
}
