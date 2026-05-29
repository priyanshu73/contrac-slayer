"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FlaskConical,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Mic2,
  PenLine,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wand2,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import {
  formatFrontlineActivityDate,
  formatWeeklyChartDayLabel,
  getBrowserTimezone,
  parseCalendarDateYmd,
} from "@/lib/frontline-datetime";
import { FrontlineVoiceTrainingPanel } from "@/components/frontline/frontline-voice-training-panel";
import { FrontlineInitialSetupCard } from "@/components/frontline/frontline-initial-setup-card";
import type {
  FrontlineActivityEvent,
  FrontlineKnowledgeIntakeResponse,
  FrontlineMode,
  FrontlineReplyApproval,
  FrontlineSandboxAnswer,
  FrontlineSettings,
  FrontlineStats,
} from "@/lib/types/frontline";

type ViewKey = "dashboard" | "train" | "test" | "settings";

type KnowledgeSection = {
  title: string;
  content: string;
  words: number;
};


type VoiceState = "idle" | "connecting" | "recording" | "saving" | "completed" | "failed";

type VoiceTranscriptItem = {
  role: "user" | "assistant";
  text: string;
  at?: string;
};


const VIEW_STEPS: Array<{
  id: ViewKey;
  title: string;
  subtitle: string;
  icon: ElementType;
}> = [
  {
    id: "dashboard",
    title: "Dashboard",
    subtitle: "Calls, texts, and recent activity.",
    icon: LayoutDashboard,
  },
  {
    id: "train",
    title: "Train",
    subtitle: "Give it the business basics.",
    icon: BookOpen,
  },
  {
    id: "test",
    title: "Test",
    subtitle: "Ask a customer-style question.",
    icon: FlaskConical,
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "Reply mode, voice, and operator.",
    icon: ShieldCheck,
  },
];

const MODE_OPTIONS: Array<{
  mode: FrontlineMode;
  title: string;
  subtitle: string;
  icon: ElementType;
}> = [
  {
    mode: "review",
    title: "Review",
    subtitle: "Drafts replies and asks the owner before sending.",
    icon: UserRound,
  },
  {
    mode: "auto",
    title: "Auto",
    subtitle: "Sends directly only when the answer is confident.",
    icon: Zap,
  },
  {
    mode: "off",
    title: "Off",
    subtitle: "Keeps the smart operator paused.",
    icon: Clock3,
  },
];

const OPERATOR_OPTIONS = [
  { name: "Henry", voiceId: "matthew", label: "Male" },
  { name: "Jane", voiceId: "tiffany", label: "Female" },
] as const;

const QUICK_TESTS = [
  "Do you service my area and can I get an estimate?",
  "Can you come tomorrow morning for a repair?",
  "How much do you charge and do you offer warranties?",
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toneClasses(tone: string) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-slate-200 bg-white text-slate-900";
  }
}

function parseKnowledgeSections(markdown: string): KnowledgeSection[] {
  const lines = markdown.split("\n");
  const sections: KnowledgeSection[] = [];
  let currentTitle = "Business basics";
  let current: string[] = [];

  const flush = () => {
    const content = current.join("\n").trim();
    if (!content) return;
    sections.push({
      title: currentTitle.replace(/^#+\s*/, "").trim() || "Business basics",
      content,
      words: content.split(/\s+/).filter(Boolean).length,
    });
  };

  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) {
      flush();
      currentTitle = line;
      current = [];
    } else {
      current.push(line);
    }
  }

  flush();
  return sections;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return window.btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function downsampleToPcm16(input: Float32Array, inputRate: number, outputRate = 16000) {
  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.floor((index + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let sampleIndex = start; sampleIndex < end && sampleIndex < input.length; sampleIndex += 1) {
      sum += input[sampleIndex];
      count += 1;
    }
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, count)));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return new Uint8Array(output.buffer);
}

function pcm16ToAudioBuffer(bytes: Uint8Array, context: AudioContext, sampleRate = 24000) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = bytes.byteLength / 2;
  const buffer = context.createBuffer(1, samples, sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < samples; index += 1) {
    channel[index] = view.getInt16(index * 2, true) / 0x8000;
  }
  return buffer;
}

function formatTalkTime(minutes: number) {
  if (!minutes || minutes < 1) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

const STAT_TONES = {
  emerald: { ring: "border-emerald-100 bg-emerald-50/60", chip: "bg-emerald-100 text-emerald-700" },
  sky: { ring: "border-sky-100 bg-sky-50/60", chip: "bg-sky-100 text-sky-700" },
  violet: { ring: "border-violet-100 bg-violet-50/60", chip: "bg-violet-100 text-violet-700" },
  amber: { ring: "border-amber-100 bg-amber-50/60", chip: "bg-amber-100 text-amber-700" },
} as const;

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "emerald",
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  tone?: keyof typeof STAT_TONES;
}) {
  const palette = STAT_TONES[tone];
  return (
    <div className={cx("rounded-2xl border p-3.5", palette.ring)}>
      <div className="flex items-center gap-2">
        <span className={cx("flex h-7 w-7 items-center justify-center rounded-lg", palette.chip)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">
        {value}
      </div>
    </div>
  );
}

function statusText(settings: FrontlineSettings | null) {
  if (!settings?.enabled || settings.mode === "off") return "Paused";
  if (settings.mode === "auto") return "Auto mode";
  return "Review mode";
}

function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}


function StepButton({
  active,
  step,
  onClick,
}: {
  active: boolean;
  step: (typeof VIEW_STEPS)[number];
  onClick: () => void;
}) {
  const Icon = step.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-h-[84px] flex-1 items-start gap-3 rounded-2xl border p-4 text-left transition",
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300",
      )}
    >
      <span
        className={cx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{step.title}</span>
        <span className={cx("mt-1 block text-xs", active ? "text-slate-200" : "text-slate-500")}>
          {step.subtitle}
        </span>
      </span>
    </button>
  );
}

function ModeButton({
  active,
  option,
  onClick,
}: {
  active: boolean;
  option: (typeof MODE_OPTIONS)[number];
  onClick: () => void;
}) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex gap-3 rounded-2xl border p-4 text-left transition",
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300",
      )}
    >
      <span
        className={cx(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{option.title}</span>
        <span className={cx("mt-1 block text-xs", active ? "text-slate-200" : "text-slate-500")}>
          {option.subtitle}
        </span>
      </span>
    </button>
  );
}

function DashboardView({
  stats,
  statsWindow,
  onWindowChange,
  events,
  approvals,
}: {
  stats: FrontlineStats | null;
  statsWindow: "all" | "last_30d";
  onWindowChange: (window: "all" | "last_30d") => void;
  events: FrontlineActivityEvent[];
  approvals: FrontlineReplyApproval[];
}) {
  const window = stats?.[statsWindow];
  const weekly = stats?.weekly_calls ?? [];
  const weeklyChartData = useMemo(
    () =>
      weekly.map((point) => ({
        ...point,
        day: formatWeeklyChartDayLabel(point.date, point.day),
      })),
    [weekly],
  );
  const weeklyTotal = weekly.reduce((sum, point) => sum + point.answered + point.sent_to_you, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-6">
        <Surface>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Activity className="h-4 w-4 text-emerald-500" />
              At a glance
            </div>
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5">
              {([
                { key: "all", label: "All time" },
                { key: "last_30d", label: "30 days" },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onWindowChange(option.key)}
                  className={cx(
                    "rounded-full px-3 py-1 text-[11px] font-medium transition",
                    statsWindow === option.key
                      ? "bg-slate-950 text-white"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard tone="emerald" icon={PhoneCall} label="Calls handled" value={window?.calls_handled ?? 0} />
            <StatCard tone="sky" icon={Clock3} label="Talk time" value={formatTalkTime(window?.talk_minutes ?? 0)} />
            <StatCard tone="violet" icon={MessageSquare} label="Texts handled" value={window?.texts_handled ?? 0} />
            <StatCard tone="amber" icon={PhoneForwarded} label="Handoffs" value={window?.handoffs ?? 0} />
          </div>
        </Surface>

        <Surface>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <PhoneCall className="h-4 w-4 text-emerald-500" />
                Calls this week
              </div>
              {stats?.timezone ? (
                <p className="text-[11px] text-slate-500">
                  Week and days use your local time ({stats.timezone.replace(/_/g, " ")}).
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Answered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
                Sent to you
              </span>
            </div>
          </div>

          {weeklyTotal > 0 ? (
            <div className="mt-5 h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyChartData}
                  margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
                  barSize={26}
                >
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    width={32}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(16,185,129,0.06)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                      boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                    }}
                    labelFormatter={(_label, payload) => {
                      const dateYmd = payload?.[0]?.payload?.date as string | undefined;
                      const day = parseCalendarDateYmd(dateYmd ?? "");
                      if (!day) return _label;
                      return new Intl.DateTimeFormat(undefined, {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      }).format(day);
                    }}
                  />
                  <Bar dataKey="answered" name="Answered" stackId="calls" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sent_to_you" name="Sent to you" stackId="calls" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm leading-6 text-slate-500">
              No calls yet this week. Answered calls and handoffs will chart here.
            </p>
          )}
        </Surface>

      </div>

      <div className="space-y-6">
        <Surface className="bg-gradient-to-br from-white to-amber-50/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <ClipboardList className="h-4 w-4 text-amber-500" />
            Waiting for owner
          </div>
          <div className="mt-4 space-y-3">
            {approvals.length ? (
              approvals.slice(0, 4).map((approval) => (
                <div
                  key={approval.id}
                  className="rounded-2xl border border-amber-100 bg-white/80 p-4"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{approval.customer_number}</span>
                    <span>{formatFrontlineActivityDate(approval.created_at)}</span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-800">
                    {approval.draft_body}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-amber-200 bg-white/60 p-4 text-sm leading-6 text-slate-500">
                No pending owner approvals.
              </p>
            )}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <Activity className="h-4 w-4 text-sky-500" />
            Recent activity
          </div>
          <div className="mt-4 space-y-2.5">
            {events.length ? (
              events.slice(0, 6).map((event) => (
                <div
                  key={event.id}
                  className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-950">
                      {event.title || event.event_type}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {formatFrontlineActivityDate(event.created_at)}
                    </div>
                    {event.detail && (
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                        {event.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                Activity will appear after sandbox tests, teach notes, approvals, and SMS events.
              </p>
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function SmsPreview({
  operatorName,
  askedQuestion,
  answer,
  pending,
  quickTests,
  onSend,
  teachValue,
  setTeachValue,
  onTeach,
}: {
  operatorName: string;
  askedQuestion: string;
  answer: FrontlineSandboxAnswer | null;
  pending: boolean;
  quickTests: readonly string[];
  onSend: (text: string) => void;
  teachValue: string;
  setTeachValue: (value: string) => void;
  onTeach: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [teaching, setTeaching] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const confidence = answer ? Math.round((answer.confidence || 0) * 100) : null;
  const hasThread = Boolean(askedQuestion.trim() || answer || pending);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [askedQuestion, answer, pending, teaching]);

  useEffect(() => {
    if (!answer) setTeaching(false);
  }, [answer]);

  const send = () => {
    const text = draft.trim();
    if (!text || pending) return;
    onSend(text);
    setDraft("");
  };

  const saveCorrection = () => {
    if (!teachValue.trim()) return;
    onTeach();
    setTeaching(false);
  };

  return (
    <div className="flex w-full max-w-[360px] flex-col items-center">
      <div className="w-full rounded-[2.75rem] border border-slate-200 bg-slate-950 p-2.5 shadow-xl">
        <div className="relative flex flex-col overflow-hidden rounded-[2.25rem] bg-white">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-28 -translate-x-1/2 rounded-full bg-slate-950" />

          <div className="flex flex-col items-center gap-1 border-b border-slate-100 bg-slate-50/80 px-4 pb-3 pt-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
              {operatorName.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-slate-900">{operatorName}</span>
            {confidence !== null ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {confidence}% confident
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Phone className="h-3 w-3" />
                Frontline operator · sandbox
              </span>
            )}
          </div>

          <div
            ref={threadRef}
            className="flex h-[440px] flex-col gap-3 overflow-y-auto bg-[linear-gradient(180deg,#fafafa,#f1f5f9)] px-3 py-4"
          >
            {!hasThread ? (
              <div className="m-auto flex flex-col items-center gap-4 px-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Try it like a customer</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Text a question below. The operator answers from the same knowledge it uses on
                    real SMS — so you can check it before going live.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2">
                  {quickTests.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => setDraft(question)}
                      className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-left text-xs leading-5 text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50/70 hover:text-emerald-800"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {askedQuestion.trim() && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-sky-500 px-3.5 py-2 text-sm leading-5 text-white shadow-sm">
                      {askedQuestion}
                    </div>
                  </div>
                )}

                {pending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-sm">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    </div>
                  </div>
                )}

                {answer && !pending && (
                  <>
                    <div className="flex flex-col items-start gap-1.5">
                      <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-slate-100 bg-white px-3.5 py-2 text-sm leading-5 text-slate-800 shadow-sm">
                        {answer.answer}
                      </div>
                      {!teaching && (
                        <button
                          type="button"
                          onClick={() => {
                            setTeachValue(answer.answer || "");
                            setTeaching(true);
                          }}
                          className="ml-1 flex items-center gap-1 text-[11px] font-medium text-slate-400 transition hover:text-emerald-600"
                        >
                          <Wand2 className="h-3 w-3" />
                          Not quite? Teach a better reply
                        </button>
                      )}
                    </div>
                    {answer.escalation_reason && (
                      <div className="flex justify-start">
                        <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs leading-5 text-amber-900">
                          Would hand off: {answer.escalation_reason}
                        </div>
                      </div>
                    )}
                    {answer.sources?.length ? (
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {answer.sources.map((source) => (
                          <span
                            key={source}
                            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </>
            )}
          </div>

          {teaching ? (
            <div className="border-t border-emerald-100 bg-emerald-50/70 px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                  <Wand2 className="h-3.5 w-3.5" />
                  Teaching — this becomes future knowledge
                </span>
                <button
                  type="button"
                  onClick={() => setTeaching(false)}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
              <Textarea
                value={teachValue}
                onChange={(event) => setTeachValue(event.target.value)}
                placeholder="Write the reply it should have given…"
                className="min-h-[80px] resize-none rounded-2xl border-emerald-200 bg-white text-sm leading-5 focus-visible:ring-emerald-400"
              />
              <Button
                onClick={saveCorrection}
                disabled={pending || !teachValue.trim()}
                className="mt-2 w-full gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save correction
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-3">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder="Text message"
                disabled={pending}
                className="min-w-0 flex-1 rounded-full bg-slate-100 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={send}
                disabled={pending || !draft.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Replies use your live knowledge. Corrections train it instantly.
      </p>
    </div>
  );
}

export function FrontlinePage() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [settings, setSettings] = useState<FrontlineSettings | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [trainingIntake, setTrainingIntake] = useState("");
  const [intakeResult, setIntakeResult] = useState<FrontlineKnowledgeIntakeResponse | null>(null);
  const [sandboxQ, setSandboxQ] = useState("");
  const [sandboxA, setSandboxA] = useState<FrontlineSandboxAnswer | null>(null);
  const [teachBad, setTeachBad] = useState("");
  const [teachGood, setTeachGood] = useState("");
  const [events, setEvents] = useState<FrontlineActivityEvent[]>([]);
  const [approvals, setApprovals] = useState<FrontlineReplyApproval[]>([]);
  const [stats, setStats] = useState<FrontlineStats | null>(null);
  const [statsWindow, setStatsWindow] = useState<"all" | "last_30d">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [operatorEditing, setOperatorEditing] = useState(false);
  const [operatorDraftVoiceId, setOperatorDraftVoiceId] = useState("matthew");

  const sections = useMemo(() => parseKnowledgeSections(markdown), [markdown]);
  const activeMode: FrontlineMode = settings?.enabled ? settings.mode : "off";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsResponse, knowledgeResponse, activityResponse, approvalResponse, statsResponse] =
        await Promise.all([
          api.getFrontlineSettings(),
          api.getFrontlineKnowledge(),
          api.getFrontlineActivity(20),
          api.getFrontlineApprovals("pending"),
          api.getFrontlineStats(getBrowserTimezone()).catch(() => null),
        ]);

      setSettings(settingsResponse);
      setMarkdown(knowledgeResponse.markdown_text || "");
      setEvents(activityResponse.events || []);
      setApprovals(approvalResponse.approvals || []);
      setStats(statsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Your Frontline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!settings) return;
    setOperatorDraftVoiceId(settings.operator_voice_id || "matthew");
  }, [settings?.operator_voice_id]);

  const flashSuccess = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(null), 2600);
  };

  const saveSettings = async (patch: Partial<FrontlineSettings>) => {
    try {
      setSaving(true);
      setError(null);
      const updated = await api.updateFrontlineSettings(patch);
      setSettings(updated);
      flashSuccess("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const saveOperatorIdentity = async () => {
    const selected =
      OPERATOR_OPTIONS.find((option) => option.voiceId === operatorDraftVoiceId) ||
      OPERATOR_OPTIONS[0];
    if (!selected) return;
    await saveSettings({
      operator_display_name: selected.name,
      operator_voice_id: selected.voiceId,
    });
    setOperatorEditing(false);
  };


  const submitTrainingIntake = async () => {
    if (!trainingIntake.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const result = await api.submitFrontlineKnowledgeIntake(trainingIntake.trim(), "text_intake");
      setIntakeResult(result);
      setMarkdown(result.markdown_text || "");
      setTrainingIntake("");
      setView("test");
      flashSuccess("Training notes turned into operator knowledge.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process training notes.");
    } finally {
      setSaving(false);
    }
  };

  const runSandbox = async (text?: string) => {
    const question = (text ?? sandboxQ).trim();
    if (!question) return;
    try {
      setSaving(true);
      setError(null);
      setSandboxQ(question);
      const answer = await api.frontlineSandboxAsk(question);
      setSandboxA(answer);
      setTeachBad(answer.answer || "");
      setTeachGood("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run the sandbox.");
    } finally {
      setSaving(false);
    }
  };

  const submitTeach = async () => {
    if (!teachGood.trim()) return;
    try {
      setSaving(true);
      setError(null);
      await api.frontlineTeach({
        question: sandboxQ || "Sandbox correction",
        bad_answer: teachBad || sandboxA?.answer || "",
        corrected_answer: teachGood.trim(),
        source: "sandbox",
      });
      setTeachGood("");
      flashSuccess("Correction saved as training material.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save that correction.");
    } finally {
      setSaving(false);
    }
  };



  const updateMode = (mode: FrontlineMode) => {
    if (!settings?.initial_setup_done && mode !== "off") {
      setError("Complete initial operator setup before turning Frontline on.");
      return;
    }
    void saveSettings({
      mode,
      enabled: mode !== "off",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Your Frontline...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/40 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              Your Frontline
            </Badge>
            <Badge
              className={cx(
                "border",
                activeMode === "auto"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : activeMode === "review"
                    ? "border-sky-200 bg-sky-50 text-sky-800"
                    : "border-slate-200 bg-slate-100 text-slate-600",
              )}
            >
              {statusText(settings)}
            </Badge>
          </div>
          <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Make the business number answer like a trained operator.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Train it on your business, test replies, then run SMS and calls with the right amount of trust.
          </p>
        </header>

        {settings && !settings.initial_setup_done && (
          <FrontlineInitialSetupCard
            onComplete={() => void load()}
            onError={(message) => setError(message)}
          />
        )}

        {(error || success) && (
          <div
            className={cx(
              "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
              error ? toneClasses("danger") : toneClasses("success"),
            )}
          >
            {error ? <AlertTriangle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
            <span>{error || success}</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VIEW_STEPS.map((step) => (
            <StepButton
              key={step.id}
              active={view === step.id}
              step={step}
              onClick={() => setView(step.id)}
            />
          ))}
        </div>

        {view === "dashboard" && (
          <DashboardView
            stats={stats}
            statsWindow={statsWindow}
            onWindowChange={setStatsWindow}
            events={events}
            approvals={approvals}
          />
        )}

        {view === "train" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Surface>
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
                <PenLine className="h-3.5 w-3.5 text-slate-400" />
                Training notes
              </div>
              <p className="mt-1 text-[12.5px] text-slate-500">
                Write anything — pricing, policies, how you work. Short is fine.
              </p>

              <Textarea
                value={trainingIntake}
                onChange={(event) => setTrainingIntake(event.target.value)}
                placeholder="e.g. We charge $85–150/hr. Free estimates for jobs over $500. We don't do roofing or electrical. Emergency calls go to Mike directly..."
                className="mt-4 min-h-[180px] resize-none rounded-xl border-slate-200 bg-slate-50/60 text-[13px] leading-6 placeholder:text-slate-400 focus-visible:ring-slate-300"
              />

              <div className="mt-3 flex justify-end">
                <Button
                  onClick={submitTrainingIntake}
                  disabled={saving || trainingIntake.trim().length < 20}
                  className="gap-2 rounded-full bg-slate-900 px-5 text-[13px] text-white hover:bg-slate-700"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  Build knowledge
                </Button>
              </div>
            </Surface>

            <div className="space-y-6">
              <FrontlineVoiceTrainingPanel
                onKnowledgeSaved={(nextMarkdown, summary) => {
                  setMarkdown(nextMarkdown)
                  if (summary) setIntakeResult({ markdown_text: nextMarkdown, intake_summary: summary } as FrontlineKnowledgeIntakeResponse)
                  setView("test")
                  flashSuccess("Voice training saved to operator knowledge.")
                }}
                onError={(message) => setError(message)}
              />

              <Surface>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">Current knowledge</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {sections.length
                        ? `${sections.length} sections are ready for retrieval.`
                        : "No knowledge has been added yet."}
                    </p>
                  </div>
                </div>
                {intakeResult?.intake_summary && (
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                    {intakeResult.intake_summary}
                  </div>
                )}
              </Surface>
            </div>
          </div>
        )}

        {view === "test" && (
          <div className="flex justify-center">
            <SmsPreview
              operatorName={
                settings?.operator_display_name ||
                OPERATOR_OPTIONS.find(
                  (option) => option.voiceId === (settings?.operator_voice_id || "matthew"),
                )?.name ||
                "Henry"
              }
              askedQuestion={sandboxQ}
              answer={sandboxA}
              pending={saving}
              quickTests={QUICK_TESTS}
              onSend={(text) => void runSandbox(text)}
              teachValue={teachGood}
              setTeachValue={setTeachGood}
              onTeach={submitTeach}
            />
          </div>
        )}

        {view === "settings" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
            <div className="space-y-6">
              <Surface>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Reply mode
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      Review is the default. Auto should only be used after the owner has tested the
                      knowledge and correction loop.
                    </p>
                  </div>
                  <Badge className="w-fit border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100">
                    {statusText(settings)}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {MODE_OPTIONS.map((option) => (
                    <ModeButton
                      key={option.mode}
                      active={activeMode === option.mode}
                      option={option}
                      onClick={() => updateMode(option.mode)}
                    />
                  ))}
                </div>

                {settings && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-950">Auto confidence floor</span>
                      <span className="font-semibold text-slate-950">
                        {Math.round(settings.auto_min_confidence * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={0.95}
                      step={0.05}
                      value={settings.auto_min_confidence}
                      onChange={(event) =>
                        setSettings((current) =>
                          current
                            ? {
                                ...current,
                                auto_min_confidence: Number(event.target.value),
                              }
                            : current,
                        )
                      }
                      onMouseUp={() =>
                        void saveSettings({
                          auto_min_confidence: settings.auto_min_confidence,
                        })
                      }
                      onTouchEnd={() =>
                        void saveSettings({
                          auto_min_confidence: settings.auto_min_confidence,
                        })
                      }
                      className="mt-3 w-full accent-slate-950"
                    />
                  </div>
                )}

                {settings && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                          <Mic2 className="h-4 w-4 text-slate-500" />
                          Operator identity
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Choose the default operator voice for Frontline phone calls.
                        </p>
                      </div>
                      {!operatorEditing ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setOperatorEditing(true)}
                          className="rounded-xl"
                        >
                          <PenLine className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={saving}
                            onClick={() => {
                              setOperatorDraftVoiceId(settings.operator_voice_id || "matthew");
                              setOperatorEditing(false);
                            }}
                            className="rounded-xl"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              saving ||
                              operatorDraftVoiceId === (settings.operator_voice_id || "matthew")
                            }
                            onClick={() => void saveOperatorIdentity()}
                            className="rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                          >
                            {saving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      Current operator:{" "}
                      <span className="font-semibold text-slate-950">
                        {settings.operator_display_name ||
                          OPERATOR_OPTIONS.find(
                            (option) =>
                              option.voiceId === (settings.operator_voice_id || "matthew"),
                          )?.name ||
                          "Henry"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {OPERATOR_OPTIONS.map((option) => {
                        const active = operatorDraftVoiceId === option.voiceId;
                        return (
                          <button
                            key={option.voiceId}
                            type="button"
                            onClick={() => setOperatorDraftVoiceId(option.voiceId)}
                            disabled={!operatorEditing}
                            className={cx(
                              "rounded-xl border px-3 py-3 text-left text-sm transition",
                              !operatorEditing && "cursor-default opacity-75",
                              active
                                ? "border-slate-950 bg-white text-slate-950 shadow-sm"
                                : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white",
                            )}
                          >
                            <span className="block font-semibold">{option.name}</span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {option.label} voice
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {settings && (
                  <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <Mic2 className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-slate-950">Voice calls (beta)</div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          When enabled, inbound calls to your Twilio number can be answered by AI.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={Boolean(settings.voice_enabled)}
                      onCheckedChange={(checked) => void saveSettings({ voice_enabled: checked })}
                      disabled={!settings.initial_setup_done}
                      aria-label="Enable voice calls"
                    />
                  </div>
                )}
              </Surface>

            </div>

            <div className="space-y-6">
              <Surface className="bg-gradient-to-br from-white to-sky-50/50">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <Sparkles className="h-4 w-4 text-sky-500" />
                  How trust builds
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    Start in <span className="font-medium text-slate-800">Review</span> — every reply waits for your OK.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    Use <span className="font-medium text-slate-800">Test</span> to correct answers until they sound right.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    Switch to <span className="font-medium text-slate-800">Auto</span> once confident — only high-confidence replies send on their own.
                  </li>
                </ul>
                <p className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs leading-5 text-slate-500">
                  Live stats and recent activity now live in the Dashboard tab.
                </p>
              </Surface>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
