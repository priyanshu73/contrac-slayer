"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import {
  ArrowLeft,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Pause,
  Play,
  Rocket,
  Search,
  Send,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react"

import { api } from "@/lib/api"
import type { CampaignDetail, DiscoveredCampaignLead } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCampaignStream, TERMINAL_STATUSES } from "@/hooks/use-campaign-stream"
import { sentenceCase, getLocationSummary, getSegmentSummary, formatDateTime } from "@/components/lead-generator-agent/shared"

// ─── Status → display mapping ──────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DRAFT:           "Draft",
  BRIEFING:        "Generating brief…",
  AWAITING_REVIEW: "Needs your approval",
  DISCOVERING:     "Finding businesses",
  GENERATING:      "Drafting emails",
  SENDING:         "Sending outreach",
  ACTIVE:          "Active",
  COMPLETED:       "Completed",
  PAUSED:          "Paused",
  FAILED:          "Failed",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:           "border-slate-200 bg-slate-50 text-slate-600",
  BRIEFING:        "border-sky-200 bg-sky-50 text-sky-700",
  AWAITING_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  DISCOVERING:     "border-sky-200 bg-sky-50 text-sky-700",
  GENERATING:      "border-violet-200 bg-violet-50 text-violet-700",
  SENDING:         "border-emerald-200 bg-emerald-50 text-emerald-700",
  ACTIVE:          "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETED:       "border-emerald-300 bg-emerald-50 text-emerald-800",
  PAUSED:          "border-slate-200 bg-slate-50 text-slate-600",
  FAILED:          "border-rose-200 bg-rose-50 text-rose-700",
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  DRAFT:           <FileText className="h-5 w-5" />,
  BRIEFING:        <Loader2 className="h-5 w-5 animate-spin" />,
  AWAITING_REVIEW: <Clock className="h-5 w-5" />,
  DISCOVERING:     <Search className="h-5 w-5 animate-pulse" />,
  GENERATING:      <Loader2 className="h-5 w-5 animate-spin" />,
  SENDING:         <Send className="h-5 w-5" />,
  ACTIVE:          <Send className="h-5 w-5" />,
  COMPLETED:       <CheckCircle2 className="h-5 w-5" />,
  PAUSED:          <Pause className="h-5 w-5" />,
  FAILED:          <XCircle className="h-5 w-5" />,
}

// ─── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-medium text-slate-700">{value}/{max}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Phase-specific timeline steps ──────────────────────────────────────────────

const PHASES = ["brief", "discovery", "emails", "sending", "complete"] as const
type Phase = typeof PHASES[number]

function getActivePhase(status: string | null, checkpoint: string | null): Phase {
  if (!status || status === "DRAFT") return "brief"
  if (status === "BRIEFING") return "brief"
  if (status === "DISCOVERING") return "discovery"
  if (status === "GENERATING") return "emails"
  if (status === "SENDING" || status === "ACTIVE") return "sending"
  if (status === "COMPLETED") return "complete"
  if (status === "AWAITING_REVIEW") {
    if (checkpoint === "brief") return "brief"
    if (checkpoint === "discovery") return "discovery"
    if (checkpoint === "messaging") return "emails"
    return "brief"
  }
  return "brief"
}

function PhaseTimeline({ activePhase }: { activePhase: Phase }) {
  const phaseLabels: Record<Phase, string> = {
    brief: "Brief",
    discovery: "Discovery",
    emails: "Emails",
    sending: "Sending",
    complete: "Done",
  }
  const phaseIndex = PHASES.indexOf(activePhase)

  return (
    <div className="flex items-center gap-1">
      {PHASES.map((phase, i) => {
        const isDone = i < phaseIndex
        const isCurrent = i === phaseIndex
        return (
          <div key={phase} className="flex items-center gap-1">
            <div
              className={[
                "flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium transition-all",
                isDone ? "bg-emerald-100 text-emerald-700" : "",
                isCurrent ? "bg-sky-100 text-sky-700 ring-1 ring-sky-300" : "",
                !isDone && !isCurrent ? "bg-slate-100 text-slate-400" : "",
              ].join(" ")}
            >
              {isDone ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
              {phaseLabels[phase]}
            </div>
            {i < PHASES.length - 1 && (
              <div className={`h-px w-3 ${isDone ? "bg-emerald-300" : "bg-slate-200"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

type PendingAction =
  | "brief" | "approve-brief" | "launch"
  | "approve-leads" | "reject-leads"
  | "approve-messaging" | "resume" | "pause" | "send"
  | null

export function CampaignDetailPage({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const locale = useLocale()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [stagedLeads, setStagedLeads] = useState<DiscoveredCampaignLead[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // SSE stream — active while campaign is running (not in terminal state)
  const streamActive = campaign ? !TERMINAL_STATUSES.has(campaign.status ?? "") : false
  const stream = useCampaignStream(campaign?.uuid, streamActive)

  // Effective state: prefer SSE (more real-time) over the loaded campaign
  const effectiveStatus = stream.status ?? campaign?.status ?? null
  const effectiveCheckpoint = stream.awaiting_checkpoint ?? campaign?.awaiting_checkpoint ?? null
  const progress = stream.job_progress

  // ── Load campaign ─────────────────────────────────────────────────────────────
  async function loadCampaign(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true)
      setError(null)
      const detail = await api.getCampaign(campaignId)
      setCampaign(detail)

      if (detail.awaiting_checkpoint === "discovery") {
        const staged = await api.getCampaignStagedLeads(campaignId)
        setStagedLeads(staged.leads)
        setSelectedLeadIds(staged.leads.map((l) => l.id))
      } else {
        setStagedLeads([])
        setSelectedLeadIds([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load campaign.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCampaign() }, [campaignId])

  // When SSE transitions to a terminal state, reload
  useEffect(() => {
    if (stream.status && TERMINAL_STATUSES.has(stream.status)) {
      loadCampaign(false)
    }
  }, [stream.status])

  // Polling fallback: reload every 10s for active campaigns if SSE is down
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const isActive = effectiveStatus && !TERMINAL_STATUSES.has(effectiveStatus) && effectiveStatus !== "DRAFT"
    if (isActive && !stream.connected) {
      pollRef.current = setInterval(() => loadCampaign(false), 10000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [effectiveStatus, stream.connected])

  async function runAction(action: PendingAction) {
    if (!campaign || !action) return
    try {
      setPendingAction(action)
      setError(null)
      if (action === "brief") await api.generateCampaignBrief(campaign.uuid)
      if (action === "approve-brief") await api.approveCampaignBrief(campaign.uuid)
      if (action === "launch") await api.launchCampaign(campaign.uuid)
      if (action === "approve-leads") await api.approveCampaignStagedLeads(campaign.uuid, selectedLeadIds)
      if (action === "reject-leads") await api.rejectCampaignStagedLeads(campaign.uuid, selectedLeadIds)
      if (action === "approve-messaging") await api.approveCampaignMessaging(campaign.uuid)
      if (action === "resume") await api.resumeCampaign(campaign.uuid)
      if (action === "pause") await api.pauseCampaign(campaign.uuid)
      if (action === "send") await api.sendCampaignBatch(campaign.uuid)
      await loadCampaign(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.")
    } finally {
      setPendingAction(null)
    }
  }

  async function handleDelete() {
    if (!campaign) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 4000)
      return
    }
    try {
      setPendingAction("pause")
      await api.deleteCampaign(campaign.uuid)
      router.push(`/${locale}/lead-generator-agent`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.")
      setPendingAction(null)
      setConfirmDelete(false)
    }
  }

  function toggleLead(id: number, checked: boolean) {
    setSelectedLeadIds((prev) => checked ? [...prev, id] : prev.filter((x) => x !== id))
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-6 text-sm text-rose-700">{error ?? "Campaign not found."}</CardContent>
        </Card>
      </div>
    )
  }

  const isCopilot = campaign.execution_mode === "REVIEW"
  const emailsSent = progress.emails_sent ?? campaign.email_drafts?.filter((d) => d.status === "SENT").length ?? 0
  const emailsTotal = progress.emails_total ?? campaign.email_drafts?.length ?? 0
  const leadsFound = progress.leads_found ?? campaign.leads?.length ?? 0
  const draftsGenerated = progress.drafts_generated ?? campaign.email_drafts?.length ?? 0
  const activePhase = getActivePhase(effectiveStatus, effectiveCheckpoint)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff_0%,_#ffffff_42%,_#f8fafc_100%)] pb-16">
      <main className="container mx-auto max-w-2xl px-4 py-6 space-y-5">

        {/* Back link */}
        <Button asChild variant="ghost" className="h-auto px-0 text-slate-500 hover:bg-transparent hover:text-slate-900">
          <Link href={`/${locale}/lead-generator-agent`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Campaigns
          </Link>
        </Button>

        {/* ── Header card ──────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          {/* Status + mode badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${STATUS_COLORS[effectiveStatus ?? "DRAFT"] ?? STATUS_COLORS.DRAFT}`}>
              {STATUS_ICONS[effectiveStatus ?? "DRAFT"]}
            </div>
            <Badge variant="outline" className={STATUS_COLORS[effectiveStatus ?? "DRAFT"] ?? STATUS_COLORS.DRAFT}>
              {STATUS_LABELS[effectiveStatus ?? "DRAFT"] ?? effectiveStatus}
            </Badge>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
              {isCopilot ? "Copilot" : "Autopilot"}
            </Badge>
          </div>

          {/* Name + meta */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{campaign.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {getLocationSummary(campaign.location)}
              <span>·</span>
              <span>{getSegmentSummary(campaign)}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-400">Updated {formatDateTime(campaign.updated_at)}</div>
          </div>

          {/* Phase timeline */}
          <PhaseTimeline activePhase={activePhase} />

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {!campaign.campaign_brief && effectiveStatus === "DRAFT" && (
              <ActionButton label="Generate Brief" icon={<Sparkles />} action="brief" pending={pendingAction} run={runAction} />
            )}
            {effectiveCheckpoint === "brief" && (
              <ActionButton label="Approve Brief" icon={<CheckCheck />} action="approve-brief" pending={pendingAction} run={runAction} variant="amber" />
            )}
            {effectiveStatus === "DRAFT" && (
              <ActionButton label="Launch Campaign" icon={<Rocket />} action="launch" pending={pendingAction} run={runAction} variant="primary" />
            )}
            {effectiveCheckpoint === "messaging" && (
              <ActionButton label="Approve & Send" icon={<Send />} action="approve-messaging" pending={pendingAction} run={runAction} variant="green" />
            )}
            {["ACTIVE", "SENDING", "DISCOVERING", "GENERATING"].includes(effectiveStatus ?? "") && (
              <ActionButton label="Pause" icon={<Pause />} action="pause" pending={pendingAction} run={runAction} variant="ghost" />
            )}
            {effectiveStatus === "PAUSED" && (
              <ActionButton label="Resume" icon={<Play />} action="resume" pending={pendingAction} run={runAction} />
            )}
            {effectiveStatus === "SENDING" && (
              <ActionButton label="Send Now" icon={<Send />} action="send" pending={pendingAction} run={runAction} />
            )}

            {/* Delete — far right */}
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                disabled={!!pendingAction}
                onClick={handleDelete}
                className={[
                  "rounded-xl transition-colors text-xs",
                  confirmDelete
                    ? "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "text-slate-400 hover:text-rose-600",
                ].join(" ")}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                {confirmDelete ? "Sure? Click again" : "Delete"}
              </Button>
            </div>
          </div>

          {/* Error display */}
          {(campaign.last_error || stream.last_error) && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {stream.last_error ?? campaign.last_error}
            </div>
          )}
        </div>

        {/* ── Phase progress cards ──────────────────────────────────────── */}

        {(effectiveStatus === "DISCOVERING" || effectiveStatus === "BRIEFING") && (
          <Card className="border-sky-200 bg-sky-50/60">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100">
                <Search className="h-6 w-6 text-sky-600 animate-pulse" />
              </div>
              <div>
                <div className="font-semibold text-sky-800">
                  {effectiveStatus === "BRIEFING" ? "Generating campaign brief…" : "Finding target businesses…"}
                </div>
                <div className="text-sm text-sky-600">
                  {effectiveStatus === "DISCOVERING"
                    ? `${leadsFound} business${leadsFound !== 1 ? "es" : ""} found so far`
                    : "Agent is preparing your campaign plan"}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {effectiveStatus === "GENERATING" && (
          <Card className="border-violet-200 bg-violet-50/60">
            <CardContent className="py-5 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                <div>
                  <div className="font-semibold text-violet-800">Drafting outreach emails…</div>
                  <div className="text-sm text-violet-600">AI is writing personalised emails for each lead</div>
                </div>
              </div>
              <ProgressBar value={draftsGenerated} max={emailsTotal || 1} label="Drafts ready" />
            </CardContent>
          </Card>
        )}

        {(effectiveStatus === "SENDING" || effectiveStatus === "ACTIVE") && (
          <Card className="border-emerald-200 bg-emerald-50/60">
            <CardContent className="py-5 space-y-3">
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-emerald-600" />
                <div>
                  <div className="font-semibold text-emerald-800">Sending outreach</div>
                  <div className="text-sm text-emerald-600">Up to 10 emails per day, spread over a 7-day window</div>
                </div>
              </div>
              <ProgressBar value={emailsSent} max={emailsTotal || 1} label="Emails sent" />
            </CardContent>
          </Card>
        )}

        {effectiveStatus === "COMPLETED" && (
          <Card className="border-emerald-300 bg-emerald-50">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div className="font-semibold text-emerald-800">Campaign complete</div>
                <div className="text-sm text-emerald-700">{emailsSent} email{emailsSent !== 1 ? "s" : ""} sent successfully</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Copilot: Brief review ────────────────────────────────────── */}
        {effectiveCheckpoint === "brief" && campaign.campaign_brief && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader>
              <CardTitle className="text-base">Review the campaign brief</CardTitle>
              <CardDescription>Approve this plan to start lead discovery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {campaign.campaign_brief?.campaign_goal && (
                <div className="rounded-xl border border-amber-100 bg-white p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1">Goal</div>
                  <p className="text-slate-700 leading-relaxed">{campaign.campaign_brief.campaign_goal}</p>
                </div>
              )}
              {campaign.campaign_brief?.summary && (
                <div className="rounded-xl border border-amber-100 bg-white p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 mb-1">Summary</div>
                  <p className="text-slate-700 leading-relaxed">{campaign.campaign_brief.summary}</p>
                </div>
              )}
              <Button
                className="w-full rounded-2xl bg-amber-600 hover:bg-amber-700"
                disabled={!!pendingAction}
                onClick={() => runAction("approve-brief")}
              >
                {pendingAction === "approve-brief" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                Approve Brief & Start Discovery
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Copilot: Lead review ─────────────────────────────────────── */}
        {effectiveCheckpoint === "discovery" && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader>
              <CardTitle className="text-base">Review staged leads</CardTitle>
              <CardDescription>{stagedLeads.length} businesses found. Select the ones to reach out to.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  className="rounded-xl bg-sky-600 hover:bg-sky-700"
                  size="sm"
                  disabled={!!pendingAction || selectedLeadIds.length === 0}
                  onClick={() => runAction("approve-leads")}
                >
                  {pendingAction === "approve-leads" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  Approve ({selectedLeadIds.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={!!pendingAction || selectedLeadIds.length === 0}
                  onClick={() => runAction("reject-leads")}
                >
                  Reject
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto rounded-xl text-xs text-slate-500"
                  onClick={() => setSelectedLeadIds(stagedLeads.map((l) => l.id))}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-xs text-slate-500"
                  onClick={() => setSelectedLeadIds([])}
                >
                  Clear
                </Button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-amber-100 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="w-8" />
                      <TableHead>Business</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stagedLeads.map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={(e) => toggleLead(lead.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900 text-sm">{lead.business_name}</div>
                          <div className="text-xs text-slate-400">{lead.website || lead.domain}</div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{lead.email || "—"}</TableCell>
                        <TableCell className="text-sm text-slate-600">{lead.score ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Copilot: Messaging review ────────────────────────────────── */}
        {effectiveCheckpoint === "messaging" && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader>
              <CardTitle className="text-base">Review email drafts</CardTitle>
              <CardDescription>{campaign.email_drafts?.length ?? 0} drafts ready. Approve to start sending.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700"
                disabled={!!pendingAction}
                onClick={() => runAction("approve-messaging")}
              >
                {pendingAction === "approve-messaging" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Approve All & Start Sending
              </Button>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(campaign.email_drafts ?? []).slice(0, 5).map((draft) => (
                  <div key={draft.uuid} className="rounded-xl border border-white bg-white p-3 shadow-sm">
                    <div className="font-medium text-slate-900 text-sm">{draft.subject}</div>
                    <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-500 line-clamp-2">{draft.body}</p>
                  </div>
                ))}
                {(campaign.email_drafts?.length ?? 0) > 5 && (
                  <div className="text-center text-xs text-slate-400">+{(campaign.email_drafts?.length ?? 0) - 5} more drafts</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Campaign brief (collapsed when not at checkpoint) ─────────── */}
        {campaign.campaign_brief && effectiveCheckpoint !== "brief" && (
          <details className="group rounded-2xl border border-slate-200 bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-medium text-slate-500 uppercase tracking-wide hover:text-slate-700">
              Campaign Brief
              <span className="text-xs normal-case text-slate-400 group-open:hidden">Click to expand</span>
            </summary>
            <div className="space-y-3 px-5 pb-4 text-sm text-slate-700">
              {campaign.campaign_brief?.campaign_goal && (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Goal</div>
                  <p className="leading-relaxed">{campaign.campaign_brief.campaign_goal}</p>
                </div>
              )}
              {campaign.campaign_brief?.target_segments && (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Targets</div>
                  <p className="leading-relaxed">
                    {(Array.isArray(campaign.campaign_brief.target_segments)
                      ? campaign.campaign_brief.target_segments
                          .map((s: any) => s?.type || s?.segment || String(s))
                          .filter(Boolean)
                          .join(", ")
                      : String(campaign.campaign_brief.target_segments))}
                  </p>
                </div>
              )}
              {campaign.campaign_brief?.target_geography && (
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">Geography</div>
                  <p className="leading-relaxed">
                    {(() => {
                      const geo = campaign.campaign_brief!.target_geography as any
                      if (typeof geo === "string") return geo
                      const parts: string[] = []
                      if (geo?.cities?.length) parts.push(geo.cities.join(", "))
                      if (geo?.state) parts.push(geo.state)
                      if (geo?.radius_miles) parts.push(`${geo.radius_miles} mi radius`)
                      return parts.join(" · ") || JSON.stringify(geo)
                    })()}
                  </p>
                </div>
              )}
            </div>
          </details>
        )}

        {/* ── Leads + Drafts summary (for post-discovery campaigns) ────── */}
        {(campaign.leads?.length ?? 0) > 0 && effectiveCheckpoint !== "discovery" && (
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Promoted Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-semibold text-slate-900">{campaign.leads?.length ?? 0}</div>
                  <div className="text-xs text-slate-500">Total leads</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-semibold text-slate-900">{campaign.email_drafts?.length ?? 0}</div>
                  <div className="text-xs text-slate-500">Emails drafted</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-center">
                  <div className="text-2xl font-semibold text-emerald-700">{emailsSent}</div>
                  <div className="text-xs text-emerald-600">Sent</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-semibold text-slate-900">{emailsTotal - emailsSent}</div>
                  <div className="text-xs text-slate-500">Queued</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Activity timeline ────────────────────────────────────────── */}
        {(campaign.events?.length ?? 0) > 0 && (
          <details className="group rounded-2xl border border-slate-200 bg-white" open={effectiveStatus === "COMPLETED" || effectiveStatus === "FAILED"}>
            <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-medium text-slate-500 uppercase tracking-wide hover:text-slate-700">
              Activity ({campaign.events?.length ?? 0})
              <span className="text-xs normal-case text-slate-400 group-open:hidden">Click to expand</span>
            </summary>
            <div className="space-y-2 px-5 pb-4">
              {[...(campaign.events ?? [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).map((event) => (
                <div key={event.uuid} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <div>
                    <div className="text-xs font-medium text-slate-700">{sentenceCase(event.event_type)}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{event.summary}</div>
                  </div>
                  <div className="shrink-0 text-[11px] text-slate-400">{formatDateTime(event.created_at)}</div>
                </div>
              ))}
            </div>
          </details>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

      </main>
    </div>
  )
}

// ─── Action button helper ────────────────────────────────────────────────────────

function ActionButton({
  label,
  icon,
  action,
  pending,
  run,
  variant = "outline",
}: {
  label: string
  icon: React.ReactNode
  action: PendingAction
  pending: PendingAction
  run: (a: PendingAction) => void
  variant?: "outline" | "primary" | "amber" | "green" | "ghost"
}) {
  const isLoading = pending === action
  const disabled = !!pending

  const classMap: Record<string, string> = {
    outline: "rounded-xl border-slate-200",
    primary: "rounded-xl bg-sky-600 hover:bg-sky-700 text-white border-0",
    amber:   "rounded-xl bg-amber-600 hover:bg-amber-700 text-white border-0",
    green:   "rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-0",
    ghost:   "rounded-xl text-slate-500 hover:text-slate-700 border-0",
  }

  return (
    <Button
      size="sm"
      variant={variant === "ghost" ? "ghost" : variant === "outline" ? "outline" : "default"}
      className={classMap[variant]}
      disabled={disabled}
      onClick={() => run(action)}
    >
      {isLoading
        ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        : <span className="mr-1.5 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      }
      {label}
    </Button>
  )
}
