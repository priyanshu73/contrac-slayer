"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Mic2, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import type {
  FrontlineKnowledgeIntakeResponse,
  FrontlineVoiceTrainingEligibility,
  FrontlineVoiceTrainingSession,
} from "@/lib/types/frontline"

import { VoiceTrainingOrb } from "@/components/frontline/voice-training-orb"

type VoiceState = "idle" | "connecting" | "recording" | "saving" | "completed" | "failed"

type TranscriptItem = {
  role: "user" | "assistant"
  text: string
  at?: string
  interim?: boolean
}

type Props = {
  onKnowledgeSaved?: (markdown: string, summary?: string | null) => void
  onError?: (message: string) => void
}

function rmsLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] ?? 0
    sum += s * s
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 8)
}

export function FrontlineVoiceTrainingPanel({ onKnowledgeSaved, onError }: Props) {
  const [eligibility, setEligibility] = useState<FrontlineVoiceTrainingEligibility | null>(null)
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [transcript, setTranscript] = useState<TranscriptItem[]>([])
  const [session, setSession] = useState<FrontlineVoiceTrainingSession | null>(null)
  const [intakeSummary, setIntakeSummary] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [showTranscript, setShowTranscript] = useState(true)
  const [orbEnergy, setOrbEnergy] = useState(0)
  const [assistantSpeaking, setAssistantSpeaking] = useState(false)
  const [liveUserText, setLiveUserText] = useState("")
  const [liveAssistantText, setLiveAssistantText] = useState("")
  const [waitingForResponse, setWaitingForResponse] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const playerRef = useRef<PcmStreamPlayer | null>(null)
  const stoppingRef = useRef(false)
  const voiceStateRef = useRef<VoiceState>("idle")
  const speakingPollRef = useRef<number | null>(null)
  const assistantSpeakingRef = useRef(false)
  const micFlushTimerRef = useRef<number | null>(null)
  const pendingMicRef = useRef<Int16Array>(new Int16Array(0))
  const inputRateRef = useRef(FRONTLINE_VOICE_INPUT_RATE)

  useEffect(() => {
    voiceStateRef.current = voiceState
  }, [voiceState])

  const loadEligibility = useCallback(async () => {
    try {
      const data = await api.getFrontlineVoiceTrainingEligibility()
      setEligibility(data)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Unable to load voice training eligibility.")
    }
  }, [onError])

  useEffect(() => {
    void loadEligibility()
  }, [loadEligibility])

  const stopSpeakingPoll = useCallback(() => {
    if (speakingPollRef.current != null) {
      window.clearInterval(speakingPollRef.current)
      speakingPollRef.current = null
    }
    setAssistantSpeaking(false)
    assistantSpeakingRef.current = false
  }, [])

  const startSpeakingPoll = useCallback(() => {
    stopSpeakingPoll()
    speakingPollRef.current = window.setInterval(() => {
      const playing = playerRef.current?.isPlaying ?? false
      setAssistantSpeaking(playing)
      assistantSpeakingRef.current = playing
      if (playing) setOrbEnergy((e) => Math.max(e, 0.35))
    }, 60)
  }, [stopSpeakingPoll])

  const sendMicChunk = useCallback((chunk: Int16Array) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN || chunk.length === 0) return
    ws.send(
      JSON.stringify({
        type: "audio",
        sample_rate: inputRateRef.current,
        data: pcm16ToBase64(chunk),
      }),
    )
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

  const cleanupAudio = useCallback(() => {
    stopMicFlush()
    stopSpeakingPoll()
    setLiveUserText("")
    setLiveAssistantText("")
    setWaitingForResponse(false)
    processorRef.current?.disconnect()
    processorRef.current = null
    audioContextRef.current?.close().catch(() => {})
    audioContextRef.current = null
    playerRef.current?.close()
    playerRef.current = null
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
    wsRef.current?.close()
    wsRef.current = null
    setOrbEnergy(0)
  }, [stopMicFlush, stopSpeakingPoll])

  useEffect(() => () => cleanupAudio(), [cleanupAudio])

  const applyTranscriptEvent = (
    role: "user" | "assistant",
    text: string,
    stage?: string,
  ) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const isSpeculative = String(stage || "FINAL").toUpperCase() === "SPECULATIVE"

    if (role === "user") {
      setLiveUserText(trimmed)
      setWaitingForResponse(true)
      setTranscript((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === "user" && last.text === trimmed && !last.interim) return prev
        const withoutInterim = prev.filter((item) => !(item.role === "user" && item.interim))
        return [
          ...withoutInterim,
          { role: "user", text: trimmed, at: new Date().toISOString() },
        ]
      })
      return
    }

    if (isSpeculative) {
      setWaitingForResponse(false)
      setLiveAssistantText(trimmed)
      setTranscript((prev) => {
        const withoutInterim = prev.filter(
          (item) => !(item.role === "assistant" && item.interim),
        )
        return [
          ...withoutInterim,
          {
            role: "assistant",
            text: trimmed,
            at: new Date().toISOString(),
            interim: true,
          },
        ]
      })
      return
    }

    setWaitingForResponse(false)
    setLiveAssistantText("")
    setTranscript((prev) => {
      const withoutInterim = prev.filter(
        (item) => !(item.role === "assistant" && item.interim),
      )
      const last = withoutInterim[withoutInterim.length - 1]
      if (last?.role === "assistant" && last.text === trimmed) return withoutInterim
      return [
        ...withoutInterim,
        { role: "assistant", text: trimmed, at: new Date().toISOString() },
      ]
    })
  }

  const stopSession = useCallback(async () => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    setVoiceState("saving")
    try {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "stop" }))
      } else {
        cleanupAudio()
        setVoiceState("idle")
      }
    } finally {
      stoppingRef.current = false
    }
  }, [cleanupAudio])

  const startSession = async () => {
    if (!eligibility?.allowed) return
    setLocalError(null)
    setTranscript([])
    setLiveUserText("")
    setLiveAssistantText("")
    setWaitingForResponse(false)
    setIntakeSummary(null)
    setSession(null)
    setVoiceState("connecting")

    try {
      const started = await api.startFrontlineVoiceTrainingSession()
      setSession(started.session)

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

      const wsUrl = api.frontlineVoiceTrainingWebSocketUrl(
        started.websocket_path,
        started.websocket_token,
      )
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = async (event) => {
        let payload: Record<string, unknown>
        try {
          payload = JSON.parse(String(event.data))
        } catch {
          return
        }
        const type = String(payload.type || "")

        if (type === "ready") {
          const inputRate = Number(payload.sample_rate) || FRONTLINE_VOICE_INPUT_RATE
          inputRateRef.current = inputRate
          pendingMicRef.current = new Int16Array(0)

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
          setVoiceState("recording")
          return
        }

        if (type === "user_text") {
          applyTranscriptEvent("user", String(payload.text || ""), String(payload.stage || "FINAL"))
        }
        if (type === "assistant_text") {
          applyTranscriptEvent(
            "assistant",
            String(payload.text || ""),
            String(payload.stage || "FINAL"),
          )
        }
        if (type === "barge_in") {
          setWaitingForResponse(false)
          playerRef.current?.flush()
          assistantSpeakingRef.current = false
          setAssistantSpeaking(false)
        }
        if (type === "assistant_audio") {
          setWaitingForResponse(false)
          const player = playerRef.current
          if (player) {
            const binary = atob(String(payload.data || ""))
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
            player.schedule(
              bytes.buffer,
              Number(payload.sample_rate) || FRONTLINE_VOICE_OUTPUT_RATE,
            )
            assistantSpeakingRef.current = true
            setAssistantSpeaking(true)
          }
        }
        if (type === "saved") {
          const savedSession = payload.session as FrontlineVoiceTrainingSession | undefined
          const knowledge = payload.knowledge as FrontlineKnowledgeIntakeResponse | undefined
          if (savedSession) setSession(savedSession)
          const summary = String(payload.summary || savedSession?.intake_summary || "")
          const skipped = Boolean((knowledge as { intake_skipped?: boolean } | undefined)?.intake_skipped)
          setIntakeSummary(
            skipped
              ? summary || "Training skipped — nothing useful was saved to knowledge."
              : summary,
          )
          if (knowledge?.markdown_text) {
            onKnowledgeSaved?.(knowledge.markdown_text, savedSession?.intake_summary)
          }
          cleanupAudio()
          setVoiceState("completed")
          void loadEligibility()
        }
        if (type === "error") {
          const msg = String(payload.message || "Voice training failed.")
          setLocalError(msg)
          onError?.(msg)
          cleanupAudio()
          setVoiceState("failed")
        }
      }

      ws.onerror = () => {
        setLocalError("WebSocket connection failed.")
        onError?.("WebSocket connection failed.")
        cleanupAudio()
        setVoiceState("failed")
      }

      ws.onclose = () => {
        const state = voiceStateRef.current
        if (state === "recording" || state === "connecting") {
          setLocalError("Voice connection lost — keep this tab open and try again.")
          cleanupAudio()
          setVoiceState("failed")
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to start voice training."
      setLocalError(msg)
      onError?.(msg)
      cleanupAudio()
      setVoiceState("failed")
    }
  }

  const busy = voiceState === "connecting" || voiceState === "recording" || voiceState === "saving"

  const orbMode =
    voiceState === "connecting"
      ? "connecting"
      : voiceState === "saving"
        ? "saving"
        : voiceState === "recording" && assistantSpeaking
          ? "speaking"
          : voiceState === "recording"
            ? "listening"
            : "idle"

  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-center">
        <h2 className="text-sm font-semibold text-slate-950">Train your receptionist</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          Have a short voice conversation about how you run your business. We turn it into
          receptionist knowledge automatically.
        </p>
      </div>

      <VoiceTrainingOrb mode={orbMode} energy={busy ? orbEnergy : 0} />

      {voiceState === "recording" &&
        (liveUserText || liveAssistantText || waitingForResponse) && (
        <div className="mx-auto mt-3 max-w-md space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          {liveUserText ? (
            <p className="text-slate-700">
              <span className="font-medium">You:</span> {liveUserText}
            </p>
          ) : null}
          {waitingForResponse && !liveAssistantText && !assistantSpeaking ? (
            <p className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>Thinking…</span>
            </p>
          ) : null}
          {liveAssistantText ? (
            <p className="text-slate-500 italic">
              <span className="font-medium not-italic text-slate-600">Assistant:</span>{" "}
              {liveAssistantText}
            </p>
          ) : null}
        </div>
      )}

      {eligibility && (
        <p className="text-center text-xs text-slate-500">
          {eligibility.weekly_limit != null && eligibility.weekly_limit > 0
            ? `${eligibility.completed_this_week}/${eligibility.weekly_limit} sessions this week · `
            : null}
          up to {Math.round(eligibility.max_seconds / 60)} min
        </p>
      )}

      <div className="mt-4 flex flex-col items-center gap-3">
        {voiceState === "idle" || voiceState === "completed" || voiceState === "failed" ? (
          <Button
            onClick={() => void startSession()}
            disabled={busy || !eligibility?.allowed}
            className="gap-2 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
          >
            <Mic2 className="h-4 w-4" />
            Start conversation
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => void stopSession()}
            disabled={voiceState === "saving"}
            className="gap-2 rounded-full border-slate-200 px-6"
          >
            {voiceState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            End and save
          </Button>
        )}
      </div>

      {!eligibility?.allowed &&
        eligibility?.weekly_limit != null &&
        eligibility.weekly_limit > 0 &&
        voiceState === "idle" && (
          <p className="mt-3 text-center text-xs text-amber-700">
            Weekly limit reached. You can train again next week.
          </p>
        )}

      {(localError || voiceState === "failed") && localError && (
        <p className="mt-3 text-center text-sm text-red-600">{localError}</p>
      )}

      {voiceState === "completed" && intakeSummary && (
        <p
          className={`mt-3 rounded-xl border p-3 text-sm ${
            intakeSummary.startsWith("Skipped:")
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {intakeSummary.startsWith("Skipped:") ? intakeSummary : `Saved: ${intakeSummary}`}
        </p>
      )}

      {transcript.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="flex w-full items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            {showTranscript ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript && (
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {transcript.map((item, idx) => (
                <div key={`${item.role}-${idx}`} className="text-sm">
                  <span className="font-medium text-slate-700">
                    {item.role === "user" ? "You" : "Assistant"}:
                  </span>{" "}
                  <span className={item.interim ? "text-slate-500 italic" : "text-slate-600"}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {session?.status === "completed" && session.transcript_text && voiceState === "completed" && (
        <p className="mt-2 text-center text-xs text-slate-400">
          {session.duration_seconds ?? 0}s session
        </p>
      )}
    </div>
  )
}
