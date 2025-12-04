"use client"

import { useState, useEffect } from "react"
import { ClientsSearch } from "@/components/clients-search"
import { ClientsList } from "@/components/clients-list"
import { Button } from "@/components/ui/button"
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

      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ClientsSearch />
            </div>
            <Button size="sm" asChild>
              <a href="/clients/new">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Client
              </a>
            </Button>
          </div>
          <ClientsList clients={clients} loading={loading} />
        </div>
      </main>
    </div>
  )
}
