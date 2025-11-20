"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import Image from "next/image"
import { ContractorProfile, Job, JobItem, Signature } from "@/lib/types"

interface PersonalizedQuoteViewProps {
  job: Job
  showActions?: boolean
  onEdit?: () => void
  onSendToClient?: () => void
  onCreateInvoice?: () => void
}

export function PersonalizedQuoteView({
  job,
  showActions = true,
  onEdit,
  onSendToClient,
  onCreateInvoice,
}: PersonalizedQuoteViewProps) {
  const [contractorProfile, setContractorProfile] = useState<ContractorProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    fetchContractorProfile()
  }, [])

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-500/10 text-gray-500'
      case 'sent': return 'bg-blue-500/10 text-blue-500'
      case 'viewed': return 'bg-purple-500/10 text-purple-500'
      case 'accepted': return 'bg-green-500/10 text-green-500'
      case 'rejected': return 'bg-red-500/10 text-red-500'
      case 'completed': return 'bg-emerald-500/10 text-emerald-500'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const total = job.total_amount || 0

  // Calculate breakdown - handle both interface and API response formats
  const baseSubtotal = (job.items || []).reduce(
    (sum, item: any) => {
      const costPerUnit = item.cost_per_unit || item.costPerUnit || item.rate || 0
      return sum + (item.quantity * costPerUnit)
    },
    0
  )
  const markupAmount = (job.items || []).reduce((sum, item: any) => {
    const costPerUnit = item.cost_per_unit || item.costPerUnit || item.rate || 0
    const markupPercentage = item.markup_percentage || item.markupPercentage || 0
    const itemBase = item.quantity * costPerUnit
    return sum + (itemBase * markupPercentage / 100)
  }, 0)
  const subtotalWithMarkup = baseSubtotal + markupAmount
  const taxAmount = total - subtotalWithMarkup

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Printable Quote Document */}
        <Card className="bg-white shadow-lg print:shadow-none print:border-none">
          <div className="p-8 sm:p-12 print:p-8">
            {/* Header with Logo */}
            <div className="mb-8 pb-8 border-b-2 border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {loadingProfile ? (
                    <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse" />
                  ) : contractorProfile?.logo_url ? (
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 border-gray-200">
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
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-white">
                        {(contractorProfile?.company_name || "C")[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {contractorProfile?.company_name || "Quote"}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      {contractorProfile?.address || ""}
                    </p>
                    {contractorProfile?.phone_number && (
                      <p className="text-sm text-gray-600">
                        {contractorProfile.phone_number}
                      </p>
                    )}
                    {contractorProfile?.email && (
                      <p className="text-sm text-gray-600">
                        {contractorProfile.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">QUOTE</h2>
                  <div className="inline-block">
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Details */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Bill To
                </h3>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-gray-900">{job.client_name}</p>
                  {job.client_address && (
                    <p className="text-sm text-gray-600">{job.client_address}</p>
                  )}
                  {job.client_email && (
                    <p className="text-sm text-gray-600">{job.client_email}</p>
                  )}
                  {job.client_phone && (
                    <p className="text-sm text-gray-600">{job.client_phone}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Quote Details
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Quote #:</span> {job.id}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Date:</span> {formatDate(job.created_at)}
                  </p>
                  {job.quote_expiration_date && (
                    <p className="text-sm text-red-600">
                      <span className="font-medium">Valid Until:</span> {formatDate(job.quote_expiration_date)}
                    </p>
                  )}
                  {job.project_type && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Project:</span> {job.project_type}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Project Description */}
            {job.job_description && (
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Project Description
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{job.job_description}</p>
              </div>
            )}

            {/* Line Items */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Line Items
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(job.items || []).map((item: any, index: number) => {
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
                        <tr key={item.id || index} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {thumbnailUrl && (
                                <div className="w-12 h-12 rounded border overflow-hidden bg-gray-100 flex-shrink-0">
                                  <Image
                                    src={thumbnailUrl}
                                    alt={customDescription}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">
                                  {customDescription}
                                </p>
                                {(item.brand || item.brand) && (
                                  <p className="text-xs text-gray-500">
                                    {item.brand} {item.model || item.model}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-600">
                            {item.quantity} {unitOfMeasure}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-gray-600">
                            {formatCurrency(unitPriceWithMarkup)}
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-gray-900">
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
            <div className="mb-8">
              <div className="ml-auto max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(subtotalWithMarkup)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="text-gray-900">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Signatures Section */}
            <div className="mt-12 pt-8 border-t-2 border-gray-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Contractor Signature */}
                <div>
                  <div className="h-24 border-b-2 border-gray-400 mb-2 flex items-center justify-center">
                    {job.signature?.signature_image_url ? (
                      <div className="flex items-center gap-2">
                        <Image
                          src={job.signature.signature_image_url}
                          alt="Contractor Signature"
                          width={120}
                          height={40}
                          className="max-h-12 object-contain"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Contractor Signature
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {contractorProfile?.company_name || "Contractor"}
                    </p>
                    <p className="text-xs text-gray-600">Authorized Signature</p>
                    {job.signature?.signed_at && (
                      <p className="text-xs text-gray-500">
                        Signed: {formatDate(job.signature.signed_at)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Customer Signature */}
                <div>
                  <div className="h-24 border-b-2 border-gray-400 mb-2 flex items-center justify-center">
                    {job.signature?.signature_image_url ? (
                      <div className="flex items-center gap-2">
                        <Image
                          src={job.signature.signature_image_url}
                          alt="Customer Signature"
                          width={120}
                          height={40}
                          className="max-h-12 object-contain"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Customer Signature
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {job.client_name}
                    </p>
                    <p className="text-xs text-gray-600">Customer Signature</p>
                    {job.signature?.signed_at && (
                      <p className="text-xs text-gray-500">
                        Signed: {formatDate(job.signature.signed_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Notes */}
            {(job.payment_terms || job.customer_notes) && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                {job.payment_terms && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Payment Terms
                    </h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.payment_terms}</p>
                  </div>
                )}
                {job.customer_notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Notes
                    </h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.customer_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Actions - Only show if not printed */}
        {showActions && (
          <div className="mt-8 flex flex-wrap gap-3 print:hidden">
            <Button size="lg" onClick={onSendToClient}>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send to Client
            </Button>
            <Button size="lg" variant="outline" onClick={onEdit}>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Quote
            </Button>
            <Button size="lg" variant="outline" onClick={onCreateInvoice}>
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Create Invoice
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.print()}
            >
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save PDF
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

