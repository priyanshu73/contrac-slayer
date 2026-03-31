"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog"
import { Check, ExternalLink } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { formatPhoneForDisplay } from "@/lib/utils"
import { cleanAddressString } from "@/lib/format-address"
import Image from "next/image"
import { ContractorProfile, ContractorInfo, Job, JobItem, JobSignature, JobStatus, LaborChargeType } from "@/lib/types"
import { SignatureCapture } from "@/components/signature-capture"
import { useIsMobile } from "@/hooks/use-mobile"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { useTranslations } from "next-intl"

interface PersonalizedQuoteViewProps {
  job: Job
  showActions?: boolean
  onEdit?: () => void
  onSendToClient?: () => void
  /** When true, Send to client button is disabled (e.g. Gmail not connected) */
  sendToClientDisabled?: boolean
  onSendViaSms?: () => void
  /** When true, Send via SMS option is disabled (e.g. no Contractor AI, no client phone, or no public link) */
  sendViaSmsDisabled?: boolean
  /** When set, show success message beside dropdown: "SMS sent successfully to {name}" (green tick, slide-in) */
  smsSentSuccessTo?: string | null
  /** Callback when user submits follow-up: (sendSms, sendEmail) */
  onSendFollowupSubmit?: (sendSms: boolean, sendEmail: boolean) => void
  followupSending?: boolean
  gmailConnected?: boolean
  /** QuickBooks OAuth connected (from GET /quickbooks/status). Used to gate "Open in QuickBooks". */
  qboConnected?: boolean
  onCreateInvoice?: () => void
  onSendInvoiceEmail?: () => void
  sendingInvoiceEmail?: boolean
  onCreateChangeOrder?: () => void
  onSignatureUpdate?: () => void
  onStatusUpdate?: () => void
  /** Change orders for this quote (when viewing root job as contractor) */
  changeOrders?: Job[]
  /** Revised contract amount (original + approved COs) */
  revisedContractAmount?: { original_amount: number; approved_change_orders_total: number; revised_amount: number }
  isContractor?: boolean  // If true, hide customer signature button
  isPublicView?: boolean  // If true, this is a public customer view
  /** Hide project description (e.g. when viewing quote by id/uuid to avoid exposing prompt text) */
  hideProjectDescription?: boolean
}

const QUOTE_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "IN_PROGRESS", label: "Job In Progress" },
  { value: "COMPLETED", label: "Job Completed" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
]

export function PersonalizedQuoteView({
  job,
  showActions = true,
  onEdit,
  onSendToClient,
  sendToClientDisabled = false,
  onSendViaSms,
  sendViaSmsDisabled = true,
  smsSentSuccessTo = null,
  onSendFollowupSubmit,
  followupSending = false,
  gmailConnected = false,
  qboConnected = false,
  onCreateInvoice,
  onSendInvoiceEmail,
  sendingInvoiceEmail = false,
  onCreateChangeOrder,
  onSignatureUpdate,
  onStatusUpdate,
  changeOrders = [],
  revisedContractAmount,
  isContractor = false,
  isPublicView = false,
  hideProjectDescription = false,
}: PersonalizedQuoteViewProps) {
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const t = useTranslations("quotes")
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [contractorProfile, setContractorProfile] = useState<ContractorProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [showContractorSignature, setShowContractorSignature] = useState(false)
  const [showCustomerSignature, setShowCustomerSignature] = useState(false)
  const [signingInProgress, setSigningInProgress] = useState(false)
  const [currentJob, setCurrentJob] = useState<Job>(job)
  const [copiedLink, setCopiedLink] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [followupSendSms, setFollowupSendSms] = useState(true)
  const [followupSendEmail, setFollowupSendEmail] = useState(true)
  // Only force email off when Gmail disconnects; don't overwrite when user unchecks
  useEffect(() => {
    if (!gmailConnected) setFollowupSendEmail(false)
  }, [gmailConnected])

  // Sync currentJob with job prop when it changes
  useEffect(() => {
    setCurrentJob(job)
  }, [job])

  useEffect(() => {
    // For public customer views, use contractor info from job if available
    if (isPublicView || !isContractor) {
      if (job.contractor) {
        // Convert ContractorInfo to ContractorProfile format for compatibility
        const contractorFromJob: ContractorProfile = {
          id: job.contractor.id,
          uuid: (job.contractor as ContractorInfo & { uuid?: string }).uuid ?? "",
          user_id: 0, // Not needed for display
          company_name: job.contractor.company_name,
          email: job.contractor.email,
          phone_number: job.contractor.phone_number,
          address: job.contractor.address,
          logo_url: job.contractor.logo_url,
          website_url: job.contractor.website_url,
          default_markup_percentage: 0,
          default_sales_tax_rate: 0,
          low_tier_markup: 0,
          mid_tier_markup: 0,
          high_tier_markup: 0,
          default_labor_charge_type: LaborChargeType.HOURLY,
          default_labor_rate_value: 0,
          created_at: "",
        }
        setContractorProfile(contractorFromJob)
      }
      setLoadingProfile(false)
      return
    }

    fetchContractorProfile()
    fetchJobSignature()
  }, [job.id, job.contractor, isContractor, isPublicView])

  const fetchContractorProfile = async () => {
    try {
      setLoadingProfile(true)
      const profile = await api.getMyProfile()
      setContractorProfile(profile as ContractorProfile)
    } catch (error) {
      console.error("Failed to fetch contractor profile:", error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const fetchJobSignature = async () => {
    try {
      const signature = await api.getQuoteSignature(job.id)
      setCurrentJob(prev => ({
        ...prev,
        signature: signature as JobSignature
      }))
    } catch (error) {
      // Signature might not exist yet, that's okay
      console.log("No signature found for this quote")
    }
  }

  const handleContractorSignatureComplete = async (signatureData: string) => {
    try {
      setSigningInProgress(true)
      const totalAmount = currentJob.total_amount?.toString() || "0"
      const signatureResponse = await api.signQuoteAsContractor(job.id, {
        signature_data: signatureData,
        signer_name: contractorProfile?.company_name || "Contractor",
        signer_email: contractorProfile?.email,
        accepted_terms: true,
        accepted_total_amount: totalAmount,
      })

      // Update local job with new signature and keep status in sync
      setCurrentJob(prev => ({
        ...(prev as Job),
        signature: signatureResponse as JobSignature,
      }))

      setShowContractorSignature(false)
      if (onSignatureUpdate) {
        onSignatureUpdate()
      }
    } catch (error) {
      console.error("Failed to sign as contractor:", error)
      alert("Failed to save signature. Please try again.")
    } finally {
      setSigningInProgress(false)
    }
  }

  const handleCustomerSignatureComplete = async (signatureData: string) => {
    try {
      setSigningInProgress(true)
      const totalAmount = currentJob.total_amount?.toString() || "0"
      const signatureResponse = await api.signQuoteAsCustomer(job.id, {
        signature_data: signatureData,
        signer_name: currentJob.client?.name || "Customer",
        signer_email: currentJob.client?.email,
        accepted_terms: true,
        accepted_total_amount: totalAmount,
      })

      // Update local job with new signature and mark as accepted
      const sigResponse = signatureResponse as JobSignature & { accepted_total_amount?: string }
      setCurrentJob(prev => ({
        ...(prev as Job),
        signature: sigResponse,
        status: JobStatus.ACCEPTED,
        accepted_total_amount: Number(
          sigResponse.accepted_total_amount ||
          prev.accepted_total_amount ||
          prev.total_amount ||
          0
        ),
      }))

      setShowCustomerSignature(false)
      if (onSignatureUpdate) {
        onSignatureUpdate()
      }
    } catch (error) {
      console.error("Failed to sign as customer:", error)
      alert("Failed to save signature. Please try again.")
    } finally {
      setSigningInProgress(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    // Check if it's a date-only string (YYYY-MM-DD) to avoid timezone issues
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString)

    if (isDateOnly) {
      // Parse as local date to avoid timezone shift
      const [year, month, day] = dateString.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-amber-500/15 text-amber-600'
      case 'sent': return 'bg-blue-500/15 text-blue-600'
      case 'viewed': return 'bg-purple-500/15 text-purple-600'
      case 'accepted': return 'bg-emerald-500/15 text-emerald-600'
      case 'rejected': return 'bg-red-500/15 text-red-600'
      case 'in_progress': return 'bg-sky-500/15 text-sky-600'
      case 'completed': return 'bg-teal-500/15 text-teal-600'
      case 'invoiced': return 'bg-indigo-500/15 text-indigo-600'
      case 'paid': return 'bg-emerald-500/15 text-emerald-600'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const total = currentJob.total_amount || 0

  // Calculate breakdown - handle both interface and API response formats
  const baseSubtotal = (currentJob.items || []).reduce(
    (sum, item: any) => {
      const costPerUnit = item.cost_per_unit || item.costPerUnit || item.rate || 0
      return sum + (item.quantity * costPerUnit)
    },
    0
  )
  const markupAmount = (currentJob.items || []).reduce((sum, item: any) => {
    const costPerUnit = item.cost_per_unit || item.costPerUnit || item.rate || 0
    const markupPercentage = item.markup_percentage || item.markupPercentage || 0
    const itemBase = item.quantity * costPerUnit
    return sum + (itemBase * markupPercentage / 100)
  }, 0)
  const subtotalWithMarkup = baseSubtotal + markupAmount
  const taxAmount = total - subtotalWithMarkup

  const handleGeneratePublicLink = async () => {
    if (!isContractor) return

    try {
      setGeneratingLink(true)
      const link = await api.generateQuotePublicLink(currentJob.id)
      setCurrentJob(prev => prev ? { ...prev, quote_public_link: link } : prev)
      toast({
        title: "Public Link Generated!",
        description: "Quote is now ready to share with your customer.",
      })
    } catch (error: any) {
      toast({
        title: "Failed to generate link",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setGeneratingLink(false)
    }
  }

  const quoteSignedByCustomer = Boolean(currentJob.signature?.customer_signed_at)
  const statusRequiresSignedQuote = (status: string) =>
    status === "ACCEPTED" || status === "IN_PROGRESS" || status === "COMPLETED" || status === "PAID"

  const handleStatusChange = async (newStatus: string) => {
    if (statusRequiresSignedQuote(newStatus) && !quoteSignedByCustomer) {
      toast({
        title: "Quote not signed",
        description: "The customer must sign the quote before you can change the status to Accepted, Job In Progress, Job Completed, or Paid.",
        variant: "destructive",
      })
      return
    }
    try {
      setUpdatingStatus(true)
      await api.updateJob(currentJob.id, { status: newStatus })
      const option = QUOTE_STATUS_OPTIONS.find((o) => o.value === newStatus)
      setCurrentJob((prev) => ({ ...prev, status: newStatus as JobStatus }))
      toast({ title: "Status updated", description: `Quote status set to ${option?.label ?? newStatus}.` })
      onStatusUpdate?.()
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to update status.", variant: "destructive" })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleCopyQuoteLink = async () => {
    const publicLink = currentJob.quote_public_link
    if (!publicLink) {
      // Generate link first if it doesn't exist
      await handleGeneratePublicLink()
      return
    }

    const frontendUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const fullUrl = `${frontendUrl}/quotes/${publicLink}`

    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedLink(true)
      toast({
        title: "Link Copied!",
        description: "Quote link has been copied to your clipboard.",
      })
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again or copy manually.",
        variant: "destructive",
      })
    }
  }

  const getQuoteLinkUrl = () => {
    const publicLink = currentJob.quote_public_link
    if (!publicLink) return null
    const frontendUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${frontendUrl}/quotes/${publicLink}`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 pb-24 sm:py-8 sm:pb-8 print:min-h-0 print:py-0 print:pb-0 print:bg-white print:mt-0 print:pt-0">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:pl-6 lg:pr-8 xl:pl-8 xl:pr-12 print:max-w-full print:px-0 print:mx-0 print:mt-0 print:pt-0">
        {/* Layout: Quote centered, Actions on far right */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8 xl:gap-12 print:flex-col print:gap-0">
          {/* Quote Content - Centered */}
          <div className="w-full lg:flex-1 lg:max-w-[900px] lg:min-w-0 lg:mx-auto print:max-w-full">
            {/* Created from / Parent quote banner - when viewing a change order */}
            {isContractor && !isPublicView && currentJob.created_from_job_id && (
              <div className="mb-4 print:hidden">
                <Link
                  href={`/quotes/${currentJob.created_from_job_id}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 text-sm"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Change order to Quote #{currentJob.created_from_job_id}
                </Link>
              </div>
            )}
            {/* Printable Quote Document */}
            <Card className="bg-white shadow-lg print:shadow-none print:border-none print:rounded-none print:m-0 print:mt-0 print:pt-0">
              <div className="p-4 sm:p-6 md:p-8 lg:p-12 print:p-6 print:break-inside-avoid print:pt-6">
                {/* Header with Logo */}
                <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 print:mb-4 print:pb-2 border-b-2 border-gray-200 print:break-inside-avoid">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 print:gap-2">
                    <div className="flex items-center gap-3 sm:gap-4 print:gap-2">
                      {loadingProfile ? (
                        <div className="w-12 h-12 sm:w-20 sm:h-20 print:w-12 print:h-12 bg-gray-200 rounded-lg animate-pulse" />
                      ) : contractorProfile?.logo_url ? (
                        <div className="relative w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 print:w-12 print:h-12 rounded-lg overflow-hidden border-2 border-gray-200 print:border-gray-300">
                          <Image
                            src={contractorProfile.logo_url}
                            alt={contractorProfile.company_name || "Company Logo"}
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
                            {(contractorProfile?.company_name || "C")[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h1 className="text-lg sm:text-2xl md:text-3xl print:text-xl font-bold text-gray-900">
                          {contractorProfile?.company_name || "Quote"}
                        </h1>
                        <p className="text-xs sm:text-sm print:text-xs text-gray-600 mt-0.5 sm:mt-1">
                          {cleanAddressString(contractorProfile?.address) || ""}
                        </p>
                        {contractorProfile?.phone_number && (
                          <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                            {formatPhoneForDisplay(contractorProfile.phone_number)}
                          </p>
                        )}
                        {contractorProfile?.email && (
                          <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                            {contractorProfile.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg sm:text-xl md:text-2xl print:text-lg font-bold text-gray-900 mb-1 sm:mb-2">QUOTE</h2>
                      {!isPublicView && (!currentJob.signature?.contractor_signed_at || currentJob.status.toString().toUpperCase() !== 'DRAFT') && (
                        <div className="inline-block print:hidden">
                          <Badge className={`${getStatusColor(currentJob.status)} text-xs print:text-xs`}>
                            {currentJob.status}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quote Details */}
                <div className="mb-4 sm:mb-6 print:mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 print:gap-3 print:break-inside-avoid">
                  <div>
                    <div className="space-y-0.5 print:space-y-0">
                      <p className="text-base sm:text-lg print:text-base font-semibold text-gray-900">
                        {currentJob.client?.name || 'Unknown Client'}
                      </p>
                      {currentJob.client?.address && (
                        <div className="flex items-center gap-2 print:block">
                          <p className="text-xs sm:text-sm print:text-xs text-gray-600 flex-1">{cleanAddressString(currentJob.client.address)}</p>
                          {!isPublicView && (
                            <Button variant="ghost" size="sm" asChild className="h-6 sm:h-7 px-1.5 sm:px-2 print:hidden text-xs">
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(currentJob.client.address)}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                  />
                                </svg>
                                <span className="ml-0.5 sm:ml-1 text-xs hidden sm:inline">Directions</span>
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                      {currentJob.client?.email && (
                        <p className="text-xs sm:text-sm print:text-xs text-gray-600">{currentJob.client.email}</p>
                      )}
                      {currentJob.client?.phone && (
                        <p className="text-xs sm:text-sm print:text-xs text-gray-600">{formatPhoneForDisplay(currentJob.client.phone)}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm print:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 sm:mb-2 print:mb-1">
                      Quote Details
                    </h3>
                    <div className="space-y-0.5 print:space-y-0">
                      <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                        <span className="font-medium">Quote #:</span> {currentJob.id}
                      </p>
                      <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                        <span className="font-medium">Date:</span> {formatDate(currentJob.created_at)}
                      </p>
                      {currentJob.quote_expiration_date && (
                        <p className="text-xs sm:text-sm print:text-xs text-red-600">
                          <span className="font-medium">Valid Until:</span> {formatDate(currentJob.quote_expiration_date)}
                        </p>
                      )}
                      {currentJob.project_type && (
                        <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                          <span className="font-medium">Project:</span> {currentJob.project_type}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Project Description (hidden in quote detail view to avoid exposing prompt text) */}
                {!hideProjectDescription && currentJob.job_description && (
                  <div className="mb-4 sm:mb-6 print:mb-4 p-2.5 sm:p-3 print:p-2 bg-gray-50 print:bg-transparent rounded-lg print:break-inside-avoid">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1.5 sm:mb-2">
                      Project Description
                    </h3>
                    <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap">{currentJob.job_description}</p>
                  </div>
                )}

                {/* Line Items */}
                <div className="mb-4 sm:mb-6 print:mb-4 print:break-inside-avoid">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 sm:mb-3 print:mb-2">
                    Line Items
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden print:border-gray-300 overflow-x-auto">
                    <table className="w-full print:text-sm min-w-[300px] sm:min-w-[600px] md:min-w-0">
                      <thead className="bg-gray-50 print:bg-gray-100">
                        <tr>
                          <th className="px-2 py-1.5 sm:px-3 sm:py-2 print:px-2 print:py-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="hidden sm:table-cell px-2 py-1.5 sm:px-3 sm:py-2 print:px-2 print:py-1 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Qty
                          </th>
                          <th className="hidden sm:table-cell px-2 py-1.5 sm:px-3 sm:py-2 print:px-2 print:py-1 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Price
                          </th>
                          <th className="px-2 py-1.5 sm:px-3 sm:py-2 print:px-2 print:py-1 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-300">
                        {(currentJob.items || []).map((item: any, index: number) => {
                          // Handle both JobItem interface and API response format
                          const itemTitle = item.title || ""
                          const customDescription = item.custom_description || item.description || "Line Item"
                          const thumbnailUrl = item.thumbnail_url || item.thumbnailUrl
                          const costPerUnit = item.cost_per_unit || item.costPerUnit || item.rate || 0
                          const markupPercentage = item.markup_percentage || item.markupPercentage || 0
                          const unitOfMeasure = item.unit_of_measure || item.unitOfMeasure || "each"
                          // Calculate unit price with markup (what customer sees)
                          const unitPriceWithMarkup = costPerUnit * (1 + markupPercentage / 100)
                          const itemTotal = item.quantity * unitPriceWithMarkup

                          return (
                            <tr key={item.id || index} className="hover:bg-gray-50 print:hover:bg-transparent print:break-inside-avoid">
                              <td className="px-2 py-2 sm:px-3 sm:py-3 print:px-2 print:py-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 sm:gap-2 print:gap-1 flex-1 min-w-0">
                                    {thumbnailUrl && !isMobile && (
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 print:w-8 print:h-8 rounded border overflow-hidden bg-gray-100 flex-shrink-0 print:border-gray-300">
                                        <Image
                                          src={thumbnailUrl}
                                          alt={customDescription}
                                          width={40}
                                          height={40}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      {itemTitle && (
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide print:text-[10px]">
                                          {itemTitle}
                                        </p>
                                      )}
                                      <p className="text-sm sm:text-base font-medium text-gray-900 print:text-sm break-words">
                                        {customDescription}
                                      </p>
                                      {(item.brand || item.brand) && (
                                        <p className="text-xs text-gray-500 print:text-xs">
                                          {item.brand} {item.model || item.model}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {/* Mobile: Show QTY and Price on the right side */}
                                  <div className="sm:hidden flex flex-col items-end text-right flex-shrink-0 ml-2">
                                    <span className="text-xs text-gray-600 whitespace-nowrap">
                                      QTY: {item.quantity} {unitOfMeasure}
                                    </span>
                                    <span className="text-xs text-gray-600 whitespace-nowrap">
                                      ${unitPriceWithMarkup.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="hidden sm:table-cell px-2 py-2 sm:px-3 sm:py-3 print:px-2 print:py-2 text-right text-xs sm:text-sm text-gray-600 print:text-xs whitespace-nowrap">
                                {item.quantity} {unitOfMeasure}
                              </td>
                              <td className="hidden sm:table-cell px-2 py-2 sm:px-3 sm:py-3 print:px-2 print:py-2 text-right text-xs sm:text-sm text-gray-600 print:text-xs whitespace-nowrap">
                                {formatCurrency(unitPriceWithMarkup)}
                              </td>
                              <td className="px-2 py-2 sm:px-3 sm:py-3 print:px-2 print:py-2 text-right text-xs sm:text-sm font-semibold text-gray-900 print:text-sm whitespace-nowrap">
                                {formatCurrency(itemTotal)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                <div className="mb-4 sm:mb-6 print:mb-4 print:break-inside-avoid">
                  <div className="ml-auto max-w-xs space-y-0.5 sm:space-y-1 print:space-y-0.5">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900 font-medium">{formatCurrency(subtotalWithMarkup)}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Tax:</span>
                      <span className="text-gray-900">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 sm:pt-2 border-t-2 border-gray-300">
                      <span className="text-base sm:text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-xl sm:text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                {currentJob.project_media && currentJob.project_media.length > 0 && (
                  <div className="mt-4 sm:mt-8 print:mt-4 pt-4 sm:pt-6 print:pt-3 border-t-2 border-gray-300 print:break-inside-avoid">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 sm:mb-3">
                      Attachments
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {currentJob.project_media.map((media) => {
                        const isImage = media.media_type === "PHOTO" || media.file_url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i)

                        return (
                          <Dialog key={media.id}>
                            <DialogTrigger asChild>
                              <button
                                className="group relative block overflow-hidden rounded-lg border border-gray-200 hover:border-sky-500 transition-colors bg-gray-50 flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                title={media.file_name || 'Attachment'}
                              >
                                {isImage ? (
                                  <div className="w-full h-full relative flex items-center justify-center">
                                    <Image
                                      src={media.file_url}
                                      alt={media.file_name || 'Attachment'}
                                      fill
                                      className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-gray-500 group-hover:text-sky-600 transition-colors">
                                    <svg className="h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-[10px] sm:text-xs truncate w-full px-1">{media.file_name}</span>
                                  </div>
                                )}
                                <span className="sr-only">View {media.file_name}</span>
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl p-2 sm:p-6 w-[95vw] sm:w-full max-h-[90vh] flex flex-col">
                              <DialogTitle className="sr-only">View Attachment</DialogTitle>
                              <div className="flex-1 w-full h-full min-h-[50vh] flex items-center justify-center bg-gray-50 rounded-md overflow-hidden relative">
                                {isImage ? (
                                  <img
                                    src={media.file_url}
                                    alt={media.file_name || 'Attachment'}
                                    className="max-w-full max-h-full object-contain"
                                  />
                                ) : (
                                  <iframe
                                    src={media.file_url}
                                    className="w-full h-full min-h-[60vh] border-0"
                                    title={media.file_name || 'Document viewer'}
                                  />
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Signatures Section */}
                <div className="mt-4 sm:mt-8 print:mt-4 pt-4 sm:pt-6 print:pt-3 border-t-2 border-gray-300 print:break-inside-avoid">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 print:gap-4">
                    {/* Contractor Signature */}
                    <div>
                      <div className="h-16 sm:h-20 print:h-16 border-b-2 border-gray-400 print:border-gray-500 mb-1.5 sm:mb-2 flex items-center justify-center relative">
                        {currentJob.signature?.contractor_signature_data || currentJob.signature?.contractor_signature_image_url ? (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const signatureData = currentJob.signature.contractor_signature_image_url || currentJob.signature.contractor_signature_data || ''
                              // Check if it's already a data URL or if it's plain text (typed signature)
                              const isDataUrl = signatureData.startsWith('data:image') || signatureData.startsWith('data:')
                              const isPlainText = !isDataUrl && !signatureData.includes(',') && !signatureData.startsWith('http')

                              if (isPlainText) {
                                // Typed signature - display as text
                                return (
                                  <span className="text-sm font-serif text-gray-900">
                                    {signatureData}
                                  </span>
                                )
                              } else {
                                // Image signature - use data URL directly or construct it
                                const imageSrc = currentJob.signature.contractor_signature_image_url ||
                                  (isDataUrl ? signatureData : `data:image/png;base64,${signatureData}`)

                                // Use regular img tag for data URLs (Next.js Image doesn't handle them well)
                                // Use Image component for HTTP URLs (Cloudinary, etc.)
                                if (imageSrc.startsWith('data:')) {
                                  return (
                                    <img
                                      src={imageSrc}
                                      alt="Contractor Signature"
                                      className="max-h-10 print:max-h-8 object-contain"
                                      style={{ maxWidth: '120px' }}
                                    />
                                  )
                                } else {
                                  return (
                                    <Image
                                      src={imageSrc}
                                      alt="Contractor Signature"
                                      width={120}
                                      height={40}
                                      className="max-h-10 print:max-h-8 object-contain"
                                    />
                                  )
                                }
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-xs print:text-xs text-gray-400 italic">
                            Contractor Signature
                          </span>
                        )}
                        {showActions &&
                          !currentJob.signature?.contractor_signed_at &&
                          isContractor &&
                          !isPublicView &&
                          !['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(currentJob.status.toString().toUpperCase()) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 print:hidden text-xs h-6 sm:h-7 px-2 sm:px-3"
                              onClick={() => setShowContractorSignature(true)}
                              disabled={signingInProgress}
                            >
                              Sign
                            </Button>
                          )}
                      </div>
                      <div className="space-y-0.5 print:space-y-0">
                        <p className="text-xs sm:text-sm print:text-xs font-semibold text-gray-900">
                          {contractorProfile?.company_name || "Contractor"}
                        </p>
                        <p className="text-xs print:text-xs text-gray-600">Authorized Signature</p>
                        {currentJob.signature?.contractor_signed_at && (
                          <p className="text-xs print:text-xs text-gray-500">
                            Signed: {formatDate(currentJob.signature.contractor_signed_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Customer Signature */}
                    <div>
                      <div className="h-16 sm:h-20 print:h-16 border-b-2 border-gray-400 print:border-gray-500 mb-1.5 sm:mb-2 flex items-center justify-center relative">
                        {currentJob.signature?.customer_signature_data || currentJob.signature?.customer_signature_image_url ? (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const signatureData = currentJob.signature.customer_signature_image_url || currentJob.signature.customer_signature_data || ''
                              // Check if it's already a data URL or if it's plain text (typed signature)
                              const isDataUrl = signatureData.startsWith('data:image') || signatureData.startsWith('data:')
                              const isPlainText = !isDataUrl && !signatureData.includes(',') && !signatureData.startsWith('http')

                              if (isPlainText) {
                                // Typed signature - display as text
                                return (
                                  <span className="text-sm font-serif text-gray-900">
                                    {signatureData}
                                  </span>
                                )
                              } else {
                                // Image signature - use data URL directly or construct it
                                const imageSrc = currentJob.signature.customer_signature_image_url ||
                                  (isDataUrl ? signatureData : `data:image/png;base64,${signatureData}`)

                                // Use regular img tag for data URLs (Next.js Image doesn't handle them well)
                                // Use Image component for HTTP URLs (Cloudinary, etc.)
                                if (imageSrc.startsWith('data:')) {
                                  return (
                                    <img
                                      src={imageSrc}
                                      alt="Customer Signature"
                                      className="max-h-10 print:max-h-8 object-contain"
                                      style={{ maxWidth: '120px' }}
                                    />
                                  )
                                } else {
                                  return (
                                    <Image
                                      src={imageSrc}
                                      alt="Customer Signature"
                                      width={120}
                                      height={40}
                                      className="max-h-10 print:max-h-8 object-contain"
                                    />
                                  )
                                }
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-xs print:text-xs text-gray-400 italic">
                            Customer Signature
                          </span>
                        )}
                        {showActions &&
                          !currentJob.signature?.customer_signed_at &&
                          !isContractor &&
                          !['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(currentJob.status.toString().toUpperCase()) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 print:hidden text-xs h-6 sm:h-7 px-2 sm:px-3"
                              onClick={() => setShowCustomerSignature(true)}
                              disabled={signingInProgress}
                            >
                              Sign
                            </Button>
                          )}
                      </div>
                      <div className="space-y-0.5 print:space-y-0">
                        <p className="text-xs sm:text-sm print:text-xs font-semibold text-gray-900">
                          {currentJob.client?.name || 'Unknown Client'}
                        </p>
                        <p className="text-xs print:text-xs text-gray-600">Customer Signature</p>
                        {currentJob.signature?.customer_signed_at && (
                          <p className="text-xs print:text-xs text-gray-500">
                            Signed: {formatDate(currentJob.signature.customer_signed_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms & Notes */}
                {(currentJob.payment_terms || currentJob.customer_notes) && (
                  <div className="mt-4 sm:mt-6 print:mt-4 pt-4 sm:pt-6 print:pt-3 border-t border-gray-200 print:break-inside-avoid">
                    {currentJob.payment_terms && (
                      <div className="mb-3 sm:mb-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1.5 sm:mb-2">
                          Payment Terms
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">{currentJob.payment_terms}</p>
                      </div>
                    )}
                    {currentJob.customer_notes && (
                      <div>
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1.5 sm:mb-2">
                          Notes
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">{currentJob.customer_notes}</p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </Card>
          </div>

          {/* Actions Sidebar - Far Right */}
          {showActions && !isPublicView && (
            <div className="w-full lg:w-72 xl:w-80 lg:flex-shrink-0 print:hidden">
              <div className="lg:sticky lg:top-8 space-y-4">
                {/* Action Buttons Card */}
                <Card className="bg-white shadow-lg p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                  <div className="flex flex-col gap-3">
                    {isContractor && (
                      <>
                        {currentJob.status?.toString().toUpperCase() === "INVOICED" && currentJob.qbo_invoice_id ? (
                          /* When invoiced, show Send Invoice button instead of quote send options */
                          <div className="flex items-center gap-2 w-full flex-wrap">
                            <Button
                              size="lg"
                              className="w-full justify-start h-12 text-base"
                              onClick={() => onSendInvoiceEmail?.()}
                              disabled={sendingInvoiceEmail}
                            >
                              {sendingInvoiceEmail ? (
                                <>
                                  <svg className="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Sending Invoice…
                                </>
                              ) : (
                                <>
                                  <svg className="mr-3 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Send Invoice
                                </>
                              )}
                            </Button>
                          </div>
                        ) : (
                          /* Normal quote send options */
                          <div className="flex items-center gap-2 w-full flex-wrap">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex-1 min-w-0">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        size="lg"
                                        className="w-full justify-start h-12 text-base"
                                        disabled={!currentJob.signature?.contractor_signed_at}
                                      >
                                        <svg className="mr-3 h-5 w-5 shrink-0 -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        {t("sendToClient")}
                                        <svg className="ml-2 h-4 w-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                                      <DropdownMenuItem
                                        onClick={() => onSendToClient?.()}
                                        disabled={sendToClientDisabled}
                                        className="rounded-md px-2 py-2 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 outline-none"
                                      >
                                        <svg className="mr-2 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Send via Email
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => onSendViaSms?.()}
                                        disabled={sendViaSmsDisabled}
                                        className="rounded-md px-2 py-2 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 outline-none"
                                      >
                                        <svg className="mr-2 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        Send via SMS
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="bg-slate-100" />
                                      <DropdownMenuItem
                                        onClick={handleCopyQuoteLink}
                                        disabled={generatingLink || (!currentJob.quote_public_link && !currentJob.signature?.contractor_signed_at)}
                                        className="rounded-md px-2 py-2 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 outline-none"
                                      >
                                        {copiedLink ? (
                                          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        ) : generatingLink ? (
                                          <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                        ) : (
                                          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                          </svg>
                                        )}
                                        {copiedLink ? "Copied!" : currentJob.quote_public_link ? "Copy link" : "Generate & copy link"}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="left"
                                className={
                                  !currentJob.signature?.contractor_signed_at
                                    ? "max-w-xs border-amber-500/80 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-600"
                                    : "max-w-xs"
                                }
                              >
                                {!currentJob.signature?.contractor_signed_at
                                  ? t("sendToClientTooltipSignFirst")
                                  : "Send quote via Email, SMS, or copy link. Email and SMS require a generated quote link."}
                              </TooltipContent>
                            </Tooltip>
                            {smsSentSuccessTo && (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 border border-emerald-200 animate-in slide-in-from-right-4 fade-in duration-300"
                                role="status"
                              >
                                <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                SMS sent successfully to {smsSentSuccessTo}
                              </span>
                            )}
                          </div>
                        )}
                        <Button
                          size="lg"
                          className="w-full justify-start h-12 text-base"
                          variant="outline"
                          onClick={onEdit}
                        >
                          <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Quote
                        </Button>
                        {qboConnected &&
                          currentJob.qbo_invoice_id &&
                          Boolean(currentJob.qbo_invoice_url?.trim()) && (
                            <Button size="lg" className="w-full justify-start h-12 text-base" variant="outline" asChild>
                              <a
                                href={currentJob.qbo_invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-3 h-5 w-5 shrink-0" />
                                Open in QuickBooks
                              </a>
                            </Button>
                          )}
                        {onCreateChangeOrder &&
                          ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(currentJob.status?.toString().toUpperCase()) && (
                            <Button
                              size="lg"
                              className="w-full justify-start h-12 text-base"
                              variant="outline"
                              onClick={onCreateChangeOrder}
                            >
                              <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Create Change Order
                            </Button>
                          )}
                        {onSendFollowupSubmit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="lg"
                                className="w-full justify-start h-12 text-base"
                                variant="outline"
                                disabled={currentJob.status?.toString().toUpperCase() === "DRAFT" || followupSending}
                              >
                                {followupSending ? (
                                  <>
                                    <svg className="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Sending…
                                  </>
                                ) : (
                                  <>
                                    <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    Send Follow-up
                                    <svg className="ml-2 h-4 w-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                onClick={() => setFollowupSendSms((v) => !v)}
                                className="rounded-md px-2 py-2 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 cursor-pointer"
                              >
                                <span
                                  className="mr-3 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 bg-white transition-colors"
                                  aria-hidden
                                >
                                  {followupSendSms && <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />}
                                </span>
                                Send via SMS
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                onClick={() => gmailConnected && setFollowupSendEmail((v) => !v)}
                                disabled={!gmailConnected}
                                className="rounded-md px-2 py-2 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 cursor-pointer"
                              >
                                <span
                                  className="mr-3 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 bg-white transition-colors"
                                  aria-hidden
                                >
                                  {followupSendEmail && <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />}
                                </span>
                                Send via email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem
                                onSelect={() => {
                                  onSendFollowupSubmit(followupSendSms, followupSendEmail && gmailConnected)
                                }}
                                className="rounded-md px-2 py-2 font-medium focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                              >
                                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                Send follow-up
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {/* Change status */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="lg"
                              className="w-full justify-start h-12 text-base"
                              variant="outline"
                              disabled={updatingStatus}
                            >
                              {updatingStatus ? (
                                <>
                                  <svg className="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Change status
                                  <svg className="ml-auto h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                            {QUOTE_STATUS_OPTIONS.map((opt) => {
                              const disabled = statusRequiresSignedQuote(opt.value) && !quoteSignedByCustomer
                              return (
                                <Tooltip key={opt.value}>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(opt.value)}
                                        disabled={disabled}
                                      >
                                        {opt.label}
                                      </DropdownMenuItem>
                                    </div>
                                  </TooltipTrigger>
                                  {disabled && (
                                    <TooltipContent side="right">
                                      <p>Quote must be signed by customer first</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                    <Button
                      size="lg"
                      className="w-full justify-start h-12 text-base"
                      variant="outline"
                      onClick={() => window.print()}
                    >
                      <svg className="mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print / Save PDF
                    </Button>
                  </div>
                </Card>
                {/* Change Orders Card */}
                {isContractor && (changeOrders.length > 0 || revisedContractAmount || currentJob.created_from_job_id) && (
                  <Card className="bg-white shadow-lg p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Change Orders</h3>
                    {currentJob.created_from_job_id && (
                      <div className="mb-3">
                        <Link
                          href={`/quotes/${currentJob.created_from_job_id}`}
                          className="text-sm text-sky-600 hover:text-sky-800 hover:underline"
                        >
                          View parent quote #{currentJob.created_from_job_id}
                        </Link>
                      </div>
                    )}
                    {revisedContractAmount && revisedContractAmount.approved_change_orders_total > 0 && (
                      <div className="mb-3 p-2 bg-gray-50 rounded text-sm space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Original:</span>
                          <span>{formatCurrency(revisedContractAmount.original_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Approved COs:</span>
                          <span>+{formatCurrency(revisedContractAmount.approved_change_orders_total)}</span>
                        </div>
                        <div className="flex justify-between font-semibold pt-1 border-t border-gray-200">
                          <span>Revised Total:</span>
                          <span>{formatCurrency(revisedContractAmount.revised_amount)}</span>
                        </div>
                      </div>
                    )}
                    {changeOrders.length > 0 ? (
                      <div className="space-y-2">
                        {changeOrders.map((co) => (
                          <Link
                            key={co.id}
                            href={`/quotes/${co.id}`}
                            className="block p-2 rounded border border-gray-200 hover:bg-gray-50 text-sm"
                          >
                            <div className="font-medium">{co.job_number || `CO #${co.id}`}</div>
                            <div className="text-gray-600 text-xs">
                              {co.change_order_reason || "Change order"} · {co.status}
                            </div>
                            {co.total_amount != null && (
                              <div className="text-xs font-medium mt-0.5">{formatCurrency(co.total_amount)}</div>
                            )}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No change orders</p>
                    )}
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Signature Capture Modals */}
        {showContractorSignature && (
          <SignatureCapture
            customerName={contractorProfile?.company_name || "Contractor"}
            onComplete={handleContractorSignatureComplete}
            onClose={() => setShowContractorSignature(false)}
            isSubmitting={signingInProgress}
          />
        )}

        {showCustomerSignature && (
          <SignatureCapture
            customerName={currentJob.client?.name || "Customer"}
            onComplete={handleCustomerSignatureComplete}
            onClose={() => setShowCustomerSignature(false)}
            isSubmitting={signingInProgress}
          />
        )}

      </div>
    </div>
  )
}

