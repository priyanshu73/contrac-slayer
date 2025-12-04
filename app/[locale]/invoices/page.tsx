import { InvoicesHeader } from "@/components/invoices-header"
import { InvoicesFilters } from "@/components/invoices-filters"
import { InvoicesList } from "@/components/invoices-list"

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <InvoicesHeader />

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="space-y-4">
          <InvoicesFilters />
          <InvoicesList />
        </div>
      </main>
    </div>
  )
}
