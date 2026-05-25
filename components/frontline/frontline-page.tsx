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
  FileText,
  FlaskConical,
  Loader2,
  MessageSquare,
  Mic2,
  PenLine,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wand2,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { FrontlineVoiceTrainingPanel } from "@/components/frontline/frontline-voice-training-panel";
import { FrontlineInitialSetupCard } from "@/components/frontline/frontline-initial-setup-card";
import type {
  FrontlineActivityEvent,
  FrontlineKnowledgeIntakeResponse,
  FrontlineMode,
  FrontlineReplyApproval,
  FrontlineSandboxAnswer,
  FrontlineSettings,
} from "@/lib/types/frontline";

type ViewKey = "train" | "test" | "operate";

type KnowledgeSection = {
  title: string;
  content: string;
  words: number;
};

type TrainingPrompt = {
  key: string;
  title: string;
  prompt: string;
};

type VoiceState = "idle" | "connecting" | "recording" | "saving" | "completed" | "failed";

type VoiceTranscriptItem = {
  role: "user" | "assistant";
  text: string;
  at?: string;
};

const TRAINING_PROMPTS: TrainingPrompt[] = [
  {
    key: "services",
    title: "Services",
    prompt:
      "What services do you offer, what jobs do you avoid, and what is your ideal customer?",
  },
  {
    key: "pricing",
    title: "Pricing",
    prompt:
      "How should the operator explain estimates, minimums, deposits, trip fees, and pricing boundaries?",
  },
  {
    key: "schedule",
    title: "Scheduling",
    prompt:
      "What hours, service areas, booking rules, emergency rules, and lead times should it know?",
  },
  {
    key: "tone",
    title: "Tone",
    prompt:
      "How should it sound when replying to customers? Include words or promises it should avoid.",
  },
  {
    key: "handoff",
    title: "Handoff",
    prompt:
      "When should it escalate to you instead of answering by itself?",
  },
  {
    key: "proof",
    title: "Proof",
    prompt:
      "What licenses, warranties, guarantees, neighborhoods, reviews, or trust details should it mention?",
  },
];

const VIEW_STEPS: Array<{
  id: ViewKey;
  title: string;
  subtitle: string;
  icon: ElementType;
}> = [
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
    id: "operate",
    title: "Operate",
    subtitle: "Choose how replies are handled.",
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

function formatDate(value?: string | null) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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

function MiniMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-950">{value}</span>
        <span className="block text-xs text-slate-500">{label}</span>
      </span>
    </div>
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

export function FrontlinePage() {
  const [view, setView] = useState<ViewKey>("train");
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
  const [showSource, setShowSource] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [operatorEditing, setOperatorEditing] = useState(false);
  const [operatorDraftVoiceId, setOperatorDraftVoiceId] = useState("matthew");

  const sections = useMemo(() => parseKnowledgeSections(markdown), [markdown]);
  const wordCount = useMemo(
    () => markdown.split(/\s+/).filter(Boolean).length,
    [markdown],
  );
  const activeMode: FrontlineMode = settings?.enabled ? settings.mode : "off";
  const coverageCount = Math.min(TRAINING_PROMPTS.length, sections.length);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsResponse, knowledgeResponse, activityResponse, approvalResponse] =
        await Promise.all([
          api.getFrontlineSettings(),
          api.getFrontlineKnowledge(),
          api.getFrontlineActivity(20),
          api.getFrontlineApprovals("pending"),
        ]);

      setSettings(settingsResponse);
      setMarkdown(knowledgeResponse.markdown_text || "");
      setEvents(activityResponse.events || []);
      setApprovals(approvalResponse.approvals || []);
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

  const saveKnowledge = async (nextMarkdown = markdown) => {
    try {
      setSaving(true);
      setError(null);
      const updated = await api.updateFrontlineKnowledge(nextMarkdown, true);
      setMarkdown(updated.markdown_text || nextMarkdown);
      flashSuccess("Knowledge updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save knowledge.");
    } finally {
      setSaving(false);
    }
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

  const runSandbox = async () => {
    if (!sandboxQ.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const answer = await api.frontlineSandboxAsk(sandboxQ.trim());
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

  const appendPrompt = (prompt: string) => {
    setTrainingIntake((current) => {
      const trimmed = current.trim();
      return `${trimmed ? `${trimmed}\n\n` : ""}${prompt}\n`;
    });
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
        <header className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100">
                  Your Frontline
                </Badge>
                <Badge
                  className={cx(
                    "border",
                    activeMode === "auto"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : activeMode === "review"
                        ? "border-blue-200 bg-blue-50 text-blue-800"
                        : "border-slate-200 bg-slate-100 text-slate-600",
                  )}
                >
                  {statusText(settings)}
                </Badge>
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                Make the business number answer like a trained operator.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Start by training it with plain business context. Then test replies in the sandbox and
                run SMS in review mode until it earns more trust.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="Knowledge sections" value={sections.length || 0} icon={FileText} />
              <MiniMetric label="Words trained" value={wordCount || 0} icon={BookOpen} />
              <MiniMetric label="Pending replies" value={approvals.length || 0} icon={MessageSquare} />
              <MiniMetric label="Recent events" value={events.length || 0} icon={Activity} />
            </div>
          </div>
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

        <div className="grid gap-3 md:grid-cols-3">
          {VIEW_STEPS.map((step) => (
            <StepButton
              key={step.id}
              active={view === step.id}
              step={step}
              onClick={() => setView(step.id)}
            />
          ))}
        </div>

        {view === "train" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Surface>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <PenLine className="h-4 w-4 text-slate-500" />
                    Training notes
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Write naturally, paste notes, or answer the starter prompts. The system converts
                    this into the structured knowledge used by SMS and sandbox replies.
                  </p>
                </div>
                <Badge className="w-fit border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100">
                  {coverageCount}/{TRAINING_PROMPTS.length} areas started
                </Badge>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {TRAINING_PROMPTS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => appendPrompt(item.prompt)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {item.title}
                  </button>
                ))}
              </div>

              <Textarea
                value={trainingIntake}
                onChange={(event) => setTrainingIntake(event.target.value)}
                placeholder="Example: We serve homeowners within 25 miles. We usually reply in 10 minutes. Emergency jobs should be escalated. For pricing, explain that final estimates require photos or a visit..."
                className="mt-5 min-h-[230px] resize-none rounded-2xl border-slate-200 bg-slate-50 text-sm leading-6 focus-visible:ring-slate-400"
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500">
                  Better initial notes mean fewer corrections later. Short is fine.
                </span>
                <Button
                  onClick={submitTrainingIntake}
                  disabled={saving || trainingIntake.trim().length < 20}
                  className="gap-2 rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
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
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <Surface>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <FlaskConical className="h-4 w-4 text-slate-500" />
                Sandbox
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Ask it the way a customer would. The answer uses the same knowledge path the SMS
                operator will use.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {QUICK_TESTS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => setSandboxQ(question)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {question}
                  </button>
                ))}
              </div>

              <Textarea
                value={sandboxQ}
                onChange={(event) => setSandboxQ(event.target.value)}
                placeholder="Customer asks..."
                className="mt-5 min-h-[150px] resize-none rounded-2xl border-slate-200 bg-slate-50 text-sm leading-6 focus-visible:ring-slate-400"
              />

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={runSandbox}
                  disabled={saving || !sandboxQ.trim()}
                  className="gap-2 rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  Draft reply
                </Button>
              </div>
            </Surface>

            <div className="space-y-6">
              <Surface>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <MessageSquare className="h-4 w-4 text-slate-500" />
                    Draft
                  </div>
                  {sandboxA && (
                    <Badge className="border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100">
                      {Math.round((sandboxA.confidence || 0) * 100)}% confidence
                    </Badge>
                  )}
                </div>

                {sandboxA ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                      {sandboxA.answer}
                    </div>
                    {sandboxA.escalation_reason && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                        Escalate: {sandboxA.escalation_reason}
                      </div>
                    )}
                    {sandboxA.sources?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {sandboxA.sources.map((source) => (
                          <Badge
                            key={source}
                            className="border-slate-200 bg-white text-slate-600 hover:bg-white"
                          >
                            {source}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                    The drafted answer will appear here.
                  </p>
                )}
              </Surface>

              {sandboxA && (
                <Surface>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Wand2 className="h-4 w-4 text-slate-500" />
                    Teach it
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    If the reply is off, write the answer it should have given. That correction becomes
                    future knowledge.
                  </p>
                  <Textarea
                    value={teachGood}
                    onChange={(event) => setTeachGood(event.target.value)}
                    placeholder="The ideal answer should say..."
                    className="mt-4 min-h-[120px] resize-none rounded-2xl border-slate-200 bg-slate-50 text-sm leading-6 focus-visible:ring-slate-400"
                  />
                  <Button
                    variant="outline"
                    onClick={submitTeach}
                    disabled={saving || !teachGood.trim()}
                    className="mt-4 w-full gap-2 rounded-xl border-slate-200"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save correction
                  </Button>
                </Surface>
              )}
            </div>
          </div>
        )}

        {view === "operate" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="space-y-6">
              <Surface>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <ShieldCheck className="h-4 w-4 text-slate-500" />
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

              <Surface>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <BookOpen className="h-4 w-4 text-slate-500" />
                    Knowledge map
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowSource((current) => !current)}
                    className="h-8 rounded-xl px-3 text-xs text-slate-600"
                  >
                    {showSource ? "Hide source" : "Advanced"}
                  </Button>
                </div>

                {sections.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {sections.slice(0, 4).map((section) => (
                      <div
                        key={section.title}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="text-sm font-semibold text-slate-950">{section.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{section.words} words</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                    Train it first, then the knowledge map will show the areas it can answer from.
                  </p>
                )}

                {showSource && (
                  <div className="mt-4">
                    <Textarea
                      value={markdown}
                      onChange={(event) => setMarkdown(event.target.value)}
                      className="min-h-[260px] resize-y rounded-2xl border-slate-200 bg-slate-50 font-mono text-xs leading-5 focus-visible:ring-slate-400"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => saveKnowledge()}
                        disabled={saving}
                        className="gap-2 rounded-xl border-slate-200"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save source
                      </Button>
                    </div>
                  </div>
                )}
              </Surface>
            </div>

            <div className="space-y-6">
              <Surface>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <ClipboardList className="h-4 w-4 text-slate-500" />
                  Waiting for owner
                </div>
                <div className="mt-4 space-y-3">
                  {approvals.length ? (
                    approvals.slice(0, 3).map((approval) => (
                      <div
                        key={approval.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span>{approval.customer_number}</span>
                          <span>{formatDate(approval.created_at)}</span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-800">
                          {approval.draft_body}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                      No pending owner approvals.
                    </p>
                  )}
                </div>
              </Surface>

              <Surface>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <Activity className="h-4 w-4 text-slate-500" />
                  Recent activity
                </div>
                <div className="mt-4 space-y-3">
                  {events.length ? (
                    events.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex gap-3">
                        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <CalendarClock className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-sm font-medium text-slate-950">
                            {event.title || event.event_type}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{formatDate(event.created_at)}</div>
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
        )}
      </div>
    </div>
  );
}
