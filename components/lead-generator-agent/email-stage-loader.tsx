"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

export type LoaderTone = "discovery" | "drafting" | "sending"

interface EmailStageLoaderProps {
  title: string
  steps: string[]
  /** When provided, controls the active step externally (e.g. tied to backend progress). */
  stepIndex?: number
  /** Optional "X of Y" overlay. */
  progress?: { current: number; total: number; label?: string }
  tone?: LoaderTone
  className?: string
}

const TONE_ACCENT: Record<LoaderTone, { dot: string; chip: string; flap: string }> = {
  discovery: {
    dot: "bg-sky-600",
    chip: "border-sky-200 bg-sky-50 text-sky-700",
    flap: "border-sky-300",
  },
  drafting: {
    dot: "bg-violet-600",
    chip: "border-violet-200 bg-violet-50 text-violet-700",
    flap: "border-violet-300",
  },
  sending: {
    dot: "bg-emerald-600",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    flap: "border-emerald-300",
  },
}

/**
 * Stacked email-card 3D loader. Three rounded rectangles fan with subtle
 * perspective rotation, cycling sub-step text below. Designed to drop into
 * any card body — no internal Card wrapper.
 */
export function EmailStageLoader({
  title,
  steps,
  stepIndex,
  progress,
  tone = "drafting",
  className,
}: EmailStageLoaderProps) {
  const [autoStep, setAutoStep] = useState(0)
  useEffect(() => {
    if (stepIndex !== undefined) return
    if (steps.length <= 1) return
    const id = setInterval(() => setAutoStep((s) => (s + 1) % steps.length), 2200)
    return () => clearInterval(id)
  }, [steps.length, stepIndex])

  const currentStep = stepIndex !== undefined ? Math.min(Math.max(stepIndex, 0), steps.length - 1) : autoStep
  const accent = TONE_ACCENT[tone]

  return (
    <div className={cn("flex flex-col items-center gap-6 py-4", className)}>
      <div className="relative h-28 w-44 [perspective:1000px]">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn(
              "absolute inset-0 rounded-2xl border bg-white shadow-sm",
              accent.flap,
              i === 0 ? "z-30" : i === 1 ? "z-20" : "z-10"
            )}
            initial={{ opacity: 0, y: 30, rotateX: -30, rotateY: 14 }}
            animate={{
              opacity: [0, 0.95 - i * 0.18, 0.4],
              y: [30, -i * 8, -i * 8 - 6],
              rotateX: [-30, -10 + i * 6, -12 + i * 6],
              rotateY: [14, 4 - i * 2, 8 - i * 2],
            }}
            transition={{
              duration: 2.6,
              delay: i * 0.35,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            <EnvelopeFace tone={tone} />
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-slate-500"
        >
          {steps[currentStep] ?? ""}
          {progress ? (
            <span className="ml-2 text-slate-400">
              · {progress.current} of {progress.total}
              {progress.label ? ` ${progress.label}` : ""}
            </span>
          ) : null}
        </motion.div>
        <DotProgress active={currentStep} total={Math.max(steps.length, 1)} accentClass={accent.dot} />
      </div>
    </div>
  )
}

function EnvelopeFace({ tone }: { tone: LoaderTone }) {
  const accent = TONE_ACCENT[tone]
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <div className={cn("absolute inset-x-0 top-0 h-1/2 border-b", accent.flap)}>
        <div
          className={cn(
            "absolute left-1/2 top-0 h-full w-px -translate-x-1/2 rotate-12 origin-top",
            accent.flap
          )}
        />
        <div
          className={cn(
            "absolute left-1/2 top-0 h-full w-px -translate-x-1/2 -rotate-12 origin-top",
            accent.flap
          )}
        />
      </div>
      <div className="absolute inset-x-4 bottom-3 flex flex-col gap-1.5">
        <div className="h-px bg-slate-200" />
        <div className="h-px w-3/4 bg-slate-200" />
        <div className="h-px w-1/2 bg-slate-200" />
      </div>
    </div>
  )
}

function DotProgress({ active, total, accentClass }: { active: number; total: number; accentClass: string }) {
  return (
    <div className="flex gap-1.5 pt-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            i === active ? accentClass : "bg-slate-300"
          )}
        />
      ))}
    </div>
  )
}
