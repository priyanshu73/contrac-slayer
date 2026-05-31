export type BriefInputType = "text" | "textarea" | "select" | "multicheck" | "number" | "combobox" | "date" | "phases"

export interface PhaseItem {
  id: string
  name: string
  duration: string
  description: string
  crew: string
  dependencies: string
  weatherSensitive: boolean
}

export interface BriefQuestionDefinition {
  id: string
  label: string
  type: BriefInputType
  placeholder?: string
  options?: string[]
  unit?: string
}

export interface BriefSectionDefinition {
  id: string
  label: string
  questions: BriefQuestionDefinition[]
}

export const PROJECT_BRIEF_SECTIONS: BriefSectionDefinition[] = [
  {
    id: "client-context",
    label: "Client-Specific Context",
    questions: [
      {
        id: "client_priorities",
        label: "What did the client emphasize most?",
        type: "textarea",
        placeholder: 'e.g. "Wants more natural light and storage before family visits"',
      },
      {
        id: "client_concerns",
        label: "Concerns or hesitations they raised",
        type: "textarea",
        placeholder: 'e.g. "Worried about dust, timeline, and budget creep"',
      },
      {
        id: "competing_bids",
        label: "Competing bids mentioned",
        type: "textarea",
        placeholder: 'e.g. "Received another bid that excludes finish carpentry"',
      },
      {
        id: "timeline_pressure",
        label: "Timeline pressure or event-driven?",
        type: "text",
        placeholder: 'e.g. "Needs to be done before guests arrive in mid-June"',
      },
    ],
  },
  {
    id: "scope",
    label: "Scope Boundaries",
    questions: [
      {
        id: "whats_included",
        label: "What's included",
        type: "textarea",
        placeholder: 'e.g. "Demo, framing changes, drywall patching, paint touch-up, new closet build"',
      },
      {
        id: "whats_excluded",
        label: "What's NOT included",
        type: "textarea",
        placeholder: 'e.g. "Permits, flooring replacement outside work area, electrical redesign"',
      },
      {
        id: "allowances",
        label: "Allowances vs. fixed costs",
        type: "textarea",
        placeholder: 'e.g. "Closet hardware allowance; framing and drywall are fixed"',
      },
      {
        id: "known_risks",
        label: "Known risks or unknowns",
        type: "textarea",
        placeholder: 'e.g. "Hidden framing conditions once window wall is opened up"',
      },
    ],
  },
  {
    id: "timeline",
    label: "Timeline",
    questions: [
      {
        id: "start_date",
        label: "Estimated start date",
        type: "date",
      },
      {
        id: "total_duration",
        label: "Total duration",
        type: "text",
        placeholder: 'e.g. "2-3 weeks"',
      },
      {
        id: "phases",
        label: "Project phases",
        type: "phases",
      },
      {
        id: "working_hours",
        label: "On-site working hours / days",
        type: "text",
        placeholder: 'e.g. "Mon-Fri 7am-4pm"',
      },
      {
        id: "lead_time_dependencies",
        label: "Weather or lead-time dependencies",
        type: "textarea",
        placeholder: 'e.g. "Custom windows require a 2-week lead time"',
      },
    ],
  },
]

function cleanText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function normalizePhase(phase: unknown): PhaseItem | null {
  if (!phase || typeof phase !== "object") return null
  const raw = phase as Record<string, unknown>
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : crypto.randomUUID(),
    name: cleanText(raw.name),
    duration: cleanText(raw.duration),
    description: cleanText(raw.description),
    crew: cleanText(raw.crew),
    dependencies: cleanText(raw.dependencies),
    weatherSensitive: Boolean(raw.weatherSensitive),
  }
}

export function normalizeProjectBrief(rawBrief: Record<string, any> | null | undefined) {
  if (!rawBrief || typeof rawBrief !== "object") return null

  const clientRaw = rawBrief["client-context"] ?? {}
  const scopeRaw = rawBrief.scope ?? {}
  const timelineRaw = rawBrief.timeline ?? {}
  const basicInfoRaw = rawBrief.basic_info ?? {}

  const normalized: Record<string, any> = {}

  const basicInfo: Record<string, string> = {}
  ;["title", "description", "scheduled_start_date", "scheduled_end_date", "source"].forEach((key) => {
    const value = cleanText(basicInfoRaw[key])
    if (value) basicInfo[key] = value
  })
  if (Object.keys(basicInfo).length) normalized.basic_info = basicInfo

  const clientContext: Record<string, string> = {}
  const clientMap = {
    client_priorities: clientRaw.client_priorities ?? clientRaw.cc1,
    client_concerns: clientRaw.client_concerns ?? clientRaw.cc2,
    competing_bids: clientRaw.competing_bids ?? clientRaw.cc3,
    timeline_pressure: clientRaw.timeline_pressure ?? clientRaw.cc4,
  }
  Object.entries(clientMap).forEach(([key, value]) => {
    const text = cleanText(value)
    if (text) clientContext[key] = text
  })
  if (Object.keys(clientContext).length) normalized["client-context"] = clientContext

  const scope: Record<string, string> = {}
  const scopeMap = {
    whats_included: scopeRaw.whats_included ?? scopeRaw.sc1,
    whats_excluded: scopeRaw.whats_excluded ?? scopeRaw.sc2,
    allowances: scopeRaw.allowances ?? scopeRaw.sc3,
    known_risks: scopeRaw.known_risks ?? scopeRaw.sc4 ?? scopeRaw.risks,
  }
  Object.entries(scopeMap).forEach(([key, value]) => {
    const text = cleanText(value)
    if (text) scope[key] = text
  })
  if (Object.keys(scope).length) normalized.scope = scope

  const timeline: Record<string, any> = {}
  const timelineMap = {
    start_date: timelineRaw.start_date ?? timelineRaw.tl1,
    total_duration: timelineRaw.total_duration ?? timelineRaw.tl2 ?? timelineRaw.duration,
    working_hours: timelineRaw.working_hours ?? timelineRaw.tl4,
    lead_time_dependencies: timelineRaw.lead_time_dependencies ?? timelineRaw.tl5 ?? timelineRaw.dependencies,
  }
  Object.entries(timelineMap).forEach(([key, value]) => {
    const text = cleanText(value)
    if (text) timeline[key] = text
  })
  const phasesSource = Array.isArray(timelineRaw.phases) ? timelineRaw.phases : timelineRaw.tl3
  const phases = Array.isArray(phasesSource)
    ? phasesSource.map(normalizePhase).filter((phase): phase is PhaseItem => Boolean(phase))
    : []
  if (phases.length) timeline.phases = phases
  if (Object.keys(timeline).length) normalized.timeline = timeline

  return normalized
}

export function buildInitialProjectBrief(params: {
  title: string
  objective?: string
  startDate?: string
  endDate?: string
  source?: "lead" | "quote" | "manual"
}) {
  const title = params.title.trim()
  const objective = params.objective?.trim() || ""

  return normalizeProjectBrief({
    basic_info: {
      title: title || null,
      description: objective || null,
      scheduled_start_date: params.startDate || null,
      scheduled_end_date: params.endDate || null,
      source: params.source || "manual",
    },
    timeline: {
      start_date: params.startDate || "",
    },
  })
}
