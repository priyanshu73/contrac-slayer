"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useLocale } from "next-intl"
import { ArrowLeft, CheckCheck, LoaderCircle, Pause, Play, Rocket, RotateCcw, Send, Sparkles } from "lucide-react"

import { api } from "@/lib/api"
import type { CampaignDetail, DiscoveredCampaignLead } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  formatDateTime,
  getCampaignStatusTone,
  getCheckpointLabel,
  getExpectedScenario,
  getForecastRangeText,
  getLocationSummary,
  sentenceCase,
} from "@/components/lead-generator-agent/shared"

type PendingAction =
  | "brief"
  | "approve-brief"
  | "launch"
  | "approve-leads"
  | "reject-leads"
  | "approve-messaging"
  | "resume"
  | "pause"
  | "refill"
  | "send"
  | null

export function CampaignDetailPage({ campaignId }: { campaignId: string }) {
  const locale = useLocale()
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null)
  const [stagedLeads, setStagedLeads] = useState<DiscoveredCampaignLead[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadCampaign() {
    try {
      setError(null)
      setLoading(true)
      const detail = await api.getCampaign(campaignId)
      setCampaign(detail)

      if (detail.awaiting_checkpoint === "discovery") {
        const staged = await api.getCampaignStagedLeads(campaignId)
        setStagedLeads(staged.leads)
        setSelectedLeadIds(staged.leads.slice(0, Math.min(5, staged.leads.length)).map((lead) => lead.id))
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

  useEffect(() => {
    loadCampaign()
  }, [campaignId])

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
      if (action === "refill") await api.refillCampaign(campaign.uuid)
      if (action === "send") await api.sendCampaignBatch(campaign.uuid)

      await loadCampaign()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign action failed.")
    } finally {
      setPendingAction(null)
    }
  }

  function toggleLead(leadId: number, checked: boolean) {
    setSelectedLeadIds((current) => (
      checked ? [...current, leadId] : current.filter((id) => id !== leadId)
    ))
  }

  const expectedScenario = campaign ? getExpectedScenario(campaign) : null
  const preferredChannel = campaign?.discovery_forecast?.preferred_channel ?? "email"
  const latestOpenEvents = useMemo(() => (
    (campaign?.events ?? []).slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  ), [campaign])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fbff_0%,_#ffffff_42%,_#f8fafc_100%)] pb-16">
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Button asChild variant="ghost" className="h-auto px-0 text-slate-500 hover:bg-transparent hover:text-slate-900">
              <Link href={`/${locale}/lead-generator-agent`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to campaigns
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : !campaign ? (
            <Card className="border-rose-200 bg-rose-50/70">
              <CardContent className="pt-6 text-sm text-rose-700">{error ?? "Campaign not found."}</CardContent>
            </Card>
          ) : (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={getCampaignStatusTone(campaign.status)}>
                        {sentenceCase(campaign.status)}
                      </Badge>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {campaign.execution_mode === "REVIEW" ? "Copilot" : "Autopilot"}
                      </Badge>
                      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                        {getCheckpointLabel(campaign.awaiting_checkpoint)}
                      </Badge>
                    </div>
                    <div>
                      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{campaign.name}</h1>
                      <p className="mt-2 max-w-3xl text-sm text-slate-600">
                        {getLocationSummary(campaign.location)} • Updated {formatDateTime(campaign.updated_at)}
                      </p>
                    </div>
                    {campaign.last_error && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {campaign.last_error}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 xl:max-w-xl xl:justify-end">
                    {!campaign.campaign_brief && (
                      <Button variant="outline" className="rounded-xl" disabled={pendingAction !== null} onClick={() => runAction("brief")}>
                        {pendingAction === "brief" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate Brief
                      </Button>
                    )}
                    {campaign.awaiting_checkpoint === "brief" && (
                      <Button variant="outline" className="rounded-xl" disabled={pendingAction !== null} onClick={() => runAction("approve-brief")}>
                        {pendingAction === "approve-brief" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                        Approve Brief
                      </Button>
                    )}
                    {campaign.status === "DRAFT" && (
                      <Button className="rounded-xl bg-sky-600 hover:bg-sky-700" disabled={pendingAction !== null} onClick={() => runAction("launch")}>
                        {pendingAction === "launch" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                        Launch Campaign
                      </Button>
                    )}
                    {campaign.awaiting_checkpoint === "messaging" && (
                      <Button variant="outline" className="rounded-xl" disabled={pendingAction !== null} onClick={() => runAction("approve-messaging")}>
                        {pendingAction === "approve-messaging" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                        Approve Messaging
                      </Button>
                    )}
                    {(campaign.status === "PAUSED" || campaign.awaiting_checkpoint === "messaging") && (
                      <Button variant="outline" className="rounded-xl" disabled={pendingAction !== null} onClick={() => runAction("resume")}>
                        {pendingAction === "resume" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Resume
                      </Button>
                    )}
                    {["ACTIVE", "SENDING", "DISCOVERING", "GENERATING"].includes(campaign.status) && (
                      <Button variant="outline" className="rounded-xl" disabled={pendingAction !== null} onClick={() => runAction("pause")}>
                        {pendingAction === "pause" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}
                        Pause
                      </Button>
                    )}
                    <Button variant="outline" className="rounded-xl" disabled={pendingAction !== null} onClick={() => runAction("refill")}>
                      {pendingAction === "refill" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                      Refill
                    </Button>
                    <Button variant="outline" className="rounded-xl" disabled={pendingAction !== null} onClick={() => runAction("send")}>
                      {pendingAction === "send" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Send Batch
                    </Button>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Expected reachable", value: expectedScenario?.recommended_reachable ?? 0 },
                  { label: "High-confidence contacts", value: expectedScenario?.reachable_with_both ?? 0 },
                  { label: "Preferred channel reach", value: getForecastRangeText(expectedScenario, preferredChannel) },
                  { label: "Promoted leads", value: campaign.leads.length },
                ].map((item) => (
                  <Card key={item.label} className="gap-3 border-slate-200 bg-white">
                    <CardHeader className="pb-0">
                      <CardDescription>{item.label}</CardDescription>
                      <CardTitle className="text-2xl">{item.value}</CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </section>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div className="space-y-6">
                  {campaign.awaiting_checkpoint === "discovery" && (
                    <Card className="border-amber-200 bg-amber-50/60">
                      <CardHeader>
                        <CardTitle>Lead review checkpoint</CardTitle>
                        <CardDescription>Select staged leads to promote into messaging, or reject the ones you do not want.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <Button className="rounded-xl bg-sky-600 hover:bg-sky-700" disabled={pendingAction !== null || selectedLeadIds.length === 0} onClick={() => runAction("approve-leads")}>
                            {pendingAction === "approve-leads" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Approve Selected ({selectedLeadIds.length})
                          </Button>
                          <Button variant="outline" className="rounded-xl" disabled={pendingAction !== null || selectedLeadIds.length === 0} onClick={() => runAction("reject-leads")}>
                            {pendingAction === "reject-leads" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Reject Selected
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead />
                              <TableHead>Business</TableHead>
                              <TableHead>Contact</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stagedLeads.map((lead) => (
                              <TableRow key={lead.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedLeadIds.includes(lead.id)}
                                    onChange={(event) => toggleLead(lead.id, event.target.checked)}
                                  />
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="space-y-1">
                                    <div className="font-medium text-slate-950">{lead.business_name}</div>
                                    <div className="text-xs text-slate-500">{lead.website || lead.domain || "No website captured"}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top text-sm text-slate-600">
                                  {lead.email || "No email"}
                                  <div>{lead.phone || "No phone"}</div>
                                </TableCell>
                                <TableCell className="align-top text-sm text-slate-600">{lead.score ?? "N/A"}</TableCell>
                                <TableCell className="align-top text-sm text-slate-600">{sentenceCase(lead.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="border-slate-200 bg-white">
                    <CardHeader>
                      <CardTitle>Promoted leads</CardTitle>
                      <CardDescription>These are the leads already moved into the campaign’s outreach flow.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {campaign.leads.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          No promoted leads yet.
                        </div>
                      ) : (
                        campaign.leads.map((lead) => (
                          <div key={lead.uuid} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="font-medium text-slate-950">{lead.business_name}</div>
                                <div className="mt-1 text-sm text-slate-600">
                                  {lead.email || "No email"} • {lead.phone || "No phone"}
                                </div>
                              </div>
                              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                                Email: {sentenceCase(lead.email_status)}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 bg-white">
                    <CardHeader>
                      <CardTitle>Generated drafts</CardTitle>
                      <CardDescription>Messaging outputs ready for review or already queued for send.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {campaign.email_drafts.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          No email drafts yet.
                        </div>
                      ) : (
                        campaign.email_drafts.map((draft) => (
                          <div key={draft.uuid} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="font-medium text-slate-950">{draft.subject}</div>
                              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                                {sentenceCase(draft.status)}
                              </Badge>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{draft.body}</p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-slate-200 bg-white">
                    <CardHeader>
                      <CardTitle>Brief and targeting</CardTitle>
                      <CardDescription>Readiness summary pulled from current campaign settings and generated brief output.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-slate-600">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Target area</div>
                        <div className="mt-2 font-medium text-slate-950">{getLocationSummary(campaign.location)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Forecast</div>
                        <div className="mt-2 font-medium text-slate-950">{getForecastRangeText(expectedScenario, preferredChannel)}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Brief summary</div>
                        <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-3">
                          {campaign.campaign_brief?.summary || "No generated brief yet."}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 bg-white">
                    <CardHeader>
                      <CardTitle>Activity</CardTitle>
                      <CardDescription>Milestones and review events in reverse chronological order.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {latestOpenEvents.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          No campaign events yet.
                        </div>
                      ) : (
                        latestOpenEvents.map((event) => (
                          <div key={event.uuid} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                                {sentenceCase(event.event_type)}
                              </Badge>
                              <div className="text-xs text-slate-500">{formatDateTime(event.created_at)}</div>
                            </div>
                            <div className="mt-3 text-sm text-slate-700">{event.summary}</div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {error && (
                <Card className="border-rose-200 bg-rose-50/70">
                  <CardContent className="pt-6 text-sm text-rose-700">{error}</CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
