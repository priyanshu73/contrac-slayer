import { LeadsHeader } from "@/components/leads-header"
import { LeadsFilters } from "@/components/leads-filters"
import { LeadsListReal } from "@/components/leads-list-real"

export default function LeadsPage() {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <LeadsHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          <LeadsFilters />
          <LeadsListReal />
        </div>
      </main>
    </div>
  )
}
