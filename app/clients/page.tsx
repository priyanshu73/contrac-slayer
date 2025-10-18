import { ClientsHeader } from "@/components/clients-header"
import { ClientsSearch } from "@/components/clients-search"
import { ClientsList } from "@/components/clients-list"

export default function ClientsPage() {
  return (
    <div className="min-h-screen bg-background">
      <ClientsHeader />

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="space-y-4">
          <ClientsSearch />
          <ClientsList />
        </div>
      </main>
    </div>
  )
}
