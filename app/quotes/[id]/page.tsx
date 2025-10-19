import { CustomerQuoteView } from "@/components/customer-quote-view"

export default function CustomerQuotePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-background">
      <CustomerQuoteView quoteId={params.id} />
    </div>
  )
}
