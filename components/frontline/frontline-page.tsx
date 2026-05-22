"use client"

import { useCallback, useEffect, useMemo, useState, type ElementType } from "react"
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Bot,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Clock3,
  DollarSign,
  FileText,
  FlaskConical,
  Headphones,
  ListChecks,
  Loader2,
  MessageSquare,
  Mic2,
  PenLine,
  PhoneCall,
  Radio,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Wand2,
  Zap,
} from "lucide-react"

import { api } from "@/lib/api"
import type {
  FrontlineActivityEvent,
  FrontlineReplyApproval,
  FrontlineSandboxAnswer,
  FrontlineSettings,
  FrontlineVoiceDevStatus,
} from "@/lib/types/frontline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type KnowledgeSection = {
  id: string
  title: string
  content: string
  wordCount: number
}

type TrainingKey = "services" | "pricing" | "scheduling" | "handoff" | "tone" | "donts"

type TrainingPrompt = {
  id: TrainingKey
  title: string
  question: string
  placeholder: string
  icon: ElementType
  tone: string
}

const TRAINING_PROMPTS: TrainingPrompt[] = [
  {
    id: "services",
    title: "Services and fit",
    question: "What jobs should Frontline confidently say yes to?",
    placeholder: "Services offered, service area, ideal projects, job sizes, and jobs you avoid.",
    icon: ClipboardList,
    tone: "sky",
  },
  {
    id: "pricing",
    title: "Pricing and estimates",
    question: "How should it handle price questions?",
    placeholder: "Typical ranges, when to avoid quoting, free estimate rules, deposits, warranties.",
    icon: DollarSign,
    tone: "emerald",
  },
  {
    id: "scheduling",
    title: "Scheduling rules",
    question: "What does it need before booking?",
    placeholder: "Required fields, availability windows, emergency rules, visit lengths, travel limits.",
    icon: CalendarClock,
    tone: "amber",
  },
  {
    id: "handoff",
    title: "Escalation and handoff",
    question: "When should it stop and ask you?",
    placeholder: "Red flags, angry customers, legal/insurance details, high-value jobs, uncertainty.",
    icon: AlertTriangle,
    tone: "rose",
  },
  {
    id: "tone",
    title: "Voice and tone",
    question: "How should it sound when texting customers?",
    placeholder: "Friendly, concise, premium, casual, bilingual notes, words you like.",
    icon: UserRound,
    tone: "violet",
  },
  {
    id: "donts",
    title: "Do-not-say rules",
    question: "What should it never promise?",
    placeholder: "No guarantees, no exact price, no unsupported discounts, no same-day promise unless approved.",
    icon: ListChecks,
    tone: "slate",
  },
]

const CAPABILITIES = [
  {
    title: "Replies to inbound SMS",
    description: "Answers customers who text your assigned business number.",
    icon: MessageSquare,
    tone: "sky",
  },
  {
    title: "Reviews before sending",
    description: "Texts you a suggested reply and waits for YES or NO.",
    icon: ShieldCheck,
    tone: "emerald",
  },
  {
    title: "Learns your business",
    description: "Uses services, policies, and teach notes instead of guessing.",
    icon: BookOpen,
    tone: "violet",
  },
  {
    title: "Owner assistant",
    description: "Text AI: for reports, pending replies, and scheduling.",
    icon: Bot,
    tone: "amber",
  },
]

const COMING_SOON = [
  {
    title: "Inbound call receptionist",
    description: "Answer calls, qualify leads, and summarize the outcome.",
    icon: PhoneCall,
  },
  {
    title: "Custom voice",
    description: "Optional branded voice for future call handling.",
    icon: Mic2,
  },
]

function toneClasses(tone: string) {
  switch (tone) {
    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "violet":
      return "border-violet-200 bg-violet-50 text-violet-700"
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "rose":
      return "border-rose-200 bg-rose-50 text-rose-700"
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700"
    default:
      return "border-sky-200 bg-sky-50 text-sky-700"
  }
}

function parseKnowledgeSections(markdown: string): KnowledgeSection[] {
  const sections: KnowledgeSection[] = []
  const lines = markdown.split("\n")
  let title = "General knowledge"
  let buffer: string[] = []

  const flush = () => {
    const content = buffer.join("\n").trim()
    if (!content) return
    sections.push({
      id: `${sections.length}-${title}`,
      title,
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    })
  }

  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)$/)
    if (match) {
      flush()
      title = match[1].trim()
      buffer = []
    } else {
      buffer.push(line)
    }
  }
  flush()
  return sections
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function CapabilityCard({
  title,
  description,
  icon: Icon,
  tone,
  badge,
}: {
  title: string
  description: string
  icon: ElementType
  tone: string
  badge?: string
}) {
  return (
    <Card className="border-slate-200 bg-white/95 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneClasses(tone)}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-950">{title}</p>
              {badge ? (
                <Badge variant="outline" className="border-slate-200 bg-slate-50 px-1.5 py-0 text-[10px] text-slate-500">
                  {badge}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: ElementType
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </div>
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
  const [trainingIntake, setTrainingIntake] = useState("")
  const [voiceStatus, setVoiceStatus] = useState<FrontlineVoiceDevStatus | null>(null)
  const [events, setEvents] = useState<FrontlineActivityEvent[]>([])
  const [approvals, setApprovals] = useState<FrontlineReplyApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [tab, setTab] = useState("training")
  const [showAdvancedManual, setShowAdvancedManual] = useState(false)

  const sections = useMemo(() => parseKnowledgeSections(markdown), [markdown])
  const wordCount = useMemo(() => markdown.split(/\s+/).filter(Boolean).length, [markdown])
  const readiness = Math.min(100, Math.round((sections.length * 16) + Math.min(wordCount / 12, 40)))
  const coverageChecks = useMemo(
    () => [
      { label: "Services", done: /service|area|fit|project|job/i.test(markdown) },
      { label: "Pricing", done: /price|pricing|estimate|deposit|quote/i.test(markdown) },
      { label: "Scheduling", done: /schedule|booking|appointment|availability|visit/i.test(markdown) },
      { label: "Escalation", done: /handoff|escalat|urgent|emergency|ask owner/i.test(markdown) },
      { label: "Tone", done: /tone|voice|friendly|professional|concise/i.test(markdown) },
      { label: "Boundaries", done: /never|do not|don't|cannot|no guarantee/i.test(markdown) },
    ],
    [markdown],
  )
  const coveredCount = coverageChecks.filter((check) => check.done).length

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
      setMarkdown(k.markdown_text || "")
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
    setSuccess("")
    try {
      const updated = await api.updateFrontlineSettings(patch)
      setSettings(updated)
      setSuccess("Frontline settings saved.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const saveKnowledge = async (nextMarkdown = markdown) => {
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      await api.updateFrontlineKnowledge(nextMarkdown, true)
      setMarkdown(nextMarkdown)
      setSuccess("Knowledge saved and reindexed.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save knowledge")
    } finally {
      setSaving(false)
    }
  }

  const submitTrainingIntake = async () => {
    if (trainingIntake.trim().length < 40) return
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const doc = await api.submitFrontlineKnowledgeIntake(
        trainingIntake.trim(),
        "text_intake",
      )
      setMarkdown(doc.markdown_text || "")
      setTrainingIntake("")
      setSuccess(doc.intake_summary || "Training intake saved and converted into knowledge.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Training intake failed")
    } finally {
      setSaving(false)
    }
  }

  const checkNovaVoiceStatus = async () => {
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const status = await api.getFrontlineVoiceDevStatus()
      setVoiceStatus(status)
      setSuccess(status.ready_for_live_stream ? "Nova Sonic dev runtime is ready." : "Nova Sonic dev check completed.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Nova Sonic dev check failed")
    } finally {
      setSaving(false)
    }
  }

  const runSandbox = async () => {
    if (!sandboxQ.trim()) return
    setSaving(true)
    setError("")
    setSandboxA(null)
    try {
      const result = await api.frontlineSandboxAsk(sandboxQ.trim())
      setSandboxA(result)
      setTeachQ(sandboxQ.trim())
      setTeachBad(result.answer)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sandbox ask failed")
    } finally {
      setSaving(false)
    }
  }

  const submitTeach = async () => {
    if (!teachGood.trim()) return
    setSaving(true)
    setError("")
    setSuccess("")
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
      setSuccess("Teach note saved. It will rank above call memory.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Teach note failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6">
        <div className="mx-auto flex min-h-[55vh] max-w-5xl items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
            Loading Your Frontline...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#ffffff_34%,_#f8fafc_100%)] pb-16">
      <main className="container mx-auto max-w-6xl px-4 py-6">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="border-sky-200 bg-sky-50 text-sky-700" variant="outline">
                  Your Frontline
                </Badge>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                  Train the front desk behind your smart business number.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Build the first-day manual, test customer replies, and keep review mode
                  tight before your AI answers from the assigned Twilio line.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    className="rounded-xl bg-sky-600 hover:bg-sky-700"
                    onClick={() => setTab("training")}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Train Frontline
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-200 bg-white"
                    onClick={() => setTab("sandbox")}
                  >
                    <FlaskConical className="mr-2 h-4 w-4" />
                    Test a reply
                  </Button>
                </div>
              </div>
              <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-3 lg:max-w-[360px]">
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                        <PhoneCall className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Smart number flow</p>
                        <p className="text-[11px] text-slate-500">{settings?.mode === "auto" ? "Auto mode" : "Review mode"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={settings?.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}>
                      {settings?.enabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      ["Customer texts", "Assigned Twilio business number"],
                      ["Frontline drafts", `${coveredCount}/${coverageChecks.length} knowledge areas ready`],
                      ["Owner approves", approvals.length ? `${approvals.length} waiting` : "YES/NO review queue"],
                    ].map(([title, detail], index) => (
                      <div key={title} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-500">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800">{title}</p>
                          <p className="truncate text-[11px] text-slate-500">{detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          {tab === "overview" ? (
            <section className="grid gap-3 md:grid-cols-4">
              <MetricCard
                label="Frontline mode"
                value={settings?.enabled ? settings.mode : "off"}
                detail={settings?.enabled ? "Ready to monitor the smart number." : "Enable when training is ready."}
                icon={Radio}
              />
              <MetricCard
                label="Knowledge readiness"
                value={`${readiness}%`}
                detail={`${sections.length} sections, ${wordCount} words in the manual.`}
                icon={BookOpen}
              />
              <MetricCard
                label="Pending approvals"
                value={String(approvals.length)}
                detail="Owner YES/NO replies waiting on customer drafts."
                icon={Clock3}
              />
              <MetricCard
                label="Recent activity"
                value={String(events.length)}
                detail="Customer messages, drafts, teaches, and owner actions."
                icon={Activity}
              />
            </section>
          ) : null}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 sm:grid-cols-6">
              <TabsTrigger value="overview" className="rounded-xl text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="training" className="rounded-xl text-xs sm:text-sm">Training</TabsTrigger>
              <TabsTrigger value="knowledge" className="rounded-xl text-xs sm:text-sm">Knowledge</TabsTrigger>
              <TabsTrigger value="sandbox" className="rounded-xl text-xs sm:text-sm">Sandbox</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl text-xs sm:text-sm">Settings</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-xl text-xs sm:text-sm">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-5 space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {CAPABILITIES.map((item) => (
                  <CapabilityCard
                    key={item.title}
                    title={item.title}
                    description={item.description}
                    icon={item.icon}
                    tone={item.tone}
                    badge={item.title === "Reviews before sending" ? settings?.mode || "review" : undefined}
                  />
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-slate-950">Launch checklist</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        The goal is not a huge document. It is enough confidence to answer common first-contact questions.
                      </p>
                    </div>
                    <BadgeCheck className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {[
                      ["Business fit", sections.length > 0, "Services, service area, job types you avoid."],
                      ["Customer rules", wordCount > 80, "Pricing, emergencies, scheduling, and handoff rules."],
                      ["Sandbox tested", Boolean(sandboxA), "Run a few real customer questions before enabling auto."],
                      ["Review mode", settings?.mode === "review", "Owner approval is the default safe launch path."],
                    ].map(([label, done, detail]) => (
                      <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-400"}`}>
                          {done ? <BadgeCheck className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{label}</p>
                          <p className="text-xs text-slate-500">{detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-5 w-5 text-sky-600" />
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">Coming next</h2>
                  </div>
                  <div className="mt-4 space-y-3">
                    {COMING_SOON.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600">
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                Soon
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="training" className="mt-5 space-y-4">
              <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                      <Mic2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold tracking-tight text-slate-950">Training call</h2>
                        <Badge variant="outline" className="border-sky-200 bg-white text-sky-700">
                          Nova 2 Sonic
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        The cleanest version is a weekly voice interview. Frontline asks the owner one question at a time, then the transcript becomes structured knowledge.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {[
                      ["1 / week", "Training limit"],
                      ["8 min", "Session cap"],
                      ["Matthew", "US male voice"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-2xl border border-sky-100 bg-white px-3 py-3">
                        <p className="text-lg font-semibold text-slate-950">{value}</p>
                        <p className="text-xs text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={checkNovaVoiceStatus}
                    disabled={saving}
                    className="mt-5 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic2 className="mr-2 h-4 w-4" />}
                    Check Nova setup
                  </Button>

                  {voiceStatus ? (
                    <div className="mt-4 rounded-2xl border border-sky-100 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {voiceStatus.ready_for_live_stream ? "Ready for live stream" : "Setup needed"}
                        </p>
                        <Badge variant="outline" className={voiceStatus.ready_for_live_stream ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                          {voiceStatus.model_id}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                        <span>Python {voiceStatus.python_version}</span>
                        <span>Voice {voiceStatus.voice_id}</span>
                        <span>SDK {voiceStatus.sdk_importable ? "installed" : "missing"}</span>
                        <span>Region {voiceStatus.region}</span>
                      </div>
                      {voiceStatus.notes.length ? (
                        <p className="mt-3 text-xs leading-relaxed text-slate-500">
                          {voiceStatus.notes[0]}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-slate-950">Text training session</h2>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        Type or paste what the owner would say on the call. The backend converts it into markdown and reindexes it.
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">
                      Live now
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {TRAINING_PROMPTS.map((prompt) => {
                      const Icon = prompt.icon
                      return (
                        <button
                          key={prompt.id}
                          type="button"
                          onClick={() =>
                            setTrainingIntake((prev) =>
                              `${prev}${prev.trim() ? "\n\n" : ""}${prompt.question} ${prompt.placeholder}`,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {prompt.title}
                        </button>
                      )
                    })}
                  </div>

                  <Textarea
                    value={trainingIntake}
                    onChange={(e) => setTrainingIntake(e.target.value)}
                    placeholder="Example: We do kitchen, bathroom, and basement remodels within 25 miles of Austin. For pricing, never promise an exact number by text. Ask for photos and offer a free estimate..."
                    className="mt-4 min-h-52 resize-none rounded-2xl border-slate-200 bg-slate-50/70 text-sm"
                  />

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {coverageChecks.map((check) => (
                        <Badge
                          key={check.label}
                          variant="outline"
                          className={check.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}
                        >
                          {check.label}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      onClick={submitTrainingIntake}
                      disabled={saving || trainingIntake.trim().length < 40}
                      className="rounded-xl bg-sky-600 hover:bg-sky-700"
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save to knowledge
                    </Button>
                  </div>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="knowledge" className="mt-5 space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">Knowledge map</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      A scan-friendly view of the chunks Frontline can retrieve when customers text.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => setShowAdvancedManual((v) => !v)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {showAdvancedManual ? "Hide source" : "Advanced source"}
                  </Button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-medium text-slate-500">Sections</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{sections.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-medium text-slate-500">Coverage</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{coveredCount}/{coverageChecks.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-medium text-slate-500">Source words</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{wordCount}</p>
                  </div>
                </div>

                {sections.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 text-sm font-medium text-slate-800">No knowledge sections yet</p>
                    <p className="mt-1 text-sm text-slate-500">Start with the Training tab. Frontline will build the manual in the background.</p>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {sections.slice(0, 8).map((section) => (
                      <div key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-slate-900">{section.title}</p>
                          <Badge variant="outline" className="border-slate-200 bg-white text-slate-500">
                            {section.wordCount} words
                          </Badge>
                        </div>
                        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">
                          {section.content.replace(/[#*_`>-]/g, "").trim() || "Saved source is ready for retrieval."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {sections.length > 8 ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    Showing the first 8 sections. Use search-backed sandbox answers to verify larger manuals.
                  </div>
                ) : null}

                {showAdvancedManual ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-950 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <PenLine className="h-4 w-4 text-sky-300" />
                        Advanced source editor
                      </div>
                      <Button size="sm" onClick={() => saveKnowledge(markdown)} disabled={saving} className="rounded-lg bg-white text-slate-950 hover:bg-slate-100">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save
                      </Button>
                    </div>
                    <textarea
                      className="min-h-[320px] w-full resize-y rounded-xl border border-white/10 bg-slate-900 px-3 py-3 font-mono text-sm leading-relaxed text-slate-100 outline-none focus:border-sky-400"
                      value={markdown}
                      onChange={(e) => setMarkdown(e.target.value)}
                    />
                  </div>
                ) : null}
              </section>
            </TabsContent>

            <TabsContent value="sandbox" className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-sky-600" />
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">Customer reply simulator</h2>
                </div>
                <Textarea
                  className="mt-4 min-h-32 resize-none rounded-2xl border-slate-200 bg-slate-50/70 text-sm"
                  placeholder="Example: Do you repair leaking water heaters in Austin, and can someone come this week?"
                  value={sandboxQ}
                  onChange={(e) => setSandboxQ(e.target.value)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={runSandbox} disabled={saving || !sandboxQ.trim()}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Ask Frontline
                  </Button>
                  <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setSandboxQ("")}>
                    Clear
                  </Button>
                </div>

                {sandboxA ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Draft reply</p>
                      <Badge variant="outline" className={toneClasses(sandboxA.mode_recommendation === "auto" ? "emerald" : sandboxA.mode_recommendation === "hold" ? "rose" : "amber")}>
                        {sandboxA.mode_recommendation}
                      </Badge>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{sandboxA.answer}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Confidence {Math.round((sandboxA.confidence || 0) * 100)}%</span>
                      {sandboxA.escalation_reason ? <span>Reason: {sandboxA.escalation_reason}</span> : null}
                    </div>
                    {sandboxA.sources?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {sandboxA.sources.map((source) => (
                          <Badge key={source} variant="outline" className="border-slate-200 bg-white text-slate-500">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-violet-600" />
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">Teach it what to do instead</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Corrections become high-priority teach notes, so the same mistake is less likely next time.
                </p>
                <div className="mt-4 space-y-3">
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm outline-none focus:border-sky-400"
                    placeholder="Original question"
                    value={teachQ}
                    onChange={(e) => setTeachQ(e.target.value)}
                  />
                  <Textarea
                    className="min-h-20 resize-none rounded-2xl border-slate-200 bg-slate-50/70 text-sm"
                    placeholder="Answer you did not like"
                    value={teachBad}
                    onChange={(e) => setTeachBad(e.target.value)}
                  />
                  <Textarea
                    className="min-h-28 resize-none rounded-2xl border-slate-200 bg-slate-50/70 text-sm"
                    placeholder="Correct behavior or exact answer"
                    value={teachGood}
                    onChange={(e) => setTeachGood(e.target.value)}
                  />
                  <Button variant="secondary" className="rounded-xl" onClick={submitTeach} disabled={saving || !teachGood.trim()}>
                    Save teach note
                  </Button>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="settings" className="mt-5">
              {settings ? (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-5 w-5 text-slate-600" />
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight text-slate-950">Operating mode</h2>
                        <p className="mt-1 text-sm text-slate-500">Choose how much autonomy the smart number has.</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={settings.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}>
                      {settings.enabled ? "Frontline enabled" : "Frontline paused"}
                    </Badge>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {[
                      {
                        id: "review",
                        title: "Review",
                        detail: "Drafts SMS and waits for owner YES/NO.",
                        icon: ShieldCheck,
                        tone: "emerald",
                      },
                      {
                        id: "auto",
                        title: "Auto",
                        detail: "Sends only when confidence clears the rule.",
                        icon: Zap,
                        tone: "sky",
                      },
                      {
                        id: "off",
                        title: "Off",
                        detail: "Keep the smart layer paused.",
                        icon: Clock3,
                        tone: "slate",
                      },
                    ].map((mode) => {
                      const Icon = mode.icon
                      const active = settings.mode === mode.id
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            saveSettings({
                              mode: mode.id as FrontlineSettings["mode"],
                              enabled: mode.id !== "off",
                            })
                          }
                          className={[
                            "rounded-2xl border p-4 text-left transition-all",
                            active ? "border-sky-300 bg-sky-50 shadow-sm" : "border-slate-200 bg-slate-50/70 hover:border-sky-200 hover:bg-white",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneClasses(mode.tone)}`}>
                              <Icon className="h-5 w-5" />
                            </span>
                            {active ? <Badge className="bg-sky-600 text-white">Selected</Badge> : null}
                          </div>
                          <p className="mt-4 text-sm font-semibold text-slate-900">{mode.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">{mode.detail}</p>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Auto confidence floor</p>
                          <p className="mt-1 text-xs text-slate-500">Auto mode sends only above this confidence.</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-800">
                          {Math.round((settings.auto_min_confidence || 0) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.55"
                        max="0.95"
                        step="0.01"
                        value={settings.auto_min_confidence || 0.82}
                        onChange={(e) =>
                          setSettings((prev) =>
                            prev ? { ...prev, auto_min_confidence: Number(e.target.value) } : prev,
                          )
                        }
                        onMouseUp={(e) => saveSettings({ auto_min_confidence: Number(e.currentTarget.value) })}
                        onTouchEnd={(e) => saveSettings({ auto_min_confidence: Number(e.currentTarget.value) })}
                        onBlur={(e) => saveSettings({ auto_min_confidence: Number(e.currentTarget.value) })}
                        className="mt-4 w-full accent-sky-600"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          label: "Owner assistant",
                          detail: "AI: commands and reporting by SMS.",
                          enabled: settings.owner_assistant_enabled,
                          patch: { owner_assistant_enabled: !settings.owner_assistant_enabled },
                        },
                        {
                          label: "Calendar actions",
                          detail: "Create bookings after collecting fields.",
                          enabled: settings.calendar_actions_enabled,
                          patch: { calendar_actions_enabled: !settings.calendar_actions_enabled },
                        },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          disabled={saving}
                          onClick={() => saveSettings(item.patch)}
                          className={[
                            "rounded-2xl border p-4 text-left transition-all",
                            item.enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50/70 hover:bg-white",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                            <Badge variant="outline" className={item.enabled ? "border-emerald-200 bg-white text-emerald-700" : "border-slate-200 bg-white text-slate-500"}>
                              {item.enabled ? "On" : "Off"}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.detail}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}
            </TabsContent>

            <TabsContent value="activity" className="mt-5">
              <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-slate-950">Approval queue</h2>
                      <p className="mt-1 text-sm text-slate-500">Drafts waiting for owner YES/NO.</p>
                    </div>
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                      {approvals.length} pending
                    </Badge>
                  </div>

                  {approvals.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <Clock3 className="mx-auto h-8 w-8 text-slate-400" />
                      <p className="mt-3 text-sm font-medium text-slate-800">No approvals waiting</p>
                      <p className="mt-1 text-sm text-slate-500">Review mode drafts will collect here.</p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {approvals.map((approval) => (
                        <div key={approval.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{approval.customer_number}</p>
                            <Badge variant="outline" className="border-amber-200 bg-white text-amber-700">
                              {approval.confidence != null ? `${Math.round(approval.confidence * 100)}%` : "Review"}
                            </Badge>
                          </div>
                          {approval.customer_message ? (
                            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                              Customer: {approval.customer_message}
                            </p>
                          ) : null}
                          <p className="mt-2 line-clamp-3 rounded-xl bg-white px-3 py-2 text-xs leading-relaxed text-slate-700">
                            {approval.draft_body}
                          </p>
                          <p className="mt-2 text-[11px] text-slate-400">{formatDate(approval.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-950">Activity feed</h2>
                    <p className="mt-1 text-sm text-slate-500">What Frontline did, drafted, held, or learned.</p>
                  </div>
                  <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => load()}>
                    Refresh
                  </Button>
                </div>
                {events.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <Activity className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-3 text-sm font-medium text-slate-800">No activity yet</p>
                    <p className="mt-1 text-sm text-slate-500">Customer messages and teach notes will show here.</p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {events.map((event) => (
                      <div key={event.id} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                            {event.status ? (
                              <Badge variant="outline" className="border-slate-200 bg-white text-slate-500">
                                {event.status}
                              </Badge>
                            ) : null}
                          </div>
                          {event.detail ? (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{event.detail}</p>
                          ) : null}
                          <p className="mt-2 text-[11px] text-slate-400">
                            {formatDate(event.created_at)}
                            {event.customer_number ? ` | ${event.customer_number}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
