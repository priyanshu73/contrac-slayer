"use client"

import { useState, useEffect } from "react"
import { ClientsSearch } from "@/components/clients-search"
import { ClientsList } from "@/components/clients-list"
import { CreateAppointmentDialog, type CreateAppointmentClient } from "@/components/create-appointment-dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useTranslations, useLocale } from "next-intl"
import { Plus, LayoutGrid, List, Users } from "lucide-react"

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
  const tCommon = useTranslations("common")
  const locale = useLocale()

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
      const data = await api.getClients(0, 100, showArchived ? "ARCHIVED" : undefined)
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
    return name.includes(query) || email.includes(query) || phone.includes(query) || address.includes(query)
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
      {/* Sticky Header */}
      <div className="sticky top-14 z-40 border-b border-slate-200 bg-slate-50/95 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-slate-50/85 md:top-0 md:z-10">
        <div className="px-4 py-3 sm:px-8 md:px-12 md:py-4 lg:px-16">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="hidden h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex md:hidden">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h1 className="hidden truncate text-2xl font-bold tracking-tight text-slate-900 md:block">{tClients("title") || "Clients"}</h1>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 md:hidden">
                      {loading ? tCommon("loading") : `${filteredClients.length} ${tClients("title") || "Clients"}`}
                    </p>
                  </div>
                </div>
              </div>

              <Button asChild className="h-11 shrink-0 rounded-lg px-3 text-sm font-semibold shadow-sm md:hidden">
                <a href={`/${locale}/clients/new`} className="flex items-center justify-center gap-1.5" aria-label={tClients("addClient")}>
                  <Plus className="h-5 w-5" />
                  <span>{tClients("addClient")}</span>
                </a>
              </Button>
            </div>

            {/* Search + Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <ClientsSearch
                showArchived={showArchived}
                onShowArchivedChange={setShowArchived}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />

              <div className="hidden w-full items-center gap-2 sm:flex sm:w-auto sm:gap-3">
                <div className="flex flex-initial items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:shadow-none">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`flex h-10 min-h-[44px] items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors touch-manipulation sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 sm:px-0 ${
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
                    className={`flex h-10 min-h-[44px] items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors touch-manipulation sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 sm:px-0 ${
                      viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                    title="Grid view"
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
                <Button asChild className="hidden h-11 min-h-[44px] flex-1 touch-manipulation sm:flex sm:flex-initial sm:min-h-0">
                  <a href={`/${locale}/clients/new`} className="flex items-center justify-center gap-2 px-4">
                    <Plus className="h-5 w-5 shrink-0" />
                    {tClients("addClient")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pt-4 pb-8 sm:px-8 sm:py-6 sm:pb-24 md:px-12 md:pb-6 lg:px-16">
        <div className="max-w-7xl mx-auto">
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
