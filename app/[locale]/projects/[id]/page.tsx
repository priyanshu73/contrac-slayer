"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useParams } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { api } from "@/lib/api"
import type { Project, ProjectTask, ProjectTrade } from "@/lib/types"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { GooeyFilter } from "@/components/ui/gooey-filter"
import { ProjectTasks } from "@/components/projects/project-tasks"
import { ProjectDocuments } from "@/components/projects/project-documents"
import { TradesScopes } from "@/components/projects/trades-scopes"
import { ProjectQuotes } from "@/components/projects/project-quotes"
import { ProjectFinancials } from "@/components/projects/financials/project-financials"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { BriefPanel } from "@/components/projects/brief-panel"
import { ChevronDown, Loader2, User, Search, X, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ProjectDetailPage() {
  const params = useParams()
  const locale = useLocale()
  const t = useTranslations("projects.detail")
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBrief, setShowBrief] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  const projectId = Number(params.id)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const data = await api.getProject(projectId)
        if (!cancelled) setProject(data as Project)
      } catch (err) {
        console.error("Failed to load project", err)
        if (!cancelled) setProject(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [projectId])

  const refreshProject = async () => {
    if (!projectId) return
    const data = await api.getProject(projectId)
    setProject(data as Project)
  }

  const handleTasksUpdated = (tasks: ProjectTask[]) => {
    setProject((prev) => (prev ? { ...prev, tasks } : prev))
  }

  const handleTradesUpdated = (trades: ProjectTrade[]) => {
    setProject((prev) => (prev ? { ...prev, trades } : prev))
  }

  const handleClientChange = async (newClientId: number | null) => {
    if (!project) return
    const prevClientId = project.client_id
    setProject({ ...project, client_id: newClientId ?? undefined })
    try {
      await api.updateProject(project.id, { client_id: newClientId })
      toast({ title: "Client updated" })
    } catch (err) {
      console.error("Failed to update client", err)
      setProject({ ...project, client_id: prevClientId })
      toast({ title: "Failed to update client", variant: "destructive" })
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!project) return
    const prevStatus = project.status
    setProject({ ...project, status: newStatus as Project["status"] })
    try {
      await api.updateProject(project.id, { status: newStatus })
    } catch (err) {
      console.error("Failed to update status", err)
      setProject({ ...project, status: prevStatus })
    }
  }

  if (!project || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-10 pt-3 pb-0">

            {/* Top row: breadcrumb left, actions right */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <AppBreadcrumb
                  items={[
                    { label: "Projects", href: `/${locale}/projects` },
                    { label: project.title },
                  ]}
                />
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight leading-tight line-clamp-1">
                  {project.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2">
                  {(project.scheduled_start_date || project.scheduled_end_date) && (
                    <span className="text-xs text-slate-500">
                      {project.scheduled_start_date
                        ? new Date(project.scheduled_start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "–"}
                      {" → "}
                      {project.scheduled_end_date
                        ? new Date(project.scheduled_end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "–"}
                    </span>
                  )}
                  <ClientPicker
                    projectId={project.id}
                    currentClientId={project.client_id}
                    onChange={handleClientChange}
                  />
                  {project.objective && (
                    <span className="text-xs text-slate-400 line-clamp-1">· {project.objective}</span>
                  )}
                </div>
              </div>

              {/* Right: status + contract value + brief */}
              <div className="flex items-center gap-2 shrink-0 pt-1">
                <StatusDropdown status={project.status} onChange={handleStatusChange} />
                {project.contract_value != null && (
                  <p className="text-sm font-semibold text-slate-900 border-l border-slate-200 pl-3">
                    {t("contractValue", { amount: project.contract_value })}
                  </p>
                )}
                <button
                  onClick={() => setShowBrief((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all shadow-sm ${
                    showBrief
                      ? "bg-[#1565C0] border-[#1565C0] text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  Brief
                </button>
              </div>
            </div>

            {/* Bottom row: gooey tabs */}
            {(() => {
              const TABS = [
                { value: "overview",   label: "Overview" },
                { value: "scope",      label: "Scope & Tasks" },
                { value: "financials", label: t("tabs.financials") || "Financials" },
                { value: "files",      label: "Files" },
              ]
              return (
                <div className="relative flex overflow-x-auto">
                  <GooeyFilter id="project-tab-goo" strength={6} />

                  {/* Blob layer — filter applied here so text stays crisp */}
                  <div className="absolute inset-0 flex pointer-events-none" style={{ filter: "url(#project-tab-goo)" }}>
                    {TABS.map(({ value, label }) => (
                      <div
                        key={value}
                        className="relative h-9 px-4 flex items-center text-sm font-medium invisible"
                        aria-hidden
                      >
                        {label}
                        {activeTab === value && (
                          <motion.div
                            layoutId="project-active-tab"
                            className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-slate-800"
                            transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Text layer — no filter, crisp text */}
                  {TABS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setActiveTab(value)}
                      className={`relative h-9 px-4 text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === value ? "text-slate-900" : "text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )
            })()}

          </div>
        </div>

        {/* Body: tab content + brief sidebar */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 lg:px-16 py-6 pb-24 md:pb-10">

            {/* Overview — Quotes */}
            <TabsContent value="overview" className="mt-0">
              <ProjectQuotes project={project} />
            </TabsContent>

            {/* Scope & Tasks */}
            <TabsContent value="scope" className="mt-0 space-y-8">
              <TradesScopes project={project} onTradesUpdated={handleTradesUpdated} />
              <ProjectTasks project={project} onTasksUpdated={handleTasksUpdated} />
            </TabsContent>

            {/* Financials */}
            <TabsContent value="financials" className="mt-0">
              <ProjectFinancials project={project} onProjectUpdated={refreshProject} />
            </TabsContent>

            {/* Files */}
            <TabsContent value="files" className="mt-0">
              <ProjectDocuments project={project} />
            </TabsContent>
          </main>

          {showBrief && (
            <aside className="w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-white hidden lg:block">
              <BriefPanel
                projectId={project.id}
                initialBrief={project.brief}
                onClose={() => setShowBrief(false)}
              />
            </aside>
          )}
        </div>
      </Tabs>
    </div>
  )
}

// ─── StatusDropdown ───────────────────────────────────────────────────────────

function StatusDropdown({ status, onChange }: { status: Project["status"]; onChange: (newStatus: string) => void }) {
  const t = useTranslations("projects.status")
  let color = "bg-slate-50 text-slate-700 border-slate-200"
  if (status === "COMPLETED") color = "bg-emerald-50 text-emerald-700 border-emerald-200"
  else if (status === "IN_PROGRESS") color = "bg-sky-50 text-sky-700 border-sky-200"
  else if (status === "ON_HOLD") color = "bg-amber-50 text-amber-700 border-amber-200"
  else if (status === "CANCELLED") color = "bg-rose-50 text-rose-700 border-rose-200"

  const STATUS_OPTIONS = ["PLANNING", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]

  return (
    <div className="relative inline-flex items-center group">
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>{t(opt.toLowerCase() as any)}</option>
        ))}
      </select>
      <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide border shadow-sm transition-all group-hover:shadow-md ${color}`}>
        <span>{t(status.toLowerCase() as any)}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </div>
    </div>
  )
}

// ─── ClientPicker ─────────────────────────────────────────────────────────────

interface SimpleClient { id: number; name: string; phone?: string }

function ClientPicker({
  projectId,
  currentClientId,
  onChange,
}: {
  projectId: number
  currentClientId?: number
  onChange: (clientId: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<SimpleClient[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.getClients(0, 200)
      .then((data: any) => setClients(Array.isArray(data) ? data : data?.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone?.includes(q))
  }, [clients, search])

  const current = clients.find((c) => c.id === currentClientId)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-all shadow-sm"
      >
        <User className="w-3 h-3" />
        {current ? current.name : <span className="text-slate-400">Assign Client</span>}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-56 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">No clients found</p>
            ) : (
              <>
                {currentClientId && (
                  <button
                    className="w-full px-3 py-2 text-left text-xs text-rose-500 hover:bg-rose-50 flex items-center gap-1.5 border-b border-slate-100"
                    onClick={() => { onChange(null); setOpen(false) }}
                  >
                    <X className="w-3 h-3" /> Remove client
                  </button>
                )}
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors ${
                      c.id === currentClientId ? "bg-slate-50 font-semibold" : ""
                    }`}
                    onClick={() => { onChange(c.id); setOpen(false); setSearch("") }}
                  >
                    <span className="text-slate-900">{c.name}</span>
                    {c.phone && <span className="text-slate-400 ml-1.5">{c.phone}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
