"use client"

import { useState, useEffect } from "react"
import { ClientsHeader } from "@/components/clients-header"
import { ClientsSearch } from "@/components/clients-search"
import { ClientsList } from "@/components/clients-list"
import { api } from "@/lib/api"

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const data = await api.getClients(0, 100) // Get up to 100 clients
      setClients(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch clients:", error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientsHeader totalCount={clients.length} loading={loading} />

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="space-y-4">
          <ClientsSearch />
          <ClientsList clients={clients} loading={loading} />
        </div>
      </main>
    </div>
  )
}
