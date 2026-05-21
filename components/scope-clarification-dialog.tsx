"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ScopeClarifiedScope, ScopeQuestion, ScopeQuestionAnswer } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

interface Props {
  open: boolean
  projectId: number
  trigger: string
  onComplete: (scope: ScopeClarifiedScope) => void
  onSkip: () => void
  onOpenChange: (open: boolean) => void
}

// Letters for multi-select options (A–D)
const OPTION_LABELS = ["A", "B", "C", "D"]

export function ScopeClarificationDialog({ open, projectId, trigger, onComplete, onSkip, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [questions, setQuestions] = useState<ScopeQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, ScopeQuestionAnswer>>({})
  const [error, setError] = useState<string | null>(null)

  // Load questions when dialog opens
  useEffect(() => {
    if (!open || !projectId) return

    setLoading(true)
    setError(null)

    api.getScopeQuestions(projectId)
      .then((res) => {
        // Fresh finalized scope — skip the dialog entirely
        if (res.existing_scope && !res.is_stale) {
          onComplete(res.existing_scope)
          return
        }
        if (res.questions?.length) {
          setQuestions(res.questions)
          setAnswers({})
        } else {
          // No questions generated — skip
          onSkip()
        }
      })
      .catch(() => setError("Failed to load questions. You can skip and generate anyway."))
      .finally(() => setLoading(false))
  }, [open, projectId])

  const toggleOption = useCallback((questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const existing = prev[questionId] ?? { question_id: questionId, selected_options: [] }
      const selected = existing.selected_options ?? []
      const next = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId]
      return { ...prev, [questionId]: { ...existing, selected_options: next } }
    })
  }, [])

  const setFreeText = useCallback((questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { question_id: questionId, free_text: text },
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setError(null)
    try {
      const answerList: ScopeQuestionAnswer[] = questions.map((q) => ({
        question_id: q.id,
        ...(answers[q.id] ?? { question_id: q.id }),
      }))
      const scope = await api.submitScopeAnswers(projectId, {
        answers: answerList,
        questions,
        trigger,
      })
      onComplete(scope)
    } catch {
      setError("Failed to process answers. You can skip and generate anyway.")
    } finally {
      setSubmitting(false)
    }
  }, [projectId, questions, answers, trigger, onComplete])

  const handleSkip = useCallback(async () => {
    try {
      await api.skipScopeSession(projectId)
    } catch {
      // Skip failure is non-critical
    }
    onSkip()
  }, [projectId, onSkip])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">Clarify Scope</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Answer a few questions so the AI can generate a more accurate result.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Analyzing project context…</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!loading && questions.map((q, qi) => (
            <div key={q.id} className="space-y-3">
              <p className="text-sm font-medium leading-snug">
                {qi + 1}. {q.text}
                {q.type === "multi_select" && (
                  <span className="text-muted-foreground font-normal"> (select all that apply)</span>
                )}
              </p>

              {q.type === "multi_select" && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const selected = answers[q.id]?.selected_options?.includes(opt.id) ?? false
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleOption(q.id, opt.id)}
                        className={`w-full flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                          selected
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-card hover:bg-muted/50"
                        }`}
                      >
                        <span className={`shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          {OPTION_LABELS[oi] ?? oi + 1}
                        </span>
                        <span>{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {q.type === "free_text" && (
                <Textarea
                  placeholder="Type your answer…"
                  rows={3}
                  value={answers[q.id]?.free_text ?? ""}
                  onChange={(e) => setFreeText(q.id, e.target.value)}
                  className="resize-none text-sm"
                />
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={submitting}
          >
            Skip
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || submitting || questions.length === 0}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit &amp; Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
