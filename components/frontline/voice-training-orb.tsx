"use client"

type OrbMode = "idle" | "connecting" | "listening" | "speaking" | "saving"

type Props = {
  mode: OrbMode
  /** 0–1 mic or playback energy for subtle scale pulse */
  energy?: number
}

const MODE_LABEL: Record<OrbMode, string> = {
  idle: "Ready",
  connecting: "Connecting…",
  listening: "Listening",
  speaking: "Speaking",
  saving: "Saving…",
}

export function VoiceTrainingOrb({ mode, energy = 0 }: Props) {
  const pulse = 1 + Math.min(1, energy) * 0.22
  const isActive = mode === "listening" || mode === "speaking"

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div
        className="relative flex h-36 w-36 items-center justify-center"
        style={{ transform: `scale(${pulse})`, transition: "transform 80ms linear" }}
      >
        <span
          className={`absolute inset-0 rounded-full blur-2xl ${
            mode === "speaking"
              ? "bg-sky-400/35 animate-[orb-glow_2.4s_ease-in-out_infinite]"
              : mode === "listening"
                ? "bg-violet-400/30 animate-[orb-glow_1.8s_ease-in-out_infinite]"
                : mode === "connecting" || mode === "saving"
                  ? "bg-slate-400/25 animate-[orb-glow_1.2s_ease-in-out_infinite]"
                  : "bg-slate-300/20 animate-[orb-glow_3s_ease-in-out_infinite]"
          }`}
        />
        <span
          className={`absolute h-28 w-28 rounded-full border ${
            isActive ? "border-white/40" : "border-white/25"
          } bg-gradient-to-br from-white/10 to-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] backdrop-blur-sm ${
            isActive ? "animate-[orb-breathe_2s_ease-in-out_infinite]" : "animate-[orb-breathe_3.5s_ease-in-out_infinite]"
          }`}
        />
        <span
          className={`relative h-16 w-16 rounded-full ${
            mode === "speaking"
              ? "bg-gradient-to-br from-sky-300 to-sky-600 shadow-[0_0_32px_rgba(56,189,248,0.45)]"
              : mode === "listening"
                ? "bg-gradient-to-br from-violet-300 to-violet-700 shadow-[0_0_28px_rgba(139,92,246,0.4)]"
                : "bg-gradient-to-br from-slate-200 to-slate-500 shadow-[0_0_20px_rgba(148,163,184,0.25)]"
          }`}
        />
      </div>
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {MODE_LABEL[mode]}
      </p>
    </div>
  )
}
