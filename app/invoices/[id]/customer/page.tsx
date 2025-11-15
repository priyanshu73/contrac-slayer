"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { InvoiceView } from "@/components/invoice-view"
import { SignatureCapture } from "@/components/signature-capture"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api"

interface Invoice {
  id: number
  invoice_number: string
  issue_date: string
  due_date: string
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'PAID' | 'OVERDUE'
  subtotal: number
  tax_amount: number
  discount_amount?: number
  discount_percentage?: number
  total_amount: number
  amount_paid: number
  balance_due: number
  payment_terms?: string
  notes?: string
  line_items: Array<{
    id: number
    description: string
    quantity: number
    unit_price: number
    tax_rate?: number
    is_taxable: boolean
    subtotal: number
  }>
  contractor: {
    company_name: string
    address?: string
    phone_number?: string
    email: string
    website_url?: string
    logo_url?: string
  }
  client: {
    name: string
    email: string
    address?: string
    phone?: string
  }
  shareable_token?: string
}

export default function CustomerInvoicePage() {
  const params = useParams()
  const invoiceId = params.invoiceId as string
  
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSignature, setShowSignature] = useState(false)
  const [signingInProgress, setSigningInProgress] = useState(false)

  useEffect(() => {
    fetchInvoice()
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Call API to get invoice by shareable token/ID
      const response = await api.getPublicInvoice(invoiceId)
      setInvoice(response)
      
      // Mark invoice as viewed if it's the first time
      if (response.status === 'SENT') {
        await api.markInvoiceAsViewed(invoiceId)
        setInvoice(prev => prev ? { ...prev, status: 'VIEWED' } : null)
      }
    } catch (err) {
      console.error('Error fetching invoice:', err)
      setError('Invoice not found or access denied')
    } finally {
      setLoading(false)
    }
  }

  const handleSignature = () => {
    setShowSignature(true)
  }

  const handleSignatureComplete = async (signatureData: string) => {
    try {
      setSigningInProgress(true)
      
      // Submit signature and mark invoice as signed
      await api.signInvoice(invoiceId, {
        signature_data: signatureData,
        signer_name: invoice?.client.name || '',
        signer_email: invoice?.client.email || '',
        accepted_terms: true
      })
      
      // Update invoice status
      setInvoice(prev => prev ? { ...prev, status: 'SIGNED' } : null)
      setShowSignature(false)
      
    } catch (err) {
      console.error('Error signing invoice:', err)
      setError('Failed to sign invoice. Please try again.')
    } finally {
      setSigningInProgress(false)
    }
  }

  const handlePayment = () => {
    // Redirect to payment processor or show payment modal
    // For now, we'll just show an alert
    alert('Payment processing would be implemented here. This would integrate with Stripe, Square, etc.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Invoice Not Found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {error || 'The invoice you are looking for does not exist or has been removed.'}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        {error && (
          <div className="max-w-4xl mx-auto mb-6 px-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="px-4">
          <InvoiceView
            invoice={invoice}
            isCustomerView={true}
            onPayment={handlePayment}
            onSignature={handleSignature}
            showActions={true}
          />
        </div>

        {/* Signature Modal */}
        {showSignature && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Accept and Sign Invoice</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSignature(false)}
                    disabled={signingInProgress}
                  >
                    ×
                  </Button>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-600">
                    By signing this invoice, you agree to the terms and conditions and 
                    authorize {invoice.contractor.company_name} to proceed with the work 
                    as outlined for a total of{' '}
                    <span className="font-semibold">
                      ${invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>.
                  </p>
                </div>

                <SignatureCapture
                  customerName={invoice.client.name}
                  onComplete={handleSignatureComplete}
                  onClose={() => setShowSignature(false)}
                />
                
                {signingInProgress && (
                  <div className="mt-4 text-center text-gray-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    Processing signature...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}