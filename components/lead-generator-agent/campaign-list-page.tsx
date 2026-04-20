"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useLocale } from "next-intl"
import { Bot, FileText, Pause, Play, Rocket, Zap } from "lucide-react"

import { api } from "@/lib/api"
import type { Campaign } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  formatDateTime,
  getCampaignStatusTone,
  getCheckpointLabel,
  getExpectedScenario,
  getForecastRangeText,
  getLocationSummary,
  getSegmentSummary,
  sentenceCase,
} from "@/components/lead-generator-agent/shared"

type ActionState = Record<string, string | undefined>

export function CampaignListPage() {
  const locale = useLocale()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionState, setActionState] = useState<ActionState>({})

  async function loadCampaigns() {
    try {
      setError(null)
      setLoading(true)
      const data = await api.getCampaigns()
      setCampaigns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load campaigns.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
  }, [])

  async function handleAction(campaign: Campaign, action: "generate" | "launch" | "resume" | "pause") {
    try {
      setActionState((current) => ({ ...current, [campaign.uuid]: action }))
      if (action === "generate") await api.generateCampaignBrief(campaign.uuid)
      if (action === "launch") await api.launchCampaign(campaign.uuid)
      if (action === "resume") await api.resumeCampaign(campaign.uuid)
      if (action === "pause") await api.pauseCampaign(campaign.uuid)
      await loadCampaigns()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign action failed.")
    } finally {
      setActionState((current) => ({ ...current, [campaign.uuid]: undefined }))
    }
  }

  const draftCount = campaigns.filter((campaign) => campaign.status === "DRAFT").length
  const awaitingReviewCount = campaigns.filter((campaign) => campaign.status === "AWAITING_REVIEW").length
  const activeCount = campaigns.filter((campaign) => ["SENDING", "ACTIVE", "DISCOVERING", "GENERATING"].includes(campaign.status)).length
  const completedCount = campaigns.filter((campaign) => campaign.status === "COMPLETED").length

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_48%,_#f8fafc_100%)] pb-16">
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <section className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3 md:space-y-2">
                <Badge className="border-sky-200 bg-sky-50 text-sky-700" variant="outline">
                  Lead Generator Agent
                </Badge>
                <h1 className="hidden text-3xl font-semibold tracking-tight text-slate-950 md:block">Plan, launch, and review outbound campaigns</h1>
                <p className="max-w-3xl text-sm text-slate-600">
                  Estimate reachable leads, launch in Copilot or Autopilot mode, and keep the next required action visible at every checkpoint.
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

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Draft campaigns", value: draftCount, tone: "border-slate-200 bg-white" },
              { label: "Awaiting review", value: awaitingReviewCount, tone: "border-amber-200 bg-amber-50/60" },
              { label: "Sending / active", value: activeCount, tone: "border-emerald-200 bg-emerald-50/60" },
              { label: "Completed", value: completedCount, tone: "border-sky-200 bg-sky-50/60" },
            ].map((item) => (
              <Card key={item.label} className={`gap-3 ${item.tone}`}>
                <CardHeader className="pb-0">
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle className="text-3xl">{item.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </section>

          <Card className="overflow-hidden border-slate-200 bg-white/95">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>Use the list as your operating console for briefing, launch, review, and status checks.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <Empty className="border-0 rounded-none py-16">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Bot />
                    </EmptyMedia>
                    <EmptyTitle>Launch your first agent-led outbound campaign</EmptyTitle>
                    <EmptyDescription>
                      Estimate reachable leads, expand your local target area, and run in Copilot or Autopilot mode.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild className="rounded-xl bg-sky-600 hover:bg-sky-700">
                      <Link href={`/${locale}/lead-generator-agent/new`}>Create Campaign</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Segments</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Forecast</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Awaiting</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => {
                      const scenario = getExpectedScenario(campaign)
                      const preferredChannel = campaign.discovery_forecast?.preferred_channel ?? "email"
                      const pendingAction = actionState[campaign.uuid]
                      return (
                        <TableRow key={campaign.uuid}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <div className="font-medium text-slate-950">{campaign.name}</div>
                              <div className="text-xs text-slate-500">
                                {scenario ? `${scenario.reachable_with_both} with both email and phone` : "Draft forecast pending"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-sm text-slate-600">{getLocationSummary(campaign.location)}</TableCell>
                          <TableCell className="align-top text-sm text-slate-600">{getSegmentSummary(campaign)}</TableCell>
                          <TableCell className="align-top text-sm text-slate-600">{campaign.execution_mode === "REVIEW" ? "Copilot" : "Autopilot"}</TableCell>
                          <TableCell className="align-top text-sm text-slate-600">{getForecastRangeText(scenario, preferredChannel)}</TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className={getCampaignStatusTone(campaign.status)}>
                              {sentenceCase(campaign.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top text-sm text-slate-600">{getCheckpointLabel(campaign.awaiting_checkpoint)}</TableCell>
                          <TableCell className="align-top text-sm text-slate-600">{formatDateTime(campaign.updated_at)}</TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap gap-2">
                              <Button asChild size="sm" variant="outline" className="rounded-lg">
                                <Link href={`/${locale}/lead-generator-agent/${campaign.uuid}`}>Open</Link>
                              </Button>
                              {!campaign.campaign_brief && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg"
                                  disabled={Boolean(pendingAction)}
                                  onClick={() => handleAction(campaign, "generate")}
                                >
                                  <FileText className="mr-1 h-3.5 w-3.5" />
                                  {pendingAction === "generate" ? "Working..." : "Generate Brief"}
                                </Button>
                              )}
                              {campaign.status === "DRAFT" && (
                                <Button
                                  size="sm"
                                  className="rounded-lg bg-sky-600 hover:bg-sky-700"
                                  disabled={Boolean(pendingAction)}
                                  onClick={() => handleAction(campaign, "launch")}
                                >
                                  <Rocket className="mr-1 h-3.5 w-3.5" />
                                  {pendingAction === "launch" ? "Launching..." : "Launch"}
                                </Button>
                              )}
                              {(campaign.status === "PAUSED" || campaign.awaiting_checkpoint === "messaging") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg"
                                  disabled={Boolean(pendingAction)}
                                  onClick={() => handleAction(campaign, "resume")}
                                >
                                  <Play className="mr-1 h-3.5 w-3.5" />
                                  {pendingAction === "resume" ? "Resuming..." : "Resume"}
                                </Button>
                              )}
                              {["ACTIVE", "SENDING", "DISCOVERING", "GENERATING"].includes(campaign.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg"
                                  disabled={Boolean(pendingAction)}
                                  onClick={() => handleAction(campaign, "pause")}
                                >
                                  <Pause className="mr-1 h-3.5 w-3.5" />
                                  {pendingAction === "pause" ? "Pausing..." : "Pause"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

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
