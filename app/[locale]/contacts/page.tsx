"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ClientsSearch } from "@/components/clients-search"
import { ClientsList } from "@/components/clients-list"
import { SubcontractorsList } from "@/components/subcontractors-list"
import { AddSubcontractorForm } from "@/components/add-subcontractor-form"
import { CreateAppointmentDialog, type CreateAppointmentClient } from "@/components/create-appointment-dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useTranslations, useLocale } from "next-intl"
import { Plus, LayoutGrid, List, Users, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

export type ClientsViewMode = "grid" | "list"
type PeopleTab = "clients" | "subcontractors"

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as PeopleTab) || "clients"
  const [activeTab, setActiveTab] = useState<PeopleTab>(initialTab)
  const [clients, setClients] = useState<any[]>([])
  const [subcontractors, setSubcontractors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ time_zone?: string; calendar_link?: string } | null>(null)
  const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false)
  const [createAppointmentClientId, setCreateAppointmentClientId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ClientsViewMode>("list")
  const [addSubOpen, setAddSubOpen] = useState(false)
  const tClients = useTranslations("clients")
  const locale = useLocale()

  useEffect(() => {
    if (activeTab === "clients") {
      fetchClients()
    } else {
      fetchSubcontractors()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived, activeTab])

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

  const fetchSubcontractors = async () => {
    try {
      setLoading(true)
      const data = await api.getSubcontractors()
      setSubcontractors(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch subcontractors:", error)
      setSubcontractors([])
    } finally {
      setLoading(false)
    }
  }

  // Reset search when switching tabs
  const handleTabChange = (tab: PeopleTab) => {
    setSearchQuery("")
    setActiveTab(tab)
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

  const filteredSubcontractors = subcontractors.filter((sub) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const name = (sub.name || "").toLowerCase()
    const email = (sub.email || "").toLowerCase()
    const phone = (sub.phone_number || "").toLowerCase()
    const company = (sub.company_name || "").toLowerCase()
    return name.includes(query) || email.includes(query) || phone.includes(query) || company.includes(query)
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
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 py-3 sm:py-4">
          <div className="max-w-7xl mx-auto space-y-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1 w-fit">
              <button
                type="button"
                onClick={() => handleTabChange("clients")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === "clients"
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <Users className="h-4 w-4" />
                {tClients("title")}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("subcontractors")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === "subcontractors"
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <Wrench className="h-4 w-4" />
                Team members
              </button>
            </div>

            {/* Search + Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {activeTab === "clients" ? (
                <ClientsSearch
                  showArchived={showArchived}
                  onShowArchivedChange={setShowArchived}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="Search team members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:max-w-xs h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              )}

              <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3">
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`flex h-10 w-10 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-md transition-colors touch-manipulation ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                      }`}
                    title="List view"
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`flex h-10 w-10 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-md transition-colors touch-manipulation ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                      }`}
                    title="Grid view"
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
                {activeTab === "clients" ? (
                  <Button asChild className="flex-1 sm:flex-initial h-11 min-h-[44px] sm:min-h-0 touch-manipulation">
                    <a href={`/${locale}/contacts/new`} className="flex items-center justify-center gap-2 px-4">
                      <Plus className="h-5 w-5 shrink-0" />
                      {tClients("addClient")}
                    </a>
                  </Button>
                ) : (
                  <Button
                    className="flex-1 sm:flex-initial h-11 min-h-[44px] sm:min-h-0 touch-manipulation"
                    onClick={() => setAddSubOpen(true)}
                  >
                    <Plus className="h-5 w-5 shrink-0 mr-2" />
                    Add Team Member
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 md:px-12 lg:px-16 py-6 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === "clients" ? (
            <ClientsList
              clients={filteredClients}
              loading={loading}
              viewMode={viewMode}
              onScheduleClick={handleScheduleClick}
              onClientArchived={fetchClients}
            />
          ) : (
            <SubcontractorsList
              subcontractors={filteredSubcontractors}
              loading={loading}
              viewMode={viewMode}
              onSubcontractorArchived={fetchSubcontractors}
            />
          )}
        </div>

        <CreateAppointmentDialog
          open={createAppointmentOpen}
          onOpenChange={setCreateAppointmentOpen}
          clients={clientsForAppointment}
          profile={profile}
          preSelectedClientId={createAppointmentClientId}
          onClientCreated={fetchClients}
        />

        <AddSubcontractorForm
          open={addSubOpen}
          onOpenChange={setAddSubOpen}
          onSuccess={fetchSubcontractors}
        />
      </main>
    </div>
  )
}
