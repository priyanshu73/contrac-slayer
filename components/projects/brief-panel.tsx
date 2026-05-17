"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, ChevronDown, ChevronRight, Check, Circle, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

type InputType = "text" | "textarea" | "select" | "multicheck" | "number" | "combobox" | "date" | "phases"

interface PhaseItem {
  id: string
  name: string
  duration: string
  description: string
  crew: string
  dependencies: string
  weatherSensitive: boolean
}

interface Question {
  id: string
  label: string
  type: InputType
  placeholder?: string
  options?: string[]
  unit?: string
  answered: boolean
  value: string | string[] | PhaseItem[]
}

interface Section {
  id: string
  label: string
  questions: Question[]
}

const INITIAL_SECTIONS: Section[] = [
  {
    id: "project",
    label: "The Project",
    questions: [
      {
        id: "p1",
        label: "Primary project category",
        type: "combobox",
        options: [
          "Landscaping",
          "Hardscaping",
          "Excavation / Grading",
          "Fencing",
          "Outdoor Lighting",
          "Drainage Work",
          "Irrigation Systems",
          "Lawn Care / Maintenance",
          "Tree Services",
          "Deck / Pergola",
          "Concrete Work",
          "Retaining Walls",
          "Artificial Turf",
          "Pool / Water Features",
          "Outdoor Kitchen / BBQ",
          "Fire Pit / Fireplace",
          "Sports Courts",
          "Erosion Control",
          "Snow Removal",
          "Pressure Washing",
        ],
        answered: false,
        value: "",
      },
      {
        id: "p2",
        label: "Brief project overview",
        type: "textarea",
        placeholder: 'e.g. "Install 400 sq ft paver patio, strip old grass, lay 800 sq ft Bluegrass sod, build 20 ft retaining wall."',
        answered: false,
        value: "",
      },
    ],
  },
  {
    id: "client-context",
    label: "Client-Specific Context",
    questions: [
      {
        id: "cc1",
        label: "What did the client emphasize most?",
        type: "textarea",
        placeholder: 'e.g. "Wants low-maintenance space for grandkids; entertaining next summer"',
        answered: false,
        value: "",
      },
      {
        id: "cc2",
        label: "Concerns or hesitations they raised",
        type: "textarea",
        placeholder: 'e.g. "Worried about cost and disruption during work"',
        answered: false,
        value: "",
      },
      {
        id: "cc3",
        label: "Competing bids mentioned",
        type: "textarea",
        placeholder: 'e.g. "Got one other bid $4k cheaper but no retaining wall"',
        answered: false,
        value: "",
      },
      {
        id: "cc4",
        label: "Timeline pressure or event-driven?",
        type: "text",
        placeholder: 'e.g. "Wants done before July 4th BBQ"',
        answered: false,
        value: "",
      },
    ],
  },
  {
    id: "scope",
    label: "Scope Boundaries",
    questions: [
      {
        id: "sc1",
        label: "What's included",
        type: "textarea",
        placeholder: 'e.g. "All materials, labor, equipment, basic cleanup"',
        answered: false,
        value: "",
      },
      {
        id: "sc2",
        label: "What's NOT included",
        type: "textarea",
        placeholder: 'e.g. "Permits, tree removal, electrical, fence repair"',
        answered: false,
        value: "",
      },
      {
        id: "sc3",
        label: "Allowances vs. fixed costs",
        type: "textarea",
        placeholder: 'e.g. "Shrubs allowance of $50 each; patio price fixed"',
        answered: false,
        value: "",
      },
      {
        id: "sc4",
        label: "Known risks or unknowns",
        type: "textarea",
        placeholder: 'e.g. "Possible rock during excavation; utility locate required"',
        answered: false,
        value: "",
      },
    ],
  },
  {
    id: "timeline",
    label: "Timeline",
    questions: [
      {
        id: "tl1",
        label: "Estimated start date",
        type: "date",
        answered: false,
        value: "",
      },
      {
        id: "tl2",
        label: "Total duration",
        type: "text",
        placeholder: 'e.g. "2–3 weeks"',
        answered: false,
        value: "",
      },
      {
        id: "tl3",
        label: "Project phases",
        type: "phases",
        answered: false,
        value: [] as PhaseItem[],
      },
      {
        id: "tl4",
        label: "On-site working hours / days",
        type: "text",
        placeholder: 'e.g. "Mon–Fri 7am–4pm"',
        answered: false,
        value: "",
      },
      {
        id: "tl5",
        label: "Weather or lead-time dependencies",
        type: "textarea",
        placeholder: 'e.g. "Pavers 1-week lead time; rain delays possible"',
        answered: false,
        value: "",
      },
    ],
  },
]

function isPhaseArray(v: unknown): v is PhaseItem[] {
  return Array.isArray(v) && (v.length === 0 || typeof (v[0] as PhaseItem).name !== "undefined")
}

function isAnswered(q: Question): boolean {
  if (isPhaseArray(q.value)) return q.value.length > 0
  if (Array.isArray(q.value)) return q.value.length > 0
  return (q.value as string).trim().length > 0
}

function previewValue(q: Question): string {
  if (isPhaseArray(q.value)) return `${q.value.length} phase${q.value.length !== 1 ? "s" : ""} planned`
  if (Array.isArray(q.value)) return (q.value as string[]).join(", ")
  return q.value as string
}

function hydrateFromBrief(saved: Record<string, any> | null | undefined): Section[] {
  if (!saved) return INITIAL_SECTIONS
  return INITIAL_SECTIONS.map((section) => ({
    ...section,
    questions: section.questions.map((q) => {
      const raw = saved[section.id]?.[q.id]
      if (raw === undefined || raw === null) return q
      return { ...q, value: raw, answered: isAnswered({ ...q, value: raw }) }
    }),
  }))
}

function sectionsToPayload(sections: Section[]): Record<string, any> {
  return Object.fromEntries(
    sections.map((s) => [
      s.id,
      Object.fromEntries(s.questions.map((q) => [q.id, q.value])),
    ])
  )
}

interface BriefPanelProps {
  projectId: number
  initialBrief?: Record<string, any> | null
  onClose?: () => void
}

export function BriefPanel({ projectId, initialBrief, onClose }: BriefPanelProps) {
  const [sections, setSections] = useState<Section[]>(() => hydrateFromBrief(initialBrief))
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["project"]))
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalQ = sections.reduce((acc, s) => acc + s.questions.length, 0)
  const answeredQ = sections.reduce(
    (acc, s) => acc + s.questions.filter((q) => isAnswered(q)).length,
    0
  )
  const progress = Math.round((answeredQ / totalQ) * 100)

  const persistBrief = useCallback((updatedSections: Section[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveState("saving")
    debounceRef.current = setTimeout(async () => {
      try {
        await api.updateProject(projectId, { brief: sectionsToPayload(updatedSections) })
        setSaveState("saved")
        setTimeout(() => setSaveState("idle"), 2000)
      } catch {
        setSaveState("idle")
      }
    }, 5000)
  }, [projectId])

  function goToNext(currentQuestionId: string) {
    const flat = sections.flatMap((s) => s.questions.map((q) => ({ sectionId: s.id, q })))
    const idx = flat.findIndex(({ q }) => q.id === currentQuestionId)
    const next = flat.slice(idx + 1).find(({ q }) => q.type !== "phases")
    if (!next) return
    setOpenSections((prev) => { const n = new Set(prev); n.add(next.sectionId); return n })
    setActiveQuestion(next.q.id)
  }

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      const wasOpen = next.has(id)
      wasOpen ? next.delete(id) : next.add(id)
      if (wasOpen) persistBrief(sections)
      return next
    })
  }

  function updateQuestion(sectionId: string, questionId: string, value: string | string[] | PhaseItem[]) {
    setSections((prev) => {
      const next = prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, value, answered: isAnswered({ ...q, value }) } : q
              ),
            }
          : s
      )
      persistBrief(next)
      return next
    })
  }

  function toggleCheckbox(sectionId: string, questionId: string, option: string) {
    const section = sections.find((s) => s.id === sectionId)
    const question = section?.questions.find((q) => q.id === questionId)
    if (!question || !Array.isArray(question.value)) return
    const current = question.value as string[]
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option]
    updateQuestion(sectionId, questionId, next)
  }

  return (
    <div className={`flex flex-col bg-background ${onClose ? "h-full border-l border-border" : "rounded-xl border border-border shadow-sm"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b border-border bg-background z-10 ${onClose ? "sticky top-0" : "rounded-t-xl"}`}>
        <div>
          <span className="text-sm font-semibold text-foreground">Project Brief</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {answeredQ} of {totalQ} answered
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveState === "saving" && (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          )}
          {saveState === "saved" && (
            <span className="text-[11px] text-emerald-500 font-medium">Saved</span>
          )}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1565C0] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">{progress}%</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => {
          const isOpen = openSections.has(section.id)
          const answered = section.questions.filter((q) => isAnswered(q)).length
          const total = section.questions.length
          const complete = answered === total

          return (
            <div key={section.id} className="border-b border-border last:border-b-0">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                      complete
                        ? "bg-emerald-500"
                        : answered > 0
                        ? "bg-[#1565C0]/15 border-2 border-[#1565C0]"
                        : "border-2 border-border"
                    )}
                  >
                    {complete && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <span className="text-[13px] font-medium text-foreground">{section.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {answered}/{total}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="pb-2">
                  {section.questions.map((q) => (
                    <QuestionRow
                      key={q.id}
                      question={q}
                      isActive={activeQuestion === q.id}
                      onFocus={() => setActiveQuestion(activeQuestion === q.id ? null : q.id)}
                      onChange={(val) => updateQuestion(section.id, q.id, val as string)}
                      onToggleCheck={(opt) => toggleCheckbox(section.id, q.id, opt)}
                      onPhasesChange={(phases) => updateQuestion(section.id, q.id, phases)}
                      onEnter={() => goToNext(q.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

      </div>
    </div>
  )
}

interface QuestionRowProps {
  question: Question
  isActive: boolean
  onFocus: () => void
  onChange: (val: string) => void
  onToggleCheck: (option: string) => void
  onPhasesChange: (phases: PhaseItem[]) => void
  onEnter: () => void
}

function PhaseBuilder({ phases, onChange }: { phases: PhaseItem[]; onChange: (phases: PhaseItem[]) => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function removePhase(id: string) {
    onChange(phases.filter((p) => p.id !== id))
  }

  function updatePhase(id: string, field: keyof PhaseItem, value: string | boolean) {
    onChange(phases.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const inputCls = "w-full text-[12px] bg-background border border-border rounded-md px-2 py-1.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[#1565C0]/40 focus:border-[#1565C0]/60"

  return (
    <div className="flex flex-col gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
      {phases.map((phase, i) => {
        const isCollapsed = collapsed.has(phase.id)
        const displayName = phase.name.trim() || `Untitled phase`
        return (
          <div key={phase.id} className="rounded-lg border border-border bg-background overflow-hidden">
            {/* Phase header */}
            <div
              className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-secondary/40 transition-colors"
              onClick={() => toggleCollapsed(phase.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-shrink-0">
                  Phase {i + 1}
                </span>
                {phase.name.trim() && (
                  <span className="text-[12px] text-foreground truncate">— {displayName}</span>
                )}
                {phase.duration.trim() && (
                  <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-auto mr-6">{phase.duration}</span>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePhase(phase.id) }}
                className="text-muted-foreground/40 hover:text-rose-500 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Phase fields */}
            {!isCollapsed && (
              <div className="px-3 pb-3 flex flex-col gap-2 border-t border-border">
                <div className="pt-2">
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => updatePhase(phase.id, "name", e.target.value)}
                    placeholder="Phase name (e.g. Grading & Excavation)"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={phase.duration}
                    onChange={(e) => updatePhase(phase.id, "duration", e.target.value)}
                    placeholder="Duration (e.g. 2 days)"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={phase.crew}
                    onChange={(e) => updatePhase(phase.id, "crew", e.target.value)}
                    placeholder="Crew (e.g. 3-man)"
                    className={inputCls}
                  />
                </div>

                <textarea
                  value={phase.description}
                  onChange={(e) => updatePhase(phase.id, "description", e.target.value)}
                  placeholder="What happens in this phase…"
                  rows={2}
                  className={`${inputCls} resize-none leading-relaxed`}
                />

                <input
                  type="text"
                  value={phase.dependencies}
                  onChange={(e) => updatePhase(phase.id, "dependencies", e.target.value)}
                  placeholder="Depends on (e.g. material delivery, permit)"
                  className={inputCls}
                />

                <label
                  className="flex items-center gap-2 cursor-pointer mt-0.5"
                  onClick={(e) => { e.stopPropagation(); updatePhase(phase.id, "weatherSensitive", !phase.weatherSensitive) }}
                >
                  <span className={cn("w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors", phase.weatherSensitive ? "bg-[#1565C0] border-[#1565C0]" : "border-border")}>
                    {phase.weatherSensitive && <Check className="w-2 h-2 text-white" />}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground select-none">Weather sensitive</span>
                </label>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ComboboxInput({ question, onChange, onEnter }: { question: Question; onChange: (val: string) => void; onEnter: () => void }) {
  const [inputValue, setInputValue] = useState(question.value as string)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = (question.options ?? []).filter((opt) =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleSelect = (opt: string) => {
    setInputValue(opt)
    onChange(opt)
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        autoFocus
        type="text"
        value={inputValue}
        placeholder="Type or select a category…"
        onChange={(e) => {
          setInputValue(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            setOpen(false)
            onEnter()
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="w-full text-[12.5px] bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#1565C0]/40 focus:border-[#1565C0]/60"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md max-h-48 overflow-y-auto">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt)}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[12px] hover:bg-secondary transition-colors",
                inputValue === opt ? "text-[#1565C0] font-medium" : "text-foreground"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionRow({ question, isActive, onFocus, onChange, onToggleCheck, onPhasesChange, onEnter }: QuestionRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onEnter()
    }
  }
  const answered = isAnswered(question)

  return (
    <div
      className={cn(
        "px-5 py-2.5 transition-colors cursor-pointer",
        isActive ? "bg-secondary/60" : "hover:bg-secondary/30"
      )}
      onClick={onFocus}
    >
      <div className="flex items-start gap-2 mb-1">
        <span className="mt-0.5 flex-shrink-0">
          {answered ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />
          )}
        </span>
        <span
          className={cn(
            "text-[12.5px] leading-relaxed flex-1",
            answered ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {question.label}
        </span>
        {question.type === "phases" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              const current = isPhaseArray(question.value) ? question.value : []
              onPhasesChange([
                ...current,
                { id: crypto.randomUUID(), name: "", duration: "", description: "", crew: "", dependencies: "", weatherSensitive: false },
              ])
            }}
            className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-[#1565C0] hover:text-[#1565C0] hover:bg-[#1565C0]/8 transition-colors flex-shrink-0 mt-0.5"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {!isActive && answered && (
        <p className="ml-5 text-[11.5px] text-muted-foreground line-clamp-1 italic">
          {previewValue(question)}
        </p>
      )}

      {question.type === "phases" && (
        <div className="mt-1.5 px-1" onClick={(e) => e.stopPropagation()}>
          <PhaseBuilder
            phases={isPhaseArray(question.value) ? question.value : []}
            onChange={onPhasesChange}
          />
        </div>
      )}

      {isActive && question.type !== "phases" && (
        <div className="ml-5 mt-1.5" onClick={(e) => e.stopPropagation()}>
          {question.type === "combobox" && (
            <ComboboxInput question={question} onChange={onChange} onEnter={onEnter} />
          )}

          {question.type === "select" && question.options && (
            <select
              autoFocus
              value={question.value as string}
              onChange={(e) => { onChange(e.target.value); onEnter() }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnter() } }}
              className="w-full text-[12.5px] bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-[#1565C0]/40 focus:border-[#1565C0]/60 appearance-none"
            >
              <option value="" disabled>Select an option…</option>
              {question.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {question.type === "multicheck" && question.options && (
            <div className="flex flex-col gap-2 mt-0.5">
              {question.options.map((opt) => {
                const checked = Array.isArray(question.value) && question.value.includes(opt)
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={(e) => { e.stopPropagation(); onToggleCheck(opt) }}
                  >
                    <span className={cn("w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors", checked ? "bg-[#1565C0] border-[#1565C0]" : "border-border group-hover:border-[#1565C0]/50")}>
                      {checked && <Check className="w-2 h-2 text-white" />}
                    </span>
                    <span className="text-[12px] text-foreground select-none">{opt}</span>
                  </label>
                )
              })}
            </div>
          )}

          {question.type === "textarea" && (
            <textarea
              autoFocus
              value={question.value as string}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEnter() } }}
              placeholder={question.placeholder ?? "Type your answer… (Shift+Enter for new line)"}
              rows={3}
              className="w-full text-[12.5px] resize-none bg-background border border-border rounded-md px-2.5 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#1565C0]/40 focus:border-[#1565C0]/60 leading-relaxed"
            />
          )}

          {question.type === "text" && (
            <input
              autoFocus
              type="text"
              value={question.value as string}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={question.placeholder ?? "Type your answer…"}
              className="w-full text-[12.5px] bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#1565C0]/40 focus:border-[#1565C0]/60"
            />
          )}

          {question.type === "number" && (
            <div className="flex items-center gap-2">
              {question.unit === "$" && <span className="text-[12.5px] text-muted-foreground">$</span>}
              <input
                autoFocus
                type="number"
                value={question.value as string}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={question.placeholder ?? "0"}
                className="w-full text-[12.5px] bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#1565C0]/40 focus:border-[#1565C0]/60"
              />
              {question.unit && question.unit !== "$" && (
                <span className="text-[12.5px] text-muted-foreground flex-shrink-0">{question.unit}</span>
              )}
            </div>
          )}

          {question.type === "date" && (
            <input
              autoFocus
              type="date"
              value={question.value as string}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-[12.5px] bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-[#1565C0]/40 focus:border-[#1565C0]/60"
            />
          )}
        </div>
      )}
    </div>
  )
}
