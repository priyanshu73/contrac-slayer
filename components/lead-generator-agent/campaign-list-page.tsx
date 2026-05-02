"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Pause,
  Play,
  Rocket,
  Search,
  Send,
  Zap,
} from "lucide-react"

import { api } from "@/lib/api"
import type { Campaign } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  formatDateTime,
  getLocationSummary,
  getSegmentSummary,
  sentenceCase,
} from "@/components/lead-generator-agent/shared"

// ─── Status display mapping ─────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT:           { label: "Draft",              color: "border-slate-200 bg-slate-50 text-slate-600",   icon: <FileText className="h-3.5 w-3.5" /> },
  BRIEFING:        { label: "Generating brief",   color: "border-sky-200 bg-sky-50 text-sky-700",        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  AWAITING_REVIEW: { label: "Needs approval",     color: "border-amber-200 bg-amber-50 text-amber-700",  icon: <Clock className="h-3.5 w-3.5" /> },
  DISCOVERING:     { label: "Finding leads",      color: "border-sky-200 bg-sky-50 text-sky-700",        icon: <Search className="h-3.5 w-3.5 animate-pulse" /> },
  GENERATING:      { label: "Drafting emails",    color: "border-violet-200 bg-violet-50 text-violet-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  SENDING:         { label: "Sending",            color: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <Send className="h-3.5 w-3.5" /> },
  ACTIVE:          { label: "Active",             color: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: <Send className="h-3.5 w-3.5" /> },
  COMPLETED:       { label: "Completed",          color: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  PAUSED:          { label: "Paused",             color: "border-slate-200 bg-slate-100 text-slate-600",  icon: <Pause className="h-3.5 w-3.5" /> },
  FAILED:          { label: "Failed",             color: "border-rose-200 bg-rose-50 text-rose-700",     icon: null },
}

const CHECKPOINT_CTA: Record<string, string> = {
  brief: "Review brief",
  discovery: "Review leads",
  messaging: "Review emails",
}

// ─── "In progress" status set ────────────────────────────────────────────────────
const ACTIVE_STATUSES = new Set(["BRIEFING", "DISCOVERING", "GENERATING", "SENDING", "ACTIVE"])

// Mini progress bar for sending campaigns
function MiniProgressBar({ sent, total }: { sent: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Emails sent</span>
        <span className="font-medium text-slate-700">{sent}/{total}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

type ActionState = Record<string, string | undefined>

export function CampaignListPage() {
  const locale = useLocale()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionState, setActionState] = useState<ActionState>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function loadCampaigns(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true)
      setError(null)
      const data = await api.getCampaigns()
      setCampaigns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load campaigns.")
    } finally {
      setLoading(false)
    }
  }

  // Initial load + polling every 8s if any campaign is in-progress
  useEffect(() => {
    loadCampaigns()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // Start/stop polling based on campaign phase — not a blanket 8s hammer.
  // BRIEFING/DISCOVERING/GENERATING: fast phase, poll every 15s (things change quickly)
  // SENDING/ACTIVE: cron runs every 90s max — poll every 3 minutes is plenty
  // AWAITING_REVIEW: waiting for user, no need to poll at all
  // Terminal/DRAFT: no polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null

    const fastPhases = new Set(["BRIEFING", "DISCOVERING", "GENERATING"])
    const slowPhases = new Set(["SENDING", "ACTIVE"])
    const hasFast = campaigns.some((c) => fastPhases.has(c.status))
    const hasSlow = campaigns.some((c) => slowPhases.has(c.status))

    if (hasFast) {
      pollRef.current = setInterval(() => loadCampaigns(false), 15_000)
    } else if (hasSlow) {
      pollRef.current = setInterval(() => loadCampaigns(false), 3 * 60_000)
    }
    // AWAITING_REVIEW, DRAFT, terminal: no polling needed

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [campaigns])

  async function handleAction(campaign: Campaign, action: "generate" | "launch" | "resume" | "pause") {
    try {
      setActionState((s) => ({ ...s, [campaign.uuid]: action }))
      if (action === "generate") await api.generateCampaignBrief(campaign.uuid)
      if (action === "launch") await api.launchCampaign(campaign.uuid)
      if (action === "resume") await api.resumeCampaign(campaign.uuid)
      if (action === "pause") await api.pauseCampaign(campaign.uuid)
      await loadCampaigns(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign action failed.")
    } finally {
      setActionState((s) => ({ ...s, [campaign.uuid]: undefined }))
    }
  }

  const draftCount = campaigns.filter((c) => c.status === "DRAFT").length
  const reviewCount = campaigns.filter((c) => c.status === "AWAITING_REVIEW").length
  const activeCount = campaigns.filter((c) => ACTIVE_STATUSES.has(c.status)).length
  const completedCount = campaigns.filter((c) => c.status === "COMPLETED").length

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.15),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_48%,_#f8fafc_100%)] pb-16">
      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="space-y-6">

          {/* ── Page header ─────────────────────────────────────────────── */}
          <section className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <Badge className="border-sky-200 bg-sky-50 text-sky-700" variant="outline">
                  Lead Generator Agent
                </Badge>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Outbound Campaigns
                </h1>
                <p className="text-sm text-slate-500">
                  Plan, launch, and monitor your automated lead outreach.
                </p>
              </div>
              <Button asChild className="rounded-xl bg-sky-600 hover:bg-sky-700">
                <Link href={`/${locale}/lead-generator-agent/new`}>
                  <Zap className="mr-2 h-4 w-4" />
                  New Campaign
                </Link>
              </Button>
            </div>
          </section>

          {/* ── Summary counters ───────────────────────────────────────── */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Drafts", value: draftCount, cls: "border-slate-200 bg-white" },
              { label: "Needs review", value: reviewCount, cls: "border-amber-200 bg-amber-50/60" },
              { label: "In progress", value: activeCount, cls: "border-emerald-200 bg-emerald-50/60" },
              { label: "Completed", value: completedCount, cls: "border-sky-200 bg-sky-50/60" },
            ].map((s) => (
              <Card key={s.label} className={`gap-1 ${s.cls}`}>
                <CardHeader className="pb-0 pt-4 px-4">
                  <CardDescription className="text-xs">{s.label}</CardDescription>
                  <CardTitle className="text-2xl">{s.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </section>

          {/* ── Campaign cards ──────────────────────────────────────────── */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <Empty className="rounded-3xl border border-slate-200 bg-white py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Bot />
                </EmptyMedia>
                <EmptyTitle>Launch your first campaign</EmptyTitle>
                <EmptyDescription>
                  Find target businesses, draft personalised outreach, and send — all on autopilot.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild className="rounded-xl bg-sky-600 hover:bg-sky-700">
                  <Link href={`/${locale}/lead-generator-agent/new`}>Create Campaign</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const meta = STATUS_META[campaign.status] ?? STATUS_META.DRAFT
                const pending = actionState[campaign.uuid]
                const isActive = ACTIVE_STATUSES.has(campaign.status)
                const progress = campaign.job_progress

                return (
                  <Link
                    key={campaign.uuid}
                    href={`/${locale}/lead-generator-agent/${campaign.uuid}`}
                    className="block group"
                  >
                    <Card className={`relative overflow-hidden transition-all hover:shadow-md border-slate-200 bg-white/95 ${isActive ? "ring-1 ring-sky-200" : ""}`}>
                      {/* Active glow stripe */}
                      {isActive && (
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-400" />
                      )}

                      <CardContent className="flex items-center gap-4 py-4 px-5">
                        {/* Left: status icon */}
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                          {meta.icon}
                        </div>

                        {/* Center: details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900 truncate">{campaign.name}</span>
                            <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${meta.color}`}>
                              {meta.label}
                            </Badge>
                            <Badge variant="outline" className="text-[11px] px-1.5 py-0 border-slate-200 bg-slate-50 text-slate-500">
                              {campaign.execution_mode === "REVIEW" ? "Copilot" : "Autopilot"}
                            </Badge>
                          </div>

                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {getLocationSummary(campaign.location)}
                            </span>
                            <span className="hidden sm:inline">·</span>
                            <span className="hidden sm:inline">{getSegmentSummary(campaign)}</span>
                          </div>

                          {/* Checkpoint CTA */}
                          {campaign.awaiting_checkpoint && CHECKPOINT_CTA[campaign.awaiting_checkpoint] && (
                            <div className="mt-1.5 text-xs font-medium text-amber-700">
                              → {CHECKPOINT_CTA[campaign.awaiting_checkpoint]}
                            </div>
                          )}

                          {/* Mini progress for sending campaigns */}
                          {(campaign.status === "SENDING" || campaign.status === "ACTIVE") && progress && (
                            <MiniProgressBar
                              sent={progress.emails_sent ?? 0}
                              total={progress.emails_total ?? 0}
                            />
                          )}

                          {/* Live status for discovering */}
                          {campaign.status === "DISCOVERING" && progress && (
                            <div className="mt-1.5 text-xs text-sky-600 font-medium">
                              {progress.leads_found ?? 0} businesses found so far…
                            </div>
                          )}
                        </div>

                        {/* Right: quick actions + chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Quick action buttons — stop propagation to not navigate */}
                          {campaign.status === "DRAFT" && (
                            <Button
                              size="sm"
                              className="rounded-lg bg-sky-600 hover:bg-sky-700 text-xs h-8"
                              disabled={!!pending}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(campaign, "launch") }}
                            >
                              {pending === "launch" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Rocket className="mr-1 h-3 w-3" />}
                              Launch
                            </Button>
                          )}
                          {campaign.status === "PAUSED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg text-xs h-8"
                              disabled={!!pending}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(campaign, "resume") }}
                            >
                              {pending === "resume" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                              Resume
                            </Button>
                          )}
                          {ACTIVE_STATUSES.has(campaign.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-lg text-xs h-8 text-slate-400 hover:text-slate-700"
                              disabled={!!pending}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(campaign, "pause") }}
                            >
                              {pending === "pause" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Pause className="mr-1 h-3 w-3" />}
                              Pause
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

          {error && (
            <Card className="border-rose-200 bg-rose-50/70">
              <CardContent className="pt-6 text-sm text-rose-700">{error}</CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
