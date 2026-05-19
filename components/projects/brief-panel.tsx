"use client"

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react"
import { ChevronDown, ChevronRight, Check, Circle, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import {
  type PhaseItem,
  PROJECT_BRIEF_SECTIONS,
  normalizeProjectBrief,
} from "@/lib/project-brief"

type BriefValue = string | string[] | PhaseItem[]

interface Question {
  id: string
  label: string
  type: "text" | "textarea" | "select" | "multicheck" | "number" | "combobox" | "date" | "phases"
  placeholder?: string
  options?: string[]
  unit?: string
  answered: boolean
  value: BriefValue
}

interface Section {
  id: string
  label: string
  questions: Question[]
}

function isPhaseArray(v: unknown): v is PhaseItem[] {
  return Array.isArray(v) && (v.length === 0 || typeof (v[0] as PhaseItem).name !== "undefined")
}

function isAnswered(q: { value: BriefValue }): boolean {
  if (isPhaseArray(q.value)) return q.value.length > 0
  if (Array.isArray(q.value)) return q.value.length > 0
  return q.value.trim().length > 0
}

function previewValue(q: Question): string {
  if (isPhaseArray(q.value)) return `${q.value.length} phase${q.value.length !== 1 ? "s" : ""} planned`
  if (Array.isArray(q.value)) return q.value.join(", ")
  return q.value
}

function hydrateFromBrief(saved: Record<string, any> | null | undefined): Section[] {
  const normalized = normalizeProjectBrief(saved)
  return PROJECT_BRIEF_SECTIONS.map((section) => ({
    ...section,
    questions: section.questions.map((question) => {
      const rawValue = normalized?.[section.id]?.[question.id]
      const value: BriefValue = question.type === "phases"
        ? (Array.isArray(rawValue) ? rawValue : [])
        : typeof rawValue === "string"
          ? rawValue
          : ""
      return {
        ...question,
        value,
        answered: isAnswered({ value }),
      }
    }),
  }))
}

function sectionsToPayload(sections: Section[]): Record<string, any> {
  return Object.fromEntries(
    sections.map((section) => [
      section.id,
      Object.fromEntries(section.questions.map((question) => [question.id, question.value])),
    ])
  )
}

interface BriefPanelProps {
  projectId: number
  initialBrief?: Record<string, any> | null
  initiallyExpanded?: boolean
  onBriefUpdated?: (brief: Record<string, any> | null) => void
}

export function BriefPanel({
  projectId,
  initialBrief,
  initiallyExpanded = false,
  onBriefUpdated,
}: BriefPanelProps) {
  const [sections, setSections] = useState<Section[]>(() => hydrateFromBrief(initialBrief))
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["client-context"]))
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSections(hydrateFromBrief(initialBrief))
  }, [initialBrief])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const totalQ = sections.reduce((acc, section) => acc + section.questions.length, 0)
  const answeredQ = sections.reduce(
    (acc, section) => acc + section.questions.filter((question) => isAnswered(question)).length,
    0
  )
  const progress = totalQ ? Math.round((answeredQ / totalQ) * 100) : 0

  const persistBrief = useCallback((updatedSections: Section[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveState("saving")
    debounceRef.current = setTimeout(async () => {
      const payload = sectionsToPayload(updatedSections)
      try {
        await api.updateProject(projectId, { brief: payload })
        onBriefUpdated?.(payload)
        setSaveState("saved")
        setTimeout(() => setSaveState("idle"), 2000)
      } catch {
        setSaveState("idle")
      }
    }, 800)
  }, [onBriefUpdated, projectId])

  function goToNext(currentQuestionId: string) {
    const flat = sections.flatMap((section) => section.questions.map((question) => ({ sectionId: section.id, question })))
    const idx = flat.findIndex(({ question }) => question.id === currentQuestionId)
    const next = flat.slice(idx + 1).find(({ question }) => question.type !== "phases")
    if (!next) return
    setOpenSections((prev) => {
      const copy = new Set(prev)
      copy.add(next.sectionId)
      return copy
    })
    setActiveQuestion(next.question.id)
  }

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function updateQuestion(sectionId: string, questionId: string, value: BriefValue) {
    setSections((prev) => {
      const next = prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((question) =>
                question.id === questionId
                  ? { ...question, value, answered: isAnswered({ value }) }
                  : question
              ),
            }
          : section
      )
      persistBrief(next)
      return next
    })
  }

  function toggleCheckbox(sectionId: string, questionId: string, option: string) {
    const section = sections.find((value) => value.id === sectionId)
    const question = section?.questions.find((value) => value.id === questionId)
    if (!question || !Array.isArray(question.value)) return
    const current = question.value as string[]
    const next = current.includes(option)
      ? current.filter((value) => value !== option)
      : [...current, option]
    updateQuestion(sectionId, questionId, next)
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-900">Project Brief</span>
              {saveState === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
              {saveState === "saved" && <span className="text-[11px] font-medium text-emerald-500">Saved</span>}
            </div>
            <p className="text-sm text-slate-500">
              {answeredQ} of {totalQ} answered
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#1565C0] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-500 tabular-nums">{progress}%</span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              {isExpanded ? "Hide long brief" : "Open long brief"}
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="divide-y divide-slate-200">
          {sections.map((section) => {
            const isOpen = openSections.has(section.id)
            const answered = section.questions.filter((question) => isAnswered(question)).length
            const total = section.questions.length
            const complete = answered === total

            return (
              <div key={section.id}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50 sm:px-6"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors",
                        complete
                          ? "bg-emerald-500"
                          : answered > 0
                            ? "border-2 border-[#1565C0] bg-[#1565C0]/10"
                            : "border-2 border-slate-300 bg-white"
                      )}
                    >
                      {complete && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{section.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 tabular-nums">{answered}/{total}</span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="pb-3">
                    {section.questions.map((question) => (
                      <QuestionRow
                        key={question.id}
                        question={question}
                        isActive={activeQuestion === question.id}
                        onFocus={() => setActiveQuestion(activeQuestion === question.id ? null : question.id)}
                        onChange={(value) => updateQuestion(section.id, question.id, value)}
                        onToggleCheck={(option) => toggleCheckbox(section.id, question.id, option)}
                        onPhasesChange={(phases) => updateQuestion(section.id, question.id, phases)}
                        onEnter={() => goToNext(question.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
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
    onChange(phases.filter((phase) => phase.id !== id))
  }

  function updatePhase(id: string, field: keyof PhaseItem, value: string | boolean) {
    onChange(phases.map((phase) => (phase.id === id ? { ...phase, [field]: value } : phase)))
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/70"

  return (
    <div className="mt-2 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      {phases.map((phase, index) => {
        const isCollapsed = collapsed.has(phase.id)
        return (
          <div key={phase.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
            <div
              className="flex cursor-pointer items-center justify-between px-3 py-3 transition hover:bg-slate-100/80"
              onClick={() => toggleCollapsed(phase.id)}
            >
              <div className="flex min-w-0 items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Phase {index + 1}
                </span>
                {phase.name && <span className="truncate text-sm text-slate-700">{phase.name}</span>}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removePhase(phase.id)
                }}
                className="text-xs font-medium text-slate-400 transition hover:text-rose-500"
              >
                Remove
              </button>
            </div>

            {!isCollapsed && (
              <div className="space-y-2 border-t border-slate-200 bg-white px-3 py-3">
                <input
                  type="text"
                  value={phase.name}
                  onChange={(e) => updatePhase(phase.id, "name", e.target.value)}
                  placeholder="Phase name"
                  className={inputCls}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={phase.duration}
                    onChange={(e) => updatePhase(phase.id, "duration", e.target.value)}
                    placeholder="Duration"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={phase.crew}
                    onChange={(e) => updatePhase(phase.id, "crew", e.target.value)}
                    placeholder="Crew"
                    className={inputCls}
                  />
                </div>
                <textarea
                  value={phase.description}
                  onChange={(e) => updatePhase(phase.id, "description", e.target.value)}
                  placeholder="What happens in this phase?"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
                <input
                  type="text"
                  value={phase.dependencies}
                  onChange={(e) => updatePhase(phase.id, "dependencies", e.target.value)}
                  placeholder="Dependencies"
                  className={inputCls}
                />
                <label
                  className="flex items-center gap-2 text-sm text-slate-500"
                  onClick={(e) => {
                    e.stopPropagation()
                    updatePhase(phase.id, "weatherSensitive", !phase.weatherSensitive)
                  }}
                >
                  <span className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border-2 transition-colors",
                    phase.weatherSensitive ? "border-[#1565C0] bg-[#1565C0]" : "border-slate-300 bg-white"
                  )}>
                    {phase.weatherSensitive && <Check className="h-2.5 w-2.5 text-white" />}
                  </span>
                  Weather sensitive
                </label>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function QuestionRow({ question, isActive, onFocus, onChange, onToggleCheck, onPhasesChange, onEnter }: QuestionRowProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onEnter()
    }
  }
  const answered = isAnswered(question)

  return (
    <div
      className={cn(
        "cursor-pointer px-5 py-3 transition-colors sm:px-6",
        isActive ? "bg-slate-50" : "hover:bg-slate-50/70"
      )}
      onClick={onFocus}
    >
      <div className="mb-1 flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0">
          {answered ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Circle className="h-4 w-4 text-slate-300" />
          )}
        </span>
        <span className={cn("flex-1 text-sm leading-6", answered ? "text-slate-900" : "text-slate-500")}>
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
            className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-[#1565C0] hover:bg-[#1565C0]/5 hover:text-[#1565C0]"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!isActive && answered && (
        <p className="ml-6 line-clamp-2 text-sm italic text-slate-400">
          {previewValue(question)}
        </p>
      )}

      {question.type === "phases" && (
        <div className="ml-6" onClick={(e) => e.stopPropagation()}>
          <PhaseBuilder
            phases={isPhaseArray(question.value) ? question.value : []}
            onChange={onPhasesChange}
          />
        </div>
      )}

      {isActive && question.type !== "phases" && (
        <div className="ml-6 mt-2" onClick={(e) => e.stopPropagation()}>
          {question.type === "select" && question.options && (
            <select
              autoFocus
              value={question.value as string}
              onChange={(e) => {
                onChange(e.target.value)
                onEnter()
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  onEnter()
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/70"
            >
              <option value="" disabled>Select an option...</option>
              {question.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {question.type === "multicheck" && question.options && (
            <div className="mt-0.5 flex flex-col gap-2">
              {question.options.map((opt) => {
                const checked = Array.isArray(question.value) && (question.value as string[]).includes(opt)
                return (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleCheck(opt)
                    }}
                  >
                    <span className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border-2 transition-colors",
                      checked ? "border-[#1565C0] bg-[#1565C0]" : "border-slate-300 bg-white"
                    )}>
                      {checked && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    <span className="text-sm text-slate-700">{opt}</span>
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onEnter()
                }
              }}
              placeholder={question.placeholder ?? "Type your answer..."}
              rows={4}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/70"
            />
          )}

          {question.type === "text" && (
            <input
              autoFocus
              type="text"
              value={question.value as string}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={question.placeholder ?? "Type your answer..."}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/70"
            />
          )}

          {question.type === "number" && (
            <div className="flex items-center gap-2">
              {question.unit === "$" && <span className="text-sm text-slate-400">$</span>}
              <input
                autoFocus
                type="number"
                value={question.value as string}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={question.placeholder ?? "0"}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/70"
              />
              {question.unit && question.unit !== "$" && (
                <span className="text-sm text-slate-400">{question.unit}</span>
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/70"
            />
          )}
        </div>
      )}
    </div>
  )
}
