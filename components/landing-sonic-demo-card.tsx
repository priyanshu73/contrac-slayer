"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  Loader2,
  Mic2,
  PhoneCall,
  ShieldCheck,
  Square,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildSignupUrl, useReferral } from "@/contexts/ReferralContext"
import { api } from "@/lib/api"
import {
  downsampleBuffer,
  float32ToInt16,
  FRONTLINE_VOICE_CHUNK_SAMPLES,
  FRONTLINE_VOICE_INPUT_RATE,
  FRONTLINE_VOICE_MIC_FLUSH_MS,
  FRONTLINE_VOICE_OUTPUT_RATE,
  pcm16ToBase64,
  PcmStreamPlayer,
  resolveCaptureBufferSize,
} from "@/lib/frontline-voice-audio"
import { cn } from "@/lib/utils"

const VIEWED_SONIC_DEMO_KEY = "viewed_sonic_demo"

type DemoState = "idle" | "connecting" | "recording" | "ending" | "failed"

function rmsLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] ?? 0
    sum += s * s
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 8)
}

function FloatingVoiceMesh({ active }: { active: boolean }) {
  const nodes = [
    ["14%", "28%"],
    ["29%", "62%"],
    ["46%", "22%"],
    ["58%", "68%"],
    ["73%", "34%"],
    ["84%", "56%"],
  ]
  const links = [
    ["18%", "36%", "28%", "-26deg"],
    ["38%", "42%", "32%", "18deg"],
    ["54%", "31%", "30%", "-16deg"],
    ["62%", "60%", "24%", "22deg"],
    ["25%", "70%", "38%", "-8deg"],
  ]

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px]" aria-hidden="true">
      <div
        className="absolute left-1/2 top-1/2 h-56 w-[360px] rounded-[34px] border border-sky-200/35 opacity-80 shadow-[0_24px_70px_rgba(14,165,233,0.12)] transition-transform duration-500"
        style={{
          transform: `translate(-50%, ${active ? "-54%" : "-50%"}) perspective(760px) rotateX(58deg) rotateZ(-18deg)`,
          backgroundImage:
            "linear-gradient(rgba(14,165,233,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.14) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-48 w-80 -translate-x-1/2 -translate-y-1/2"
        style={{ transform: "translate(-50%, -50%) perspective(700px) rotateX(50deg)" }}
      >
        {links.map(([left, top, width, rotate], idx) => (
          <span
            key={`${left}-${top}-${idx}`}
            className="absolute h-px origin-left bg-sky-300/45"
            style={{ left, top, width, transform: `rotate(${rotate})` }}
          />
        ))}
        {nodes.map(([left, top], idx) => (
          <span
            key={`${left}-${top}-${idx}`}
            className={cn(
              "absolute h-2 w-2 rounded-full border border-sky-400/45 bg-white shadow-[0_0_14px_rgba(14,165,233,0.28)]",
              active && idx % 2 === 0 ? "motion-safe:animate-pulse" : "",
            )}
            style={{ left, top }}
          />
        ))}
      </div>
    </div>
  )
}

type DemoOrbMode = "idle" | "connecting" | "listening" | "speaking" | "saving"

function DemoLiquidOrb({ mode, energy = 0 }: { mode: DemoOrbMode; energy?: number }) {
  const active = mode === "listening" || mode === "speaking"
  const pulse = 1 + Math.min(1, energy) * 0.12
  const status =
    mode === "connecting"
      ? "Connecting"
      : mode === "saving"
        ? "Ending"
        : mode === "speaking"
          ? "Speaking"
          : mode === "listening"
            ? "Listening"
            : "Ready"

  return (
    <div className="flex flex-col items-center gap-3 py-3">
      <div
        className="relative flex h-44 w-44 items-center justify-center"
        style={{ transform: `scale(${pulse})`, transition: "transform 90ms linear" }}
      >
        <span className="absolute inset-1 rounded-full bg-sky-200/30 blur-3xl" />
        <span
          className={cn(
            "absolute h-36 w-36 rounded-full opacity-80 blur-xl",
            active ? "bg-cyan-300/45 motion-safe:animate-pulse" : "bg-sky-200/35",
          )}
        />
        <span
          className="absolute h-32 w-32 rounded-full opacity-90 mix-blend-multiply motion-safe:animate-spin"
          style={{
            animationDuration: active ? "6s" : "14s",
            background:
              "conic-gradient(from 40deg, rgba(125,211,252,0.18), rgba(59,130,246,0.75), rgba(16,185,129,0.6), rgba(99,102,241,0.58), rgba(125,211,252,0.18))",
          }}
        />
        <span
          className="absolute h-28 w-28 rounded-full border border-white/75 shadow-[inset_0_1px_10px_rgba(255,255,255,0.85),0_18px_42px_rgba(14,165,233,0.18)]"
          style={{
            background:
              "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.98), rgba(186,230,253,0.88) 24%, rgba(56,189,248,0.72) 48%, rgba(37,99,235,0.68) 74%, rgba(15,23,42,0.75) 100%)",
          }}
        />
        <span className="absolute left-14 top-10 h-9 w-16 rotate-[-28deg] rounded-full bg-white/75 blur-md" />
        <span
          className="absolute h-24 w-24 rounded-full opacity-70 motion-safe:animate-spin"
          style={{
            animationDuration: "10s",
            background:
              "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.95), transparent 13%), radial-gradient(circle at 26% 76%, rgba(45,212,191,0.65), transparent 22%), radial-gradient(circle at 72% 78%, rgba(129,140,248,0.55), transparent 28%)",
          }}
        />
        <span className="absolute h-16 w-16 rounded-full border border-white/35 bg-white/10 backdrop-blur-[1px]" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">{status}</p>
    </div>
  )
}

export function LandingSonicDemoCard({ className }: { className?: string }) {
  const t = useTranslations("landing")
  const locale = useLocale()
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

  const [mounted, setMounted] = useState(false)
  const [viewedDemo, setViewedDemo] = useState(false)
  const [demoState, setDemoState] = useState<DemoState>("idle")
  const [localError, setLocalError] = useState<string | null>(null)
  const [assistantSpeaking, setAssistantSpeaking] = useState(false)
  const [orbEnergy, setOrbEnergy] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const playerRef = useRef<PcmStreamPlayer | null>(null)
  const speakingPollRef = useRef<number | null>(null)
  const micFlushTimerRef = useRef<number | null>(null)
  const pendingMicRef = useRef<Int16Array>(new Int16Array(0))
  const micSeqRef = useRef(0)
  const demoStartedAtRef = useRef(0)
  const demoSessionRef = useRef<string | null>(null)
  const assistantSpeakingRef = useRef(false)
  const inputRateRef = useRef(FRONTLINE_VOICE_INPUT_RATE)

  useEffect(() => {
    setMounted(true)
    try {
      setViewedDemo(localStorage.getItem(VIEWED_SONIC_DEMO_KEY) === "1")
    } catch {
      setViewedDemo(false)
    }
  }, [])

  const markViewed = useCallback(() => {
    setViewedDemo(true)
    try {
      localStorage.setItem(VIEWED_SONIC_DEMO_KEY, "1")
    } catch {
      // Local storage is only a UX hint; the demo can still run without it.
    }
  }, [])

  const sendMicChunk = useCallback((chunk: Int16Array) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || chunk.length === 0) return
    const seq = micSeqRef.current + 1
    micSeqRef.current = seq
    const clientTsMs = Date.now()
    const clientPerfMs = Math.round(performance.now())
    const bufferedBefore = ws.bufferedAmount
    ws.send(
      JSON.stringify({
        type: "audio",
        sample_rate: inputRateRef.current,
        seq,
        samples: chunk.length,
        bytes: chunk.byteLength,
        client_ts_ms: clientTsMs,
        client_perf_ms: clientPerfMs,
        data: pcm16ToBase64(chunk),
      }),
    )
    const elapsedMs = demoStartedAtRef.current
      ? Math.round(performance.now() - demoStartedAtRef.current)
      : 0
    if (seq <= 12 || seq % 25 === 0) {
      console.info("[Frontline voice demo] mic_chunk_sent", {
        session: demoSessionRef.current,
        seq,
        elapsed_ms: elapsedMs,
        samples: chunk.length,
        bytes: chunk.byteLength,
        sample_rate: inputRateRef.current,
        ws_buffered_before: bufferedBefore,
        ws_buffered_after: ws.bufferedAmount,
        client_ts_ms: clientTsMs,
        client_perf_ms: clientPerfMs,
      })
    }
  }, [])

  const flushPendingMic = useCallback(
    (allowPartial = false) => {
      const pending = pendingMicRef.current
      if (pending.length === 0) return
      if (!allowPartial && pending.length < FRONTLINE_VOICE_CHUNK_SAMPLES) return
      sendMicChunk(pending)
      pendingMicRef.current = new Int16Array(0)
    },
    [sendMicChunk],
  )

  const stopMicFlush = useCallback(() => {
    if (micFlushTimerRef.current != null) {
      window.clearInterval(micFlushTimerRef.current)
      micFlushTimerRef.current = null
    }
    flushPendingMic(true)
    pendingMicRef.current = new Int16Array(0)
  }, [flushPendingMic])

  const startMicFlush = useCallback(() => {
    stopMicFlush()
    micFlushTimerRef.current = window.setInterval(() => {
      flushPendingMic(true)
    }, FRONTLINE_VOICE_MIC_FLUSH_MS)
  }, [flushPendingMic, stopMicFlush])

  const stopSpeakingPoll = useCallback(() => {
    if (speakingPollRef.current != null) {
      window.clearInterval(speakingPollRef.current)
      speakingPollRef.current = null
    }
    assistantSpeakingRef.current = false
    setAssistantSpeaking(false)
  }, [])

  const startSpeakingPoll = useCallback(() => {
    stopSpeakingPoll()
    speakingPollRef.current = window.setInterval(() => {
      const playing = playerRef.current?.isPlaying ?? false
      assistantSpeakingRef.current = playing
      setAssistantSpeaking(playing)
      if (playing) setOrbEnergy((energy) => Math.max(energy, 0.35))
    }, 60)
  }, [stopSpeakingPoll])

  const cleanupAudio = useCallback(() => {
    console.info("[Frontline voice demo] cleanup", {
      session: demoSessionRef.current,
      mic_chunks_sent: micSeqRef.current,
    })
    stopMicFlush()
    stopSpeakingPoll()
    processorRef.current?.disconnect()
    processorRef.current = null
    audioContextRef.current?.close().catch(() => {})
    audioContextRef.current = null
    playerRef.current?.close()
    playerRef.current = null
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
    wsRef.current?.close()
    wsRef.current = null
    setOrbEnergy(0)
  }, [stopMicFlush, stopSpeakingPoll])

  useEffect(() => () => cleanupAudio(), [cleanupAudio])

  const stopSession = useCallback(() => {
    setDemoState("ending")
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }))
      return
    }
    cleanupAudio()
    setDemoState("idle")
  }, [cleanupAudio])

  const startSession = async () => {
    if (viewedDemo || demoState === "connecting" || demoState === "recording") return
    demoStartedAtRef.current = performance.now()
    micSeqRef.current = 0
    demoSessionRef.current = null
    console.info("[Frontline voice demo] start_requested", {
      client_ts_ms: Date.now(),
      client_perf_ms: Math.round(demoStartedAtRef.current),
    })
    setLocalError(null)
    setDemoState("connecting")

    try {
      const started = await api.startFrontlineVoiceDemoSession()
      demoSessionRef.current = started.session_uuid
      console.info("[Frontline voice demo] session_created", {
        session: started.session_uuid,
        elapsed_ms: Math.round(performance.now() - demoStartedAtRef.current),
        websocket_path: started.websocket_path,
        max_seconds: started.max_seconds,
        model_id: started.model_id,
        voice_id: started.voice_id,
        region: started.region,
      })
      const player = new PcmStreamPlayer(FRONTLINE_VOICE_OUTPUT_RATE)
      playerRef.current = player
      await player.resume()
      startSpeakingPoll()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      mediaStreamRef.current = stream
      console.info("[Frontline voice demo] mic_granted", {
        session: demoSessionRef.current,
        elapsed_ms: Math.round(performance.now() - demoStartedAtRef.current),
        audio_tracks: stream.getAudioTracks().length,
      })

      const ws = new WebSocket(
        api.frontlineVoiceDemoWebSocketUrl(
          started.websocket_path,
          started.websocket_token,
        ),
      )
      wsRef.current = ws
      console.info("[Frontline voice demo] websocket_connecting", {
        session: demoSessionRef.current,
        elapsed_ms: Math.round(performance.now() - demoStartedAtRef.current),
      })

      ws.onopen = () => {
        console.info("[Frontline voice demo] websocket_open", {
          session: demoSessionRef.current,
          elapsed_ms: Math.round(performance.now() - demoStartedAtRef.current),
        })
      }

      ws.onmessage = async (event) => {
        let payload: Record<string, unknown>
        try {
          payload = JSON.parse(String(event.data))
        } catch {
          return
        }

        const type = String(payload.type || "")
        const eventMeta = {
          session: demoSessionRef.current,
          type,
          elapsed_ms: Math.round(performance.now() - demoStartedAtRef.current),
          ws_buffered_amount: ws.bufferedAmount,
          sample_rate: Number(payload.sample_rate) || undefined,
          stage: payload.stage ? String(payload.stage) : undefined,
          text_len: typeof payload.text === "string" ? payload.text.length : undefined,
          audio_b64_len: typeof payload.data === "string" ? payload.data.length : undefined,
        }
        if (type === "assistant_audio") {
          console.info("[Frontline voice demo] websocket_message_audio", eventMeta)
        } else {
          console.info("[Frontline voice demo] websocket_message", eventMeta)
        }
        if (type === "ready") {
          const inputRate = Number(payload.sample_rate) || FRONTLINE_VOICE_INPUT_RATE
          inputRateRef.current = inputRate
          pendingMicRef.current = new Int16Array(0)
          markViewed()

          const audioContext = new AudioContext()
          audioContextRef.current = audioContext
          await audioContext.resume()

          const source = audioContext.createMediaStreamSource(stream)
          const captureBuffer = resolveCaptureBufferSize(audioContext.sampleRate, inputRate)
          const processor = audioContext.createScriptProcessor(captureBuffer, 1, 1)
          processorRef.current = processor

          const silent = audioContext.createGain()
          silent.gain.value = 0

          processor.onaudioprocess = (e) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
            const input = e.inputBuffer.getChannelData(0)
            setOrbEnergy((prev) => {
              const level = rmsLevel(input)
              return assistantSpeakingRef.current ? prev * 0.6 + level * 0.4 : level
            })

            const downsampled = downsampleBuffer(input, audioContext.sampleRate, inputRate)
            const samples = float32ToInt16(downsampled)
            if (samples.length === 0) return

            const pending = pendingMicRef.current
            const merged = new Int16Array(pending.length + samples.length)
            merged.set(pending)
            merged.set(samples, pending.length)
            pendingMicRef.current = merged

            while (pendingMicRef.current.length >= FRONTLINE_VOICE_CHUNK_SAMPLES) {
              const chunk = pendingMicRef.current.slice(0, FRONTLINE_VOICE_CHUNK_SAMPLES)
              pendingMicRef.current = pendingMicRef.current.slice(FRONTLINE_VOICE_CHUNK_SAMPLES)
              sendMicChunk(chunk)
            }
          }

          source.connect(processor)
          processor.connect(silent)
          silent.connect(audioContext.destination)
          startMicFlush()
          console.info("[Frontline voice demo] capture_started", {
            session: demoSessionRef.current,
            elapsed_ms: Math.round(performance.now() - demoStartedAtRef.current),
            input_rate: inputRate,
            browser_audio_rate: audioContext.sampleRate,
            capture_buffer_size: captureBuffer,
          })
          setDemoState("recording")
          return
        }

        if (type === "barge_in") {
          playerRef.current?.flush()
          assistantSpeakingRef.current = false
          setAssistantSpeaking(false)
        }
        if (type === "assistant_audio") {
          const activePlayer = playerRef.current
          if (activePlayer) {
            const binary = atob(String(payload.data || ""))
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
            activePlayer.schedule(
              bytes.buffer,
              Number(payload.sample_rate) || FRONTLINE_VOICE_OUTPUT_RATE,
            )
            assistantSpeakingRef.current = true
            setAssistantSpeaking(true)
          }
        }
        if (type === "demo_complete") {
          cleanupAudio()
          setDemoState("idle")
        }
        if (type === "error") {
          const msg = String(payload.message || t("frontlineDemoError"))
          setLocalError(msg)
          cleanupAudio()
          setDemoState("failed")
        }
      }

      ws.onerror = () => {
        console.info("[Frontline voice demo] websocket_error", {
          session: demoSessionRef.current,
          elapsed_ms: Math.round(performance.now() - demoStartedAtRef.current),
          mic_chunks_sent: micSeqRef.current,
        })
        setLocalError(t("frontlineDemoConnectionError"))
        cleanupAudio()
        setDemoState("failed")
      }

      ws.onclose = () => {
        console.info("[Frontline voice demo] websocket_close", {
          session: demoSessionRef.current,
          elapsed_ms: Math.round(performance.now() - demoStartedAtRef.current),
          mic_chunks_sent: micSeqRef.current,
        })
        setDemoState((current) => {
          if (current === "recording" || current === "connecting" || current === "ending") {
            cleanupAudio()
            return "idle"
          }
          return current
        })
      }
    } catch (err) {
      console.info("[Frontline voice demo] start_failed", {
        session: demoSessionRef.current,
        elapsed_ms: Math.round(performance.now() - demoStartedAtRef.current),
        error: err instanceof Error ? err.message : String(err),
      })
      const msg = err instanceof Error ? err.message : t("frontlineDemoStartError")
      setLocalError(msg)
      cleanupAudio()
      setDemoState("failed")
    }
  }

  const busy = demoState === "connecting" || demoState === "recording" || demoState === "ending"
  const showSignupState =
    mounted && viewedDemo && (demoState === "idle" || demoState === "failed")
  const orbMode =
    demoState === "connecting"
      ? "connecting"
      : demoState === "ending"
        ? "saving"
        : demoState === "recording" && assistantSpeaking
          ? "speaking"
          : demoState === "recording"
            ? "listening"
            : "idle"

  return (
    <div
      className={cn(
        "w-full max-w-[560px] rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,#f2f8ff_0%,#eaf4ff_100%)] p-4 shadow-[0_24px_70px_rgba(38,49,61,0.12)] transition-all hover:-translate-y-1 hover:ring-4 hover:ring-sky-500/15 hover:shadow-xl",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.55)]" />
              {t("frontlineDemoLiveLabel")}
            </div>
            <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              {showSignupState ? t("frontlineDemoCtaTitle") : t("frontlineDemoCardTitle")}
            </h3>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-700">
            <PhoneCall className="h-5 w-5" />
          </div>
        </div>

        <div className="py-5">
          {showSignupState ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[18px] border border-emerald-100 bg-emerald-50/50 px-4 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-100 bg-white text-emerald-700 shadow-sm">
                <ShieldCheck className="h-9 w-9" />
              </div>
              <p className="max-w-sm text-sm leading-6 text-slate-600">
                {t("frontlineDemoCtaBody")}
              </p>
              <Button
                asChild
                className="mt-6 rounded-full bg-[#131820] px-5 text-white hover:bg-[#26313d]"
              >
                <Link href={signupUrl}>
                  {t("frontlineDemoCtaButton")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="relative overflow-hidden rounded-[18px] border border-sky-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef7ff_100%)] p-4">
                <FloatingVoiceMesh active={busy} />
                <div className="relative z-10">
                  <DemoLiquidOrb mode={orbMode} energy={busy ? orbEnergy : 0} />
                  <div className="text-center">
                    <p className="mx-auto max-w-sm text-sm leading-6 text-slate-600">
                      {demoState === "recording"
                        ? t("frontlineDemoListeningText")
                        : t("frontlineDemoIdleText")}
                    </p>
                  </div>

                  <div className="mt-5 flex justify-center">
                    {demoState === "idle" || demoState === "failed" ? (
                      <Button
                        onClick={() => void startSession()}
                        disabled={busy}
                        className="rounded-full bg-[#131820] px-5 text-white hover:bg-[#26313d]"
                      >
                        <Mic2 className="h-4 w-4" />
                        {t("frontlineDemoStart")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={stopSession}
                        disabled={demoState === "ending"}
                        className="rounded-full border-slate-200 bg-white px-5 text-slate-700 hover:bg-slate-50"
                      >
                        {demoState === "ending" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                        {t("frontlineDemoEnd")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {localError ? (
                <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
                  {localError}
                </p>
              ) : null}

            </>
          )}
        </div>
      </div>
    </div>
  )
}
