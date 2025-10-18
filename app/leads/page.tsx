import { LeadsHeader } from "@/components/leads-header"
import { LeadsFilters } from "@/components/leads-filters"
import { LeadsList } from "@/components/leads-list"

export default function LeadsPage() {
  return (
    <div className="min-h-screen bg-background">
      <LeadsHeader />

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="space-y-4">
          <LeadsFilters />
          <LeadsList />
        </div>
      </main>
    </div>
  )
}
