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
import { ProjectRecords } from "@/components/projects/project-records"
import { ProjectFinancials } from "@/components/projects/financials/project-financials"
import { AppBreadcrumb } from "@/components/app-breadcrumb"
import { BriefPanel } from "@/components/projects/brief-panel"
import { ChevronDown, Loader2, User, Search, X, Pencil, Save, Calendar, Bold, Italic, List, ListOrdered } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { normalizeProjectBrief } from "@/lib/project-brief"
import ReactMarkdown from "react-markdown"

export default function ProjectDetailPage() {
  const params = useParams()
  const locale = useLocale()
  const t = useTranslations("projects.detail")
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [isEditingHeader, setIsEditingHeader] = useState(false)
  const [savingHeader, setSavingHeader] = useState(false)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftDescription, setDraftDescription] = useState("")
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null)

  const DESCRIPTION_TRUNCATE_CHARS = 200

  function insertMarkdown(type: "bold" | "italic" | "ul" | "ol") {
    const el = descriptionTextareaRef.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value } = el
    const sel = value.slice(s, e)
    let replacement = ""
    if (type === "bold")   replacement = `**${sel || "bold text"}**`
    if (type === "italic") replacement = `*${sel || "italic text"}*`
    if (type === "ul")     replacement = (sel || "item").split("\n").map(l => `- ${l}`).join("\n")
    if (type === "ol")     replacement = (sel || "item").split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n")
    const next = value.slice(0, s) + replacement + value.slice(e)
    setDraftDescription(next)
    // Restore focus & selection after React re-render
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s, s + replacement.length)
    })
  }

  const projectId = Number(params.id)
  const projectDescription = useMemo(() => {
    const objective = project?.objective?.trim()
    if (objective) return objective
    return ""
  }, [project?.objective])

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

  useEffect(() => {
    if (!project) return
    setDraftTitle(project.title || "")
    setDraftDescription(project.objective || "")
  }, [project?.id, project?.title, project?.objective])

  const refreshProject = async () => {
    if (!projectId) return
    const data = await api.getProject(projectId)
    setProject(data as Project)
  }

  const handleBriefUpdated = (brief: Record<string, any> | null) => {
    setProject((prev) => {
      if (!prev) return prev
      const normalized = normalizeProjectBrief(brief)
      return {
        ...prev,
        brief: normalized,
      }
    })
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

  const handleSaveHeader = async () => {
    if (!project) return
    const nextTitle = draftTitle.trim()
    if (!nextTitle) {
      toast({ title: "Project title is required", variant: "destructive" })
      return
    }
    setSavingHeader(true)
    try {
      const updated = await api.updateProject(project.id, {
        title: nextTitle,
        objective: draftDescription.trim() || undefined,
      }) as Project
      setProject(updated)
      setIsEditingHeader(false)
      toast({ title: "Project updated" })
    } catch (err) {
      console.error("Failed to update project header", err)
      toast({ title: "Failed to update project", variant: "destructive" })
    } finally {
      setSavingHeader(false)
    }
  }

  const handleCancelHeaderEdit = () => {
    if (!project) return
    setDraftTitle(project.title || "")
    setDraftDescription(project.objective || "")
    setIsEditingHeader(false)
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
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-10 pt-4 pb-0">

            {/* Row 1: breadcrumb left, Edit + Status right */}
            <div className="flex items-center justify-between gap-4 mb-2">
              <AppBreadcrumb
                items={[
                  { label: "Projects", href: `/${locale}/projects` },
                  { label: isEditingHeader ? (draftTitle || project.title) : project.title },
                ]}
              />
              <div className="flex items-center gap-2 shrink-0">
                {!isEditingHeader && (
                  <button
                    onClick={() => setIsEditingHeader(true)}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all shadow-sm hover:border-slate-400 hover:text-slate-900"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                <StatusDropdown status={project.status} onChange={handleStatusChange} />
              </div>
            </div>

            {/* Edit form OR display rows */}
            {isEditingHeader ? (
              <div className="max-w-4xl space-y-4 pb-3">
                <label className="block space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Project Title
                  </span>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Project title"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-2xl font-semibold tracking-tight text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200/70"
                  />
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Project Overview
                    </span>
                    <span className="text-[11px] text-slate-400">Supports markdown formatting.</span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-slate-200/70">
                    {/* Formatting toolbar */}
                    <div className="flex items-center gap-0.5 border-b border-slate-100 px-2 py-1.5">
                      {[
                        { type: "bold"   as const, icon: <Bold className="h-3.5 w-3.5" />,         title: "Bold" },
                        { type: "italic" as const, icon: <Italic className="h-3.5 w-3.5" />,       title: "Italic" },
                        { type: "ul"     as const, icon: <List className="h-3.5 w-3.5" />,         title: "Bullet list" },
                        { type: "ol"     as const, icon: <ListOrdered className="h-3.5 w-3.5" />,  title: "Numbered list" },
                      ].map(({ type, icon, title }) => (
                        <button
                          key={type}
                          type="button"
                          title={title}
                          onMouseDown={(e) => { e.preventDefault(); insertMarkdown(type) }}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <textarea
                      ref={descriptionTextareaRef}
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      placeholder="Add a concise summary of the job, goals, or important context. Use **bold**, *italic*, - bullets, or 1. numbered lists."
                      rows={5}
                      className="w-full resize-y px-4 py-3 text-sm leading-6 text-slate-700 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-slate-400">
                    The brief and other project views will use this context too.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelHeaderEdit}
                      disabled={savingHeader}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveHeader}
                      disabled={savingHeader}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingHeader ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save changes
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-8 mb-1">
                {/* Left: title + description */}
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight mb-2">
                    {project.title}
                  </h1>
                  {projectDescription && (() => {
                    const isLong = projectDescription.length > DESCRIPTION_TRUNCATE_CHARS
                    const displayed = isLong && !descriptionExpanded
                      ? projectDescription.slice(0, DESCRIPTION_TRUNCATE_CHARS).trimEnd() + "…"
                      : projectDescription
                    return (
                      <div>
                        <div className="text-sm text-slate-500 leading-relaxed [&>*:last-child]:mb-0">
                          <ReactMarkdown
                            components={{
                              p:      ({ ...props }) => <p className="mb-1.5 text-sm text-slate-500 leading-relaxed" {...props} />,
                              ul:     ({ ...props }) => <ul className="mb-1.5 list-disc space-y-0.5 pl-5 text-sm text-slate-500" {...props} />,
                              ol:     ({ ...props }) => <ol className="mb-1.5 list-decimal space-y-0.5 pl-5 text-sm text-slate-500" {...props} />,
                              li:     ({ ...props }) => <li className="leading-relaxed" {...props} />,
                              strong: ({ ...props }) => <strong className="font-semibold text-slate-700" {...props} />,
                              em:     ({ ...props }) => <em className="italic" {...props} />,
                            }}
                          >
                            {displayed}
                          </ReactMarkdown>
                        </div>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => setDescriptionExpanded(v => !v)}
                            className="mt-1 text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
                          >
                            {descriptionExpanded ? "Show less" : "Show more"}
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Right: date + client */}
                <div className="shrink-0 flex flex-col items-end gap-2 pt-1">
                  {(project.scheduled_start_date || project.scheduled_end_date) && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {project.scheduled_start_date
                          ? new Date(project.scheduled_start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "–"}
                        {" → "}
                        {project.scheduled_end_date
                          ? new Date(project.scheduled_end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "–"}
                      </span>
                    </div>
                  )}
                  <ClientPicker
                    projectId={project.id}
                    currentClientId={project.client_id}
                    onChange={handleClientChange}
                  />
                </div>
              </div>
            )}

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

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 lg:px-16 py-6 pb-24 md:pb-10">

            <TabsContent value="overview" className="mt-0 space-y-8">
              <ProjectRecords project={project} />
              <BriefPanel
                projectId={project.id}
                initialBrief={project.brief}
                initiallyExpanded
                onBriefUpdated={handleBriefUpdated}
              />
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
              <ProjectDocuments project={project} onRefresh={refreshProject} />
            </TabsContent>
          </main>
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

interface SimpleClient { id: number; name: string; phone?: string; email?: string; address?: string }

const AVATAR_COLORS = [
  "bg-violet-500", "bg-sky-500", "bg-emerald-500",
  "bg-orange-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500",
]

function clientInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function clientAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

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
  const [currentClient, setCurrentClient] = useState<SimpleClient | null>(null)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentClientId) { setCurrentClient(null); return }
    api.getClient(currentClientId)
      .then((data: any) => setCurrentClient(data))
      .catch(() => setCurrentClient(null))
  }, [currentClientId])

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
    return clients.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q))
  }, [clients, search])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-end gap-0.5 py-1 group text-right"
      >
        {currentClient ? (
          <>
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${clientAvatarColor(currentClient.name)}`}>
                {clientInitials(currentClient.name)}
              </div>
              <span className="font-semibold text-slate-900 text-sm">{currentClient.name}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
            {(currentClient.phone || currentClient.email) && (
              <div className="flex items-center gap-2 text-sm text-slate-400 pl-10">
                {currentClient.phone && <span>{currentClient.phone}</span>}
                {currentClient.phone && currentClient.email && <span className="text-slate-300">·</span>}
                {currentClient.email && <span>{currentClient.email}</span>}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm text-slate-400 group-hover:text-slate-600 transition-colors">Assign client</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 w-64 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
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
                    onClick={() => { onChange(null); setOpen(false); setCurrentClient(null) }}
                  >
                    <X className="w-3 h-3" /> Remove client
                  </button>
                )}
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    className={`w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                      c.id === currentClientId ? "bg-slate-50" : ""
                    }`}
                    onClick={() => { onChange(c.id); setOpen(false); setSearch(""); setCurrentClient(c) }}
                  >
                    <p className={`text-xs ${c.id === currentClientId ? "font-semibold" : ""} text-slate-900`}>{c.name}</p>
                    {(c.phone || c.email) && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {c.phone}{c.phone && c.email ? " · " : ""}{c.email}
                      </p>
                    )}
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
