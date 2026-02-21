"use client"

import { useState, useEffect } from "react"
import { ClientsSearch } from "@/components/clients-search"
import { ClientsList } from "@/components/clients-list"
import { CreateAppointmentDialog, type CreateAppointmentClient } from "@/components/create-appointment-dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useTranslations } from "next-intl"
import { Plus, LayoutGrid, List } from "lucide-react"

export type ClientsViewMode = "grid" | "list"

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ time_zone?: string; calendar_link?: string } | null>(null)
  const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false)
  const [createAppointmentClientId, setCreateAppointmentClientId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ClientsViewMode>("list")
  const tClients = useTranslations("clients")

  useEffect(() => {
    fetchClients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  useEffect(() => {
    let cancelled = false
    api
      .getMyProfile()
      .then((p) => {
        if (!cancelled) setProfile(p ?? null)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const data = await api.getClients(0, 100, showArchived ? "ARCHIVED" : undefined) // Get up to 100 clients
      setClients(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch clients:", error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  // Client-side filtering
  const filteredClients = clients.filter((client) => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    const name = (client.name || client.full_name || "").toLowerCase()
    const email = (client.email || "").toLowerCase()
    const phone = (client.phone || "").toLowerCase()
    const address = (client.address || "").toLowerCase()
    
    return name.includes(query) || 
           email.includes(query) || 
           phone.includes(query) ||
           address.includes(query)
  })

  const clientsForAppointment: CreateAppointmentClient[] = clients.map((c) => ({
    id: c.id,
    name: c.name || c.full_name || "",
    email: c.email || "",
    address: c.address_data?.formatted_address?.trim() || c.address?.trim() || undefined,
  }))

  const handleScheduleClick = (client: { id: number; name?: string; email?: string }) => {
    setCreateAppointmentClientId(String(client.id))
    setCreateAppointmentOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header: Search + Filters + Add Button */}
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-4">
          <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-0 w-full">
              <ClientsSearch 
                showArchived={showArchived} 
                onShowArchivedChange={setShowArchived}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* View mode toggle */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    viewMode === "list" ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                  title="List view"
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                    viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Grid view"
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
              <Button asChild className="h-10 w-full shrink-0 sm:w-auto">
                <a href="/clients/new" className="flex items-center justify-center">
                  <Plus className="mr-2 h-4 w-4" />
                  {tClients("addClient")}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 md:px-12 lg:px-16 py-6 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto">
          {/* Clients Table / Cards */}
          <ClientsList
            clients={filteredClients}
            loading={loading}
            viewMode={viewMode}
            onScheduleClick={handleScheduleClick}
            onClientArchived={fetchClients}
          />
        </div>

        <CreateAppointmentDialog
          open={createAppointmentOpen}
          onOpenChange={setCreateAppointmentOpen}
          clients={clientsForAppointment}
          profile={profile}
          preSelectedClientId={createAppointmentClientId}
          onClientCreated={fetchClients}
        />
      </main>
    </div>
  )
}
