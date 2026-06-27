"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Loader2,
  CalendarClock,
  MapPin,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  Home,
  Mail,
  Phone,
} from "lucide-react"
import { MapboxAddressInput } from "@/components/mapbox-address-input"
import { AddressData } from "@/lib/types/address"

// ─── Types matching the public subcontractor payload ─────────────────────────
type CrewTask = {
  id: number
  project_id: number
  title: string
  description?: string | null
  task_type?: string | null
  status?: string | null
  priority?: string | null
  order?: number | null
  scheduled_start_date?: string | null
  scheduled_end_date?: string | null
}

type CrewTrade = {
  id: number
  uuid: string
  project_id: number
  project_title?: string | null
  trade_type: string
  scope_of_work?: string | null
  materials_required?: string[] | null
  acceptance_criteria?: { text: string; selected: boolean }[] | null
  agreed_price?: number | string | null
  status: string
  tasks?: CrewTask[]
}

type CrewSubcontractor = {
  uuid: string
  name: string
  company_name?: string | null
  specialty?: string | null
  email?: string | null
  phone_number?: string | null
  daily_availability_status?: string | null
  service_radius_miles?: number | null
  availability_notes?: string | null
  address?: string | null
  trades?: CrewTrade[]
  contractor_name?: string | null
  contractor_logo_url?: string | null
}

type CrewView = "portal" | "availability" | "scope"

const TASK_STATUSES: { value: string; label: string }[] = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "BLOCKED", label: "Blocked" },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function CrewPortalNav({
  activeView,
  onViewChange,
  scopeCount,
}: {
  activeView: CrewView
  onViewChange: (v: CrewView) => void
  scopeCount: number
}) {
  const items: { id: CrewView; label: string; icon: typeof FileText; badge?: number }[] = [
    { id: "availability", label: "Availability", icon: CalendarClock },
    { id: "scope", label: "Scope", icon: FileText, badge: scopeCount },
  ]

  const navButton = (item: (typeof items)[number]) => {
    const Icon = item.icon
    const isActive = activeView === item.id
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onViewChange(item.id)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left w-full",
          isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge != null && item.badge > 0 && (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            )}
          >
            {item.badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-44 flex-col bg-white border-r border-slate-200 px-3 pt-8 pb-6">
        <button
          type="button"
          onClick={() => onViewChange("portal")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors mb-4",
            activeView === "portal"
              ? "bg-slate-900 text-white"
              : "text-slate-900 bg-slate-100 hover:bg-slate-200"
          )}
        >
          <Home className={cn("h-4 w-4 shrink-0", activeView === "portal" ? "text-white" : "text-slate-500")} />
          <span>My Portal</span>
        </button>
        <div className="mb-3 border-t border-slate-100" />
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Sections</p>
        <nav className="flex flex-col gap-0.5">{items.map(navButton)}</nav>
      </aside>

      {/* Mobile top bar */}
      <div className="flex md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 overflow-x-auto">
        {(["portal", "availability", "scope"] as CrewView[]).map((id) => {
          const label = id === "portal" ? "My Portal" : id === "availability" ? "Availability" : "Scope"
          const isActive = activeView === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                isActive ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CrewPortalPage() {
  const params = useParams()
  const uuid = params.uuid as string

  const [sub, setSub] = useState<CrewSubcontractor | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<CrewView>("portal")

  // Availability form state
  const [status, setStatus] = useState("PENDING")
  const [radius, setRadius] = useState<number | "">("")
  const [notes, setNotes] = useState("")
  const [address, setAddress] = useState("")
  const [savingAvailability, setSavingAvailability] = useState(false)
  const [availabilitySaved, setAvailabilitySaved] = useState(false)

  // Scope action state
  const [updatingTradeUuid, setUpdatingTradeUuid] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null)
  const [expandedTaskIds, setExpandedTaskIds] = useState<number[]>([])

  useEffect(() => {
    if (!uuid) return
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const data = await api.getPublicSubcontractor(uuid)
        if (!cancelled) {
          setSub(data)
          setStatus(data.daily_availability_status || "PENDING")
          setRadius(data.service_radius_miles ?? "")
          setNotes(data.availability_notes || "")
          setAddress(data.address || "")
        }
      } catch (err) {
        console.error("Failed to load crew portal", err)
        if (!cancelled) setSub(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [uuid])

  const handleAddressSelect = (data: AddressData | null) => {
    setAddress(data?.formatted_address || "")
  }

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uuid || !sub) return
    setSavingAvailability(true)
    setAvailabilitySaved(false)
    try {
      const payload: any = {
        daily_availability_status: status,
        availability_notes: notes,
        address,
        service_radius_miles: radius !== "" ? Number(radius) : null,
      }
      const updated = await api.updatePublicSubcontractorAvailability(uuid, payload)
      setSub((prev) => (prev ? { ...prev, ...updated } : updated))
      setAvailabilitySaved(true)
      setTimeout(() => setAvailabilitySaved(false), 3000)
    } catch (err) {
      console.error("Failed to update availability", err)
      alert("Failed to save availability. Please try again.")
    } finally {
      setSavingAvailability(false)
    }
  }

  const updateTradeStatus = (tradeUuid: string, updated: any) => {
    setSub((prev) =>
      prev
        ? {
            ...prev,
            trades: (prev.trades || []).map((tr) =>
              tr.uuid === tradeUuid ? { ...tr, status: updated.status ?? tr.status } : tr
            ),
          }
        : prev
    )
  }

  const handleAcceptTrade = async (tradeUuid: string) => {
    setUpdatingTradeUuid(tradeUuid)
    try {
      const updated = await api.acceptTradeScopePublic(tradeUuid)
      updateTradeStatus(tradeUuid, updated)
    } catch (err) {
      console.error("Failed to accept scope", err)
      alert("Failed to accept scope. Please try again.")
    } finally {
      setUpdatingTradeUuid(null)
    }
  }

  const handleRejectTrade = async (tradeUuid: string) => {
    setUpdatingTradeUuid(tradeUuid)
    try {
      const updated = await api.rejectTradeScopePublic(tradeUuid)
      updateTradeStatus(tradeUuid, updated)
    } catch (err) {
      console.error("Failed to reject scope", err)
      alert("Failed to reject scope. Please try again.")
    } finally {
      setUpdatingTradeUuid(null)
    }
  }

  const handleTaskStatusChange = async (tradeUuid: string, taskId: number, newStatus: string) => {
    setUpdatingTaskId(taskId)
    try {
      const updated = await api.updateTradeTaskStatusPublic(tradeUuid, taskId, newStatus)
      setSub((prev) =>
        prev
          ? {
              ...prev,
              trades: (prev.trades || []).map((tr) =>
                tr.uuid === tradeUuid
                  ? {
                      ...tr,
                      tasks: (tr.tasks || []).map((tk) => (tk.id === taskId ? { ...tk, ...updated } : tk)),
                    }
                  : tr
              ),
            }
          : prev
      )
    } catch (err) {
      console.error("Failed to update task status", err)
      alert("Failed to update task status. Please try again.")
    } finally {
      setUpdatingTaskId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!sub) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-slate-700 font-medium">This link is invalid or has expired.</p>
          <p className="text-sm text-slate-400">Please contact your contractor for a new link.</p>
        </div>
      </div>
    )
  }

  const trades = sub.trades || []
  const showAvailability = view === "portal" || view === "availability"
  const showScope = view === "portal" || view === "scope"

  return (
    <div className="min-h-screen bg-slate-50">
      <CrewPortalNav activeView={view} onViewChange={setView} scopeCount={trades.length} />

      <div className="flex-1 md:ml-44 mt-12 md:mt-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              {sub.contractor_logo_url ? (
                <img
                  src={sub.contractor_logo_url}
                  alt={sub.contractor_name || "Contractor"}
                  className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 text-base font-bold">
                  {(sub.name || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {sub.contractor_name || "Your Contractor"}
                  </p>
                  <h1 className="text-xl font-semibold text-slate-900 leading-tight">Crew Portal</h1>
                  <p className="mt-1 text-sm text-slate-500 capitalize">
                    {sub.name}
                    {sub.company_name && <span className="text-slate-400"> &bull; {sub.company_name}</span>}
                  </p>
                </div>
                <div className="space-y-1 md:justify-self-end md:text-right">
                  {sub.email && (
                    <a
                      href={`mailto:${sub.email}`}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors md:justify-end"
                    >
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="break-words">{sub.email}</span>
                    </a>
                  )}
                  {sub.phone_number && (
                    <a
                      href={`tel:${sub.phone_number}`}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors md:justify-end"
                    >
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{sub.phone_number}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
          {/* Availability */}
          {showAvailability && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your Availability</h2>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <form onSubmit={handleSaveAvailability} className="space-y-7">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        value: "AVAILABLE",
                        label: "Available",
                        hint: "Ready for new dispatch",
                        activeBox: "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500",
                        activeIcon: "text-emerald-600",
                      },
                      {
                        value: "UNAVAILABLE",
                        label: "Unavailable",
                        hint: "Busy or out of town",
                        activeBox: "border-red-500 bg-red-50 ring-1 ring-red-500",
                        activeIcon: "text-red-600",
                      },
                      {
                        value: "PENDING",
                        label: "Pending",
                        hint: "Need to check schedule",
                        activeBox: "border-orange-500 bg-orange-50 ring-1 ring-orange-500",
                        activeIcon: "text-orange-600",
                      },
                    ].map((opt) => {
                      const active = status === opt.value
                      return (
                        <label
                          key={opt.value}
                          className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm transition-all ${
                            active ? opt.activeBox : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={opt.value}
                            checked={active}
                            onChange={(e) => setStatus(e.target.value)}
                            className="sr-only"
                          />
                          <span className="flex flex-1 flex-col">
                            <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                            <span className="mt-1 text-xs text-slate-500">{opt.hint}</span>
                          </span>
                          <CheckCircle2 className={`h-5 w-5 ${active ? opt.activeIcon : "text-transparent"}`} />
                        </label>
                      )
                    })}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" /> Service Radius
                    </Label>
                    <div className="relative max-w-xs">
                      <Input
                        type="number"
                        min="0"
                        value={radius}
                        onChange={(e) => setRadius(e.target.value ? Number(e.target.value) : "")}
                        placeholder="e.g. 50"
                        className="pl-4 pr-12 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-base"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 text-sm font-medium">
                        miles
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" /> Current Address
                    </Label>
                    {typeof address === "string" && (
                      <MapboxAddressInput
                        id="crew-address"
                        placeholder="Start typing an address..."
                        defaultValue={address}
                        onAddressSelect={handleAddressSelect}
                      />
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Availability Notes
                    </Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="E.g. Only available for emergency calls this week, or on vacation until the 15th."
                      className="resize-none h-28 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-base p-4"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm font-medium h-6">
                      {availabilitySaved && (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Availability updated!
                        </span>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={savingAvailability}
                      className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-[#0077CC] hover:bg-[#005FA3] text-white shadow-md transition-all rounded-xl"
                    >
                      {savingAvailability ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                      {savingAvailability ? "Saving..." : "Save Availability"}
                    </Button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* Scope of work */}
          {showScope && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-slate-400" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your Scope of Work</h2>
              </div>

              {trades.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                  <p className="text-slate-500 text-sm">No scope has been assigned to you yet.</p>
                  <p className="text-slate-400 text-xs mt-1">Check back once your contractor assigns work.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trades.map((trade) => {
                    const isUpdating = updatingTradeUuid === trade.uuid
                    return (
                      <div
                        key={trade.uuid}
                        className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">{trade.trade_type}</h3>
                              {trade.project_title && (
                                <p className="text-xs text-slate-500">Project: {trade.project_title}</p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                              trade.status === "ACCEPTED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : trade.status === "REJECTED"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-orange-50 text-orange-700 border-orange-200"
                            }`}
                          >
                            {trade.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        {trade.agreed_price != null && (
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Agreed Price</div>
                            <h3 className="text-lg font-bold text-emerald-600">
                              ${Number(trade.agreed_price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </h3>
                          </div>
                        )}

                        {trade.scope_of_work && (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400" /> Scope Of Work
                            </p>
                            <div className="whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100 text-base leading-relaxed text-slate-700">
                              {trade.scope_of_work}
                            </div>
                          </div>
                        )}

                        {trade.materials_required?.length ? (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 uppercase font-semibold">Materials Required</p>
                            <ul className="list-disc pl-5 space-y-1 text-base text-slate-700">
                              {trade.materials_required.map((m, idx) => (
                                <li key={idx}>{m}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {trade.acceptance_criteria?.length ? (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 uppercase font-semibold">Acceptance Criteria</p>
                            <ul className="space-y-2">
                              {trade.acceptance_criteria.map((c, idx) => (
                                <li
                                  key={idx}
                                  className="flex gap-3 items-start text-slate-700 bg-green-50/50 p-3 rounded-lg border border-green-100/50"
                                >
                                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                                  <span className="text-base">{c.text}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {/* Tasks */}
                        {trade.tasks && trade.tasks.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <p className="text-xs text-slate-500 uppercase font-semibold pt-2">Tasks</p>
                            {trade.tasks.map((task) => {
                              const isExpanded = expandedTaskIds.includes(task.id)
                              return (
                                <div
                                  key={task.id}
                                  onClick={() =>
                                    setExpandedTaskIds((prev) =>
                                      isExpanded ? prev.filter((id) => id !== task.id) : [...prev, task.id]
                                    )
                                  }
                                  className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                                >
                                  <div
                                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                                      task.status === "COMPLETED"
                                        ? "bg-emerald-500"
                                        : task.status === "IN_PROGRESS"
                                        ? "bg-blue-500"
                                        : "bg-slate-300"
                                    }`}
                                  />
                                  <div className="flex justify-between items-center gap-2 pl-2">
                                    <h4
                                      className={`font-semibold text-sm ${
                                        task.status === "COMPLETED"
                                          ? "text-slate-500 line-through"
                                          : "text-slate-900"
                                      }`}
                                    >
                                      {task.title}
                                    </h4>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span
                                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                          task.status === "COMPLETED"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : task.status === "IN_PROGRESS"
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : "bg-slate-50 text-slate-600 border-slate-200"
                                        }`}
                                      >
                                        {(task.status || "NOT_STARTED").replace(/_/g, " ")}
                                      </span>
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-slate-400" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                      )}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div
                                      className="pl-2 pt-3 mt-2 border-t border-slate-100 space-y-3"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-xs font-medium text-slate-500">Status</span>
                                        <select
                                          value={task.status || "NOT_STARTED"}
                                          onChange={(e) =>
                                            handleTaskStatusChange(trade.uuid, task.id, e.target.value)
                                          }
                                          disabled={updatingTaskId === task.id}
                                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        >
                                          {TASK_STATUSES.map((s) => (
                                            <option key={s.value} value={s.value}>
                                              {s.label}
                                            </option>
                                          ))}
                                        </select>
                                        {updatingTaskId === task.id && (
                                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                        )}
                                      </div>
                                      {task.description && (
                                        <p className="text-[13px] text-slate-600 leading-relaxed">
                                          {task.description}
                                        </p>
                                      )}
                                      {(task.scheduled_start_date || task.scheduled_end_date) && (
                                        <div className="text-xs text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 w-fit">
                                          <Calendar className="w-3 h-3 text-slate-400" />
                                          {task.scheduled_start_date}
                                          {task.scheduled_end_date && (
                                            <span className="text-slate-400 mx-1">→</span>
                                          )}
                                          {task.scheduled_end_date}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Accept / Reject */}
                        {trade.status === "PENDING_ACCEPTANCE" && (
                          <div className="flex flex-col sm:flex-row gap-3 pt-1">
                            <Button
                              onClick={() => handleAcceptTrade(trade.uuid)}
                              disabled={isUpdating}
                              className="flex-1 h-12 text-base font-semibold bg-[#0077CC] hover:bg-[#005FA3] text-white shadow-md rounded-xl"
                            >
                              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                              Accept Scope
                            </Button>
                            <Button
                              onClick={() => handleRejectTrade(trade.uuid)}
                              disabled={isUpdating}
                              variant="outline"
                              className="flex-1 h-12 text-base font-semibold text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          <p className="text-center text-xs text-slate-400 font-medium pt-2">
            This is a secure, private link. Please do not share it.
          </p>
        </div>
      </div>
    </div>
  )
}
