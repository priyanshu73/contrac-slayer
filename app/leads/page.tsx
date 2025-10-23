import { LeadsHeader } from "@/components/leads-header"
import { LeadsListReal } from "@/components/leads-list-real"

export default function LeadsPage() {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <LeadsHeader />

      <main className="container mx-auto px-4 py-6">
        <LeadsListReal />
      </main>
    </div>
  )
}
