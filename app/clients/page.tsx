"use client"

import { useState, useEffect } from "react"
import { ClientsHeader } from "@/components/clients-header"
import { ClientsSearch } from "@/components/clients-search"
import { ClientsList } from "@/components/clients-list"

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch clients from API when endpoint is available
    // For now, show empty state
    setLoading(false)
    setClients([])
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <ClientsHeader totalCount={clients.length} loading={loading} />

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="space-y-4">
          <ClientsSearch />
          <ClientsList />
        </div>
      </main>
    </div>
  )
}
