"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import type {
  FrontlineActivityEvent,
  FrontlineReplyApproval,
  FrontlineSandboxAnswer,
  FrontlineSettings,
} from "@/lib/types/frontline"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BookOpen, FlaskConical, Loader2 } from "lucide-react"

function OverviewCard({
  title,
  description,
  badge,
  comingSoon,
}: {
  title: string
  description: string
  badge?: string
  comingSoon?: boolean
}) {
  return (
    <Card className="border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {badge}
          </span>
        ) : null}
        {comingSoon ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            Coming soon
          </span>
        ) : null}
      </div>
    </Card>
  )
}

export function FrontlinePage() {
  const [settings, setSettings] = useState<FrontlineSettings | null>(null)
  const [markdown, setMarkdown] = useState("")
  const [sandboxQ, setSandboxQ] = useState("")
  const [sandboxA, setSandboxA] = useState<FrontlineSandboxAnswer | null>(null)
  const [teachQ, setTeachQ] = useState("")
  const [teachBad, setTeachBad] = useState("")
  const [teachGood, setTeachGood] = useState("")
  const [events, setEvents] = useState<FrontlineActivityEvent[]>([])
  const [approvals, setApprovals] = useState<FrontlineReplyApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("overview")

  const load = useCallback(async () => {
    setError("")
    try {
      const [s, k, act, appr] = await Promise.all([
        api.getFrontlineSettings(),
        api.getFrontlineKnowledge(),
        api.getFrontlineActivity(30),
        api.getFrontlineApprovals("pending"),
      ])
      setSettings(s)
      setMarkdown(k.markdown_text)
      setEvents(act.events || [])
      setApprovals(appr.approvals || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load Your Frontline"
      setError(
        msg.includes("404") || msg.includes("not linked")
          ? "Link your Twilio number in onboarding before using Your Frontline."
          : msg,
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveSettings = async (patch: Partial<FrontlineSettings>) => {
    if (!settings) return
    setSaving(true)
    setError("")
    try {
      const updated = await api.updateFrontlineSettings(patch)
      setSettings(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const saveKnowledge = async () => {
    setSaving(true)
    setError("")
    try {
      await api.updateFrontlineKnowledge(markdown, true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save knowledge")
    } finally {
      setSaving(false)
    }
  }

  const runSandbox = async () => {
    if (!sandboxQ.trim()) return
    setSaving(true)
    setSandboxA(null)
    try {
      const result = await api.frontlineSandboxAsk(sandboxQ.trim())
      setSandboxA(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sandbox ask failed")
    } finally {
      setSaving(false)
    }
  }

  const submitTeach = async () => {
    if (!teachGood.trim()) return
    setSaving(true)
    try {
      await api.frontlineTeach({
        question: teachQ || undefined,
        bad_answer: teachBad || undefined,
        corrected_answer: teachGood.trim(),
        source: "sandbox",
      })
      setTeachQ("")
      setTeachBad("")
      setTeachGood("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Teach note failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-8 md:px-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Your Frontline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SMS-first AI on your business Twilio number. Review mode texts you YES/NO
            before customers see drafts.
          </p>
        </div>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </Card>
        ) : null}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex w-full flex-wrap gap-1 bg-muted/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
            <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <OverviewCard
                title="Answers SMS"
                description="Drafts replies when customers text your Twilio business number."
                badge={settings?.enabled ? "On" : "Off"}
              />
              <OverviewCard
                title="Answers questions"
                description="Uses your knowledge base and teach notes — never invents pricing."
              />
              <OverviewCard
                title="Review / Auto mode"
                description={
                  settings?.mode === "auto"
                    ? "Auto sends only when confidence is high."
                    : "Review texts you YES/NO before the customer sees a draft."
                }
                badge={settings?.mode === "auto" ? "Auto" : "Review"}
              />
              <OverviewCard
                title="Owner assistant"
                description="Text your number with AI: for reports or scheduling."
                badge={settings?.owner_assistant_enabled ? "On" : "Off"}
              />
              <OverviewCard
                title="Inbound calls"
                description="Voice receptionist for your business line."
                comingSoon
              />
              <OverviewCard
                title="Custom voice"
                description="Brand-specific voice for calls and messages."
                comingSoon
              />
            </div>
            {approvals.length > 0 ? (
              <Card className="border-border bg-card p-4">
                <p className="text-sm font-medium">
                  {approvals.length} pending approval
                  {approvals.length === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reply YES or NO from your phone on the approval thread.
                </p>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="knowledge" className="mt-4 space-y-4">
            <Card className="border-border bg-card p-4">
              <Label htmlFor="knowledge-md" className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4" />
                Knowledge (markdown)
              </Label>
              <textarea
                id="knowledge-md"
                className="mt-2 min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={saveKnowledge} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save & reindex
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sandbox" className="mt-4 space-y-4">
            <Card className="border-border bg-card p-4">
              <Label htmlFor="sandbox-q" className="flex items-center gap-2 text-sm">
                <FlaskConical className="h-4 w-4" />
                Test a customer question
              </Label>
              <textarea
                id="sandbox-q"
                className="mt-2 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Do you install water heaters in Austin?"
                value={sandboxQ}
                onChange={(e) => setSandboxQ(e.target.value)}
              />
              <Button className="mt-3" onClick={runSandbox} disabled={saving}>
                Ask Frontline
              </Button>
              {sandboxA ? (
                <div className="mt-4 space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Draft</p>
                  <p className="text-foreground">{sandboxA.answer}</p>
                  <p className="text-xs text-muted-foreground">
                    Confidence {(sandboxA.confidence * 100).toFixed(0)}% ·{" "}
                    {sandboxA.mode_recommendation}
                    {sandboxA.escalation_reason
                      ? ` · ${sandboxA.escalation_reason}`
                      : ""}
                  </p>
                </div>
              ) : null}
            </Card>
            <Card className="border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium">Teach a correction</p>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Original question (optional)"
                value={teachQ}
                onChange={(e) => setTeachQ(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Bad answer (optional)"
                value={teachBad}
                onChange={(e) => setTeachBad(e.target.value)}
              />
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Correct answer"
                value={teachGood}
                onChange={(e) => setTeachGood(e.target.value)}
              />
              <Button variant="secondary" onClick={submitTeach} disabled={saving}>
                Save teach note
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            {settings ? (
              <Card className="border-border bg-card p-4 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Enable Your Frontline</p>
                    <p className="text-xs text-muted-foreground">
                      When off, SMS behaves as before (forward only).
                    </p>
                  </div>
                  <Button
                    variant={settings.enabled ? "default" : "outline"}
                    onClick={() => saveSettings({ enabled: !settings.enabled })}
                    disabled={saving}
                  >
                    {settings.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Reply mode</Label>
                  <Select
                    value={settings.mode}
                    onValueChange={(v) =>
                      saveSettings({ mode: v as FrontlineSettings["mode"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="review">Review (recommended)</SelectItem>
                      <SelectItem value="auto">Auto (high confidence only)</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Auto-send minimum confidence</Label>
                  <input
                    type="range"
                    min={0.5}
                    max={0.95}
                    step={0.01}
                    value={settings.auto_min_confidence}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        auto_min_confidence: parseFloat(e.target.value),
                      })
                    }
                    onMouseUp={() =>
                      saveSettings({
                        auto_min_confidence: settings.auto_min_confidence,
                      })
                    }
                    onTouchEnd={() =>
                      saveSettings({
                        auto_min_confidence: settings.auto_min_confidence,
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {(settings.auto_min_confidence * 100).toFixed(0)}% — only used in Auto
                    mode
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Owner assistant</p>
                    <p className="text-xs text-muted-foreground">
                      AI: commands and reports on your business line
                    </p>
                  </div>
                  <Button
                    variant={settings.owner_assistant_enabled ? "default" : "outline"}
                    onClick={() =>
                      saveSettings({
                        owner_assistant_enabled: !settings.owner_assistant_enabled,
                      })
                    }
                    disabled={saving}
                  >
                    {settings.owner_assistant_enabled ? "On" : "Off"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Calendar actions</p>
                    <p className="text-xs text-muted-foreground">
                      Schedule bookings via owner SMS (create only)
                    </p>
                  </div>
                  <Button
                    variant={settings.calendar_actions_enabled ? "default" : "outline"}
                    onClick={() =>
                      saveSettings({
                        calendar_actions_enabled: !settings.calendar_actions_enabled,
                      })
                    }
                    disabled={saving}
                  >
                    {settings.calendar_actions_enabled ? "On" : "Off"}
                  </Button>
                </div>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <Card className="border-border bg-card p-4">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {events.map((e) => (
                    <li
                      key={e.id}
                      className="border-b border-border pb-3 last:border-0 last:pb-0"
                    >
                      <p className="text-sm font-medium">{e.title}</p>
                      {e.detail ? (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {e.detail}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {e.created_at
                          ? new Date(e.created_at).toLocaleString()
                          : ""}
                        {e.customer_number ? ` · ${e.customer_number}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
