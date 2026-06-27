import { InvoiceDetail } from "@/components/invoice-detail"
import { AppBreadcrumb } from "@/components/app-breadcrumb"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function InvoiceDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id, locale } = await params

  // A UUID in the path is a client's per-document public link (/invoices/<uuid>);
  // a numeric id is the contractor's authenticated view. Mirrors the quote route.
  if (UUID_RE.test(id)) {
    return <InvoiceDetail publicLink={id} />
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 sm:py-6 pb-24 md:pb-6">
        <AppBreadcrumb
          className="mb-4"
          items={[
            { label: "Invoices", href: `/${locale}/invoices` },
            { label: "Invoice Details" },
          ]}
        />
        <InvoiceDetail invoiceId={id} />
      </main>
    </div>
  )
}
