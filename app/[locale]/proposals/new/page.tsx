"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { ArrowLeft, Check, ChevronsUpDown, FileText, FolderOpen, Plus, ScrollText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Job, Proposal, ProjectListItem } from "@/lib/types"

const PROJECTS_PAGE_SIZE = 20
const QUOTES_PAGE_SIZE = 20

function getStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case "PLANNING": return "bg-amber-500/15 text-amber-700"
    case "IN_PROGRESS": return "bg-sky-500/15 text-sky-700"
    case "ON_HOLD": return "bg-orange-500/15 text-orange-700"
    case "COMPLETED": return "bg-teal-500/15 text-teal-700"
    case "CANCELLED": return "bg-rose-500/15 text-rose-700"
    default: return "bg-muted text-muted-foreground"
  }
}

function formatStatusLabel(status: string) {
  return String(status || "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

interface ProjectWithProposals extends ProjectListItem {
  proposals?: Proposal[]
}

function quoteLabel(q: Job) {
  const title = q.title || q.job_number || `Quote #${q.id}`
  return q.client?.name ? `${title} — ${q.client.name}` : title
}

export default function NewProposalPage() {
  const router = useRouter()
  const locale = useLocale()

  // Quote combobox state
  const [quotes, setQuotes] = useState<Job[]>([])
  const [selectedQuote, setSelectedQuote] = useState<Job | null>(null)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteSearch, setQuoteSearch] = useState("")
  const [loadingQuotes, setLoadingQuotes] = useState(true)
  const [loadingMoreQuotes, setLoadingMoreQuotes] = useState(false)
  const [quotesSkip, setQuotesSkip] = useState(0)
  const [hasMoreQuotes, setHasMoreQuotes] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Projects state
  const [projects, setProjects] = useState<ProjectWithProposals[]>([])
  const [loading, setLoading] = useState(true)
  const [projectsSkip, setProjectsSkip] = useState(0)
  const [allProjectsLoaded, setAllProjectsLoaded] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [creatingFor, setCreatingFor] = useState<number | null>(null)

  // Fetch quotes — fresh search resets list; loadMore appends
  const fetchQuotes = useCallback(async (search: string, skip: number, append: boolean) => {
    if (append) setLoadingMoreQuotes(true)
    else setLoadingQuotes(true)
    try {
      const result = await api.getMyJobs(undefined, skip, QUOTES_PAGE_SIZE, undefined, search || undefined)
      const batch = Array.isArray(result) ? (result as Job[]) : []
      setHasMoreQuotes(batch.length === QUOTES_PAGE_SIZE)
      setQuotesSkip(skip + batch.length)
      setQuotes((prev) => (append ? [...prev, ...batch] : batch))
    } catch {
      if (!append) setQuotes([])
    } finally {
      if (append) setLoadingMoreQuotes(false)
      else setLoadingQuotes(false)
    }
  }, [])

  // Debounce search — always resets to page 0
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void fetchQuotes(quoteSearch, 0, false), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [quoteSearch, fetchQuotes])

  // Load a page of projects, optionally appending to the existing list
  const loadProjects = useCallback(async (skip: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else setLoading(true)

    try {
      const result = await api.getProjects({ skip, limit: PROJECTS_PAGE_SIZE })
      const batch = (Array.isArray(result) ? (result as ProjectWithProposals[]) : []).sort((a, b) =>
        String(a.title || `Project #${a.id}`).localeCompare(
          String(b.title || `Project #${b.id}`),
          undefined,
          { sensitivity: "base" }
        )
      )

      if (batch.length < PROJECTS_PAGE_SIZE) setAllProjectsLoaded(true)
      setProjectsSkip(skip + batch.length)
      setProjects((prev) => (append ? [...prev, ...batch] : batch))

      // Lazy-load proposal counts for this batch in the background
      batch.forEach(async (project) => {
        try {
          const proposals = (await api.getProjectProposals(project.id)) as Proposal[]
          setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, proposals } : p)))
        } catch {
          // non-fatal — proposal count just won't show
        }
      })
    } catch {
      if (!append) setProjects([])
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects(0, false)
  }, [loadProjects])

  const handleCreateFromQuote = () => {
    if (!selectedQuote) return
    router.push(`/${locale}/quotes/${selectedQuote.id}/proposal`)
  }

  const handleNewProposal = async (project: ProjectWithProposals) => {
    setCreatingFor(project.id)
    try {
      const proposal = (await api.createProposal(project.id, {
        title: `${project.title} Proposal`,
      })) as Proposal
      router.push(`/${locale}/projects/${project.id}/proposals/${proposal.id}`)
    } catch (err: any) {
      console.error("Failed to create proposal:", err)
      setCreatingFor(null)
    }
  }

  const openExistingProposal = (projectId: number, proposalId: number) => {
    router.push(`/${locale}/projects/${projectId}/proposals/${proposalId}`)
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold leading-none">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Create Proposal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Pick a quote or project to create a proposal for</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* ── From a Quote ── */}
        <div className="mb-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">From a quote</p>
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <Popover open={quoteOpen} onOpenChange={setQuoteOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={quoteOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate text-left">
                        {selectedQuote ? quoteLabel(selectedQuote) : "Search by client name or quote title…"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[min(560px,calc(100vw-2rem))] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Client name or quote title…"
                        value={quoteSearch}
                        onValueChange={setQuoteSearch}
                      />
                      <CommandList className="max-h-72">
                        {loadingQuotes ? (
                          <CommandEmpty>Loading…</CommandEmpty>
                        ) : quotes.length === 0 ? (
                          <CommandEmpty>No quotes found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {quotes.map((quote) => {
                              const hasProposal = !!quote.proposal_document
                              const isSelected = selectedQuote?.id === quote.id
                              return (
                                <CommandItem
                                  key={quote.id}
                                  value={String(quote.id)}
                                  onSelect={() => {
                                    setSelectedQuote(isSelected ? null : quote)
                                    setQuoteOpen(false)
                                  }}
                                  className="gap-3 py-2.5"
                                >
                                  <Check
                                    className={cn(
                                      "h-4 w-4 shrink-0",
                                      isSelected ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="flex items-center gap-2">
                                      <span className="truncate text-sm font-medium">
                                        {quote.title || quote.job_number || `Quote #${quote.id}`}
                                      </span>
                                      {hasProposal && (
                                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                                          <ScrollText className="h-2.5 w-2.5" />
                                          Has proposal
                                        </span>
                                      )}
                                    </span>
                                    {quote.client?.name && (
                                      <span className="truncate text-xs text-muted-foreground">
                                        {quote.client.name}
                                      </span>
                                    )}
                                  </span>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        )}
                        {hasMoreQuotes && (
                          <div className="border-t px-2 py-1.5">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                void fetchQuotes(quoteSearch, quotesSkip, true)
                              }}
                              disabled={loadingMoreQuotes}
                              className="w-full rounded-sm py-1.5 text-center text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                            >
                              {loadingMoreQuotes ? "Loading…" : "Load more"}
                            </button>
                          </div>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateFromQuote}
                disabled={!selectedQuote}
                className="shrink-0 md:self-auto"
              >
                <span className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Create Proposal
                </span>
              </Button>
            </div>
          </Card>
        </div>

        {/* ── From a Project ── */}
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">From a project</p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex animate-pulse items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-48 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-28 rounded bg-muted" />
                </div>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="mb-1 text-base font-semibold">No projects yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create a project first, then build a proposal for it.
                </p>
                <Button size="sm" onClick={() => router.push(`/${locale}/projects`)}>
                  Go to Projects
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {projects.map((project) => {
                const proposalCount = project.proposals?.length ?? null
                const isCreating = creatingFor === project.id

                return (
                  <Card key={project.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">{project.title}</h3>
                          <Badge className={`shrink-0 px-1.5 py-0 text-[10px] ${getStatusColor(project.status)}`}>
                            {formatStatusLabel(project.status)}
                          </Badge>
                          {proposalCount !== null && proposalCount > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {proposalCount} proposal{proposalCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        {project.proposals && project.proposals.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {project.proposals.map((proposal) => (
                              <button
                                key={proposal.id}
                                onClick={() => openExistingProposal(project.id, proposal.id)}
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {proposal.title || `Proposal #${proposal.id}`}
                                </span>
                                <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                                  proposal.status === "SENT" ? "bg-blue-100 text-blue-700" :
                                  proposal.status === "VIEWED" ? "bg-violet-100 text-violet-700" :
                                  "bg-muted text-muted-foreground"
                                }`}>
                                  {proposal.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleNewProposal(project)}
                        disabled={isCreating}
                        className="shrink-0"
                      >
                        {isCreating ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Creating…
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Plus className="h-3.5 w-3.5" />
                            New Proposal
                          </span>
                        )}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>

            {!allProjectsLoaded && (
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => void loadProjects(projectsSkip, true)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Loading…
                  </span>
                ) : (
                  "Load more projects"
                )}
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
