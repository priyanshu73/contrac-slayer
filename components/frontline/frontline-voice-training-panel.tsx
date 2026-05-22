"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Mic2, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import {
  downsampleBuffer,
  floatTo16BitPCM,
  pcm16ToBase64,
  playPcm16Chunk,
} from "@/lib/frontline-voice-audio"
import type {
  FrontlineKnowledgeIntakeResponse,
  FrontlineVoiceTrainingEligibility,
  FrontlineVoiceTrainingSession,
} from "@/lib/types/frontline"

type VoiceState = "idle" | "connecting" | "recording" | "saving" | "completed" | "failed"

type TranscriptItem = {
  role: "user" | "assistant"
  text: string
  at?: string
}

type Props = {
  onKnowledgeSaved?: (markdown: string, summary?: string | null) => void
  onError?: (message: string) => void
}

export function FrontlineVoiceTrainingPanel({ onKnowledgeSaved, onError }: Props) {
  const [eligibility, setEligibility] = useState<FrontlineVoiceTrainingEligibility | null>(null)
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [transcript, setTranscript] = useState<TranscriptItem[]>([])
  const [session, setSession] = useState<FrontlineVoiceTrainingSession | null>(null)
  const [intakeSummary, setIntakeSummary] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)
  const playbackQueueRef = useRef<Promise<void>>(Promise.resolve())
  const stoppingRef = useRef(false)

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

  const cleanupAudio = useCallback(() => {
    processorRef.current?.disconnect()
    processorRef.current = null
    audioContextRef.current?.close().catch(() => {})
    audioContextRef.current = null
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  useEffect(() => () => cleanupAudio(), [cleanupAudio])

  const appendTranscript = (role: "user" | "assistant", text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setTranscript((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.role === role && last.text === trimmed) return prev
      return [...prev, { role, text: trimmed, at: new Date().toISOString() }]
    })
  }

  const queuePlayback = (base64: string, sampleRate: number) => {
    playbackQueueRef.current = playbackQueueRef.current.then(async () => {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioContext({ sampleRate })
      }
      const ctx = playbackContextRef.current
      if (ctx.state === "suspended") await ctx.resume()
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      await playPcm16Chunk(ctx, bytes.buffer, sampleRate)
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
    setIntakeSummary(null)
    setSession(null)
    setVoiceState("connecting")

    try {
      const started = await api.startFrontlineVoiceTrainingSession()
      setSession(started.session)

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
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
          const inputRate = Number(payload.sample_rate) || 16000
          const audioContext = new AudioContext()
          audioContextRef.current = audioContext
          const source = audioContext.createMediaStreamSource(stream)
          const processor = audioContext.createScriptProcessor(4096, 1, 1)
          processorRef.current = processor
          processor.onaudioprocess = (e) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
            const input = e.inputBuffer.getChannelData(0)
            const downsampled = downsampleBuffer(input, audioContext.sampleRate, inputRate)
            const pcm = floatTo16BitPCM(downsampled)
            wsRef.current.send(
              JSON.stringify({
                type: "audio",
                sample_rate: inputRate,
                data: pcm16ToBase64(pcm),
              }),
            )
          }
          source.connect(processor)
          processor.connect(audioContext.destination)
          setVoiceState("recording")
          return
        }

        if (type === "user_text") appendTranscript("user", String(payload.text || ""))
        if (type === "assistant_text") appendTranscript("assistant", String(payload.text || ""))
        if (type === "assistant_audio") {
          queuePlayback(String(payload.data || ""), Number(payload.sample_rate) || 24000)
        }
        if (type === "saved") {
          const savedSession = payload.session as FrontlineVoiceTrainingSession | undefined
          const knowledge = payload.knowledge as FrontlineKnowledgeIntakeResponse | undefined
          if (savedSession) setSession(savedSession)
          setIntakeSummary(String(payload.summary || savedSession?.intake_summary || ""))
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
        if (voiceState === "recording" || voiceState === "connecting") {
          cleanupAudio()
          setVoiceState((s) => (s === "saving" ? s : "idle"))
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

  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Mic2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-950">Voice training</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Talk through your business once a week. Nova asks questions; we turn the transcript into
            receptionist knowledge automatically.
          </p>
          {eligibility && eligibility.weekly_limit != null && eligibility.weekly_limit > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {eligibility.completed_this_week}/{eligibility.weekly_limit} sessions used this week
              · up to {Math.round(eligibility.max_seconds / 60)} min
            </p>
          )}
          {eligibility && (eligibility.weekly_limit == null || eligibility.weekly_limit <= 0) && (
            <p className="mt-2 text-xs text-slate-500">
              Up to {Math.round(eligibility.max_seconds / 60)} min per session
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {voiceState === "idle" || voiceState === "completed" || voiceState === "failed" ? (
          <Button
            onClick={() => void startSession()}
            disabled={busy || !eligibility?.allowed}
            className="gap-2 rounded-xl bg-slate-950 text-white hover:bg-slate-800"
          >
            <Mic2 className="h-4 w-4" />
            Start voice training
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => void stopSession()}
            disabled={voiceState === "saving"}
            className="gap-2 rounded-xl border-slate-200"
          >
            {voiceState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Stop and save
          </Button>
        )}
      </div>

      {!eligibility?.allowed &&
        eligibility?.weekly_limit != null &&
        eligibility.weekly_limit > 0 &&
        voiceState === "idle" && (
        <p className="mt-3 text-xs text-amber-700">
          Weekly limit reached. You can train again next week.
        </p>
      )}

      {(localError || voiceState === "failed") && localError && (
        <p className="mt-3 text-sm text-red-600">{localError}</p>
      )}

      {voiceState === "completed" && intakeSummary && (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Saved to knowledge: {intakeSummary}
        </p>
      )}

      {transcript.length > 0 && (
        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {transcript.map((item, idx) => (
            <div key={`${item.role}-${idx}`} className="text-sm">
              <span className="font-medium text-slate-700">
                {item.role === "user" ? "You" : "Frontline"}:
              </span>{" "}
              <span className="text-slate-600">{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {session?.status === "completed" && session.transcript_text && voiceState === "completed" && (
        <p className="mt-2 text-xs text-slate-500">
          Session {session.uuid.slice(0, 8)} · {session.duration_seconds ?? 0}s
        </p>
      )}
    </div>
  )
}
