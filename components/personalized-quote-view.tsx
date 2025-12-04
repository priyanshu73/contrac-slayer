"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import Image from "next/image"
import { ContractorProfile, ContractorInfo, Job, JobItem, Signature, JobStatus } from "@/lib/types"
import { SignatureCapture } from "@/components/signature-capture"
import { QuotePublicLink } from "@/components/quote-public-link"
import { useIsMobile } from "@/hooks/use-mobile"

interface PersonalizedQuoteViewProps {
  job: Job
  showActions?: boolean
  onEdit?: () => void
  onSendToClient?: () => void
  onCreateInvoice?: () => void
  onSignatureUpdate?: () => void
  isContractor?: boolean  // If true, hide customer signature button
  isPublicView?: boolean  // If true, this is a public customer view
}

export function PersonalizedQuoteView({
  job,
  showActions = true,
  onEdit,
  onSendToClient,
  onCreateInvoice,
  onSignatureUpdate,
  isContractor = false,
  isPublicView = false,
}: PersonalizedQuoteViewProps) {
  const isMobile = useIsMobile()
  const [contractorProfile, setContractorProfile] = useState<ContractorProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [showContractorSignature, setShowContractorSignature] = useState(false)
  const [showCustomerSignature, setShowCustomerSignature] = useState(false)
  const [signingInProgress, setSigningInProgress] = useState(false)
  const [currentJob, setCurrentJob] = useState<Job>(job)

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
          default_labor_rate_per_hour: 0,
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
        signature: signature as Signature
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
        signature: signatureResponse as Signature,
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
      setCurrentJob(prev => ({
        ...(prev as Job),
        signature: signatureResponse as Signature,
        status: JobStatus.ACCEPTED,
        accepted_total_amount: Number(
          (signatureResponse as Signature).accepted_total_amount ||
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

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 print:min-h-0 print:py-0 print:bg-white print:mt-0 print:pt-0">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 print:max-w-full print:px-0 print:mx-0 print:mt-0 print:pt-0">
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
                      {contractorProfile?.address || ""}
                    </p>
                    {contractorProfile?.phone_number && (
                      <p className="text-xs sm:text-sm print:text-xs text-gray-600">
                        {contractorProfile.phone_number}
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
                      <p className="text-xs sm:text-sm print:text-xs text-gray-600 flex-1">{currentJob.client.address}</p>
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
                    <p className="text-xs sm:text-sm print:text-xs text-gray-600">{currentJob.client.phone}</p>
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

            {/* Project Description */}
            {currentJob.job_description && (
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

        {/* Signature Capture Modals */}
        {showContractorSignature && (
          <SignatureCapture
            customerName={contractorProfile?.company_name || "Contractor"}
            onComplete={handleContractorSignatureComplete}
            onClose={() => setShowContractorSignature(false)}
          />
        )}

        {showCustomerSignature && (
          <SignatureCapture
            customerName={currentJob.client?.name || "Customer"}
            onComplete={handleCustomerSignatureComplete}
            onClose={() => setShowCustomerSignature(false)}
          />
        )}

        {/* Public Link for Contractors */}
        {isContractor && !isPublicView && (
          <div className="mt-4 sm:mt-8 print:hidden">
            <QuotePublicLink 
              jobId={currentJob.id} 
              currentPublicLink={currentJob.quote_public_link}
              contractorHasSigned={!!currentJob.signature?.contractor_signed_at}
              onLinkGenerated={(link) => {
                setCurrentJob(prev => prev ? { ...prev, quote_public_link: link } : prev)
              }}
            />
          </div>
        )}

        {/* Actions - Only show if not printed and not public view */}
        {showActions && !isPublicView && (
          <div className="mt-4 sm:mt-8 flex flex-wrap gap-2 sm:gap-3 print:hidden">
            {isContractor && (
              <>
                <Button size="sm" className="sm:h-10 sm:px-4 text-xs sm:text-base" onClick={onSendToClient}>
                  <svg className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Send to Client</span>
                  <span className="sm:hidden">Send</span>
                </Button>
                <Button size="sm" className="sm:h-10 sm:px-4 text-xs sm:text-base" variant="outline" onClick={onEdit}>
                  <svg className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="hidden sm:inline">Edit Quote</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
                {/* Commented out - might use in the future
                <Button size="lg" variant="outline" onClick={onCreateInvoice}>
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Create Invoice
                </Button>
                */}
              </>
            )}
            <Button
              size="sm"
              className="sm:h-10 sm:px-4 text-xs sm:text-base"
              variant="outline"
              onClick={() => window.print()}
            >
              <svg className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span className="hidden sm:inline">Print / Save PDF</span>
              <span className="sm:hidden">Print</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

