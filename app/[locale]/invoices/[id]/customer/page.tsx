"use client"

import { useParams, useSearchParams } from "next/navigation"
import { InvoiceDetail } from "@/components/invoice-detail"
import { Card } from "@/components/ui/card"

/**
 * Public, client-facing invoice view. Reached from the client portal
 * (`/[locale]/client/[token]`) which links here with the portal token in the
 * query string. The same document the contractor sees, read-only — the token
 * scopes access to the client's own billed invoices.
 */
export default function CustomerInvoicePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const invoiceId = params.id as string
  const token = searchParams.get("token") || undefined

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">This invoice link is invalid</h1>
          <p className="text-sm text-muted-foreground">
            Please open the invoice from the link in your portal or email.
          </p>
        </Card>
      </main>
    )
  }

  return <InvoiceDetail invoiceId={invoiceId} token={token} />
}
