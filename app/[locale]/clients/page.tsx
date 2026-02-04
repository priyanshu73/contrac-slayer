"use client"

import { useState, useEffect } from "react"
import { ClientsSearch } from "@/components/clients-search"
import { ClientsList } from "@/components/clients-list"
import { CreateAppointmentDialog, type CreateAppointmentClient } from "@/components/create-appointment-dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useTranslations } from "next-intl"

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ time_zone?: string; calendar_link?: string } | null>(null)
  const [createAppointmentOpen, setCreateAppointmentOpen] = useState(false)
  const [createAppointmentClientId, setCreateAppointmentClientId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
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

  const clientsForAppointment: CreateAppointmentClient[] = clients.map((c) => ({
    id: c.id,
    name: c.name || c.full_name || "",
    email: c.email || "",
  }))

  const handleScheduleClick = (client: { id: number; name?: string; email?: string }) => {
    setCreateAppointmentClientId(String(client.id))
    setCreateAppointmentOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ClientsSearch showArchived={showArchived} onShowArchivedChange={setShowArchived} />
            </div>
            <Button size="sm" asChild>
              <a href="/clients/new">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {tClients("addClient")}
              </a>
            </Button>
          </div>
          <ClientsList
            clients={clients}
            loading={loading}
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
