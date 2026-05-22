/** PCM helpers for Frontline Nova Sonic voice training (16 kHz in, 24 kHz out). */

export const FRONTLINE_VOICE_INPUT_RATE = 16000
export const FRONTLINE_VOICE_OUTPUT_RATE = 24000
/** AWS sample CHUNK_SIZE: 512 frames at 16 kHz ≈ 32 ms per mic send. */
export const FRONTLINE_VOICE_CHUNK_SAMPLES = 512
/** Legacy default; prefer resolveCaptureBufferSize() for ScriptProcessor. */
export const FRONTLINE_VOICE_CAPTURE_BUFFER = 512

const SCRIPT_PROCESSOR_SIZES = [256, 512, 1024, 2048, 4096, 8192, 16384] as const

/** Pick ScriptProcessor buffer so each callback yields ~512 samples at 16 kHz after downsampling. */
export function resolveCaptureBufferSize(
  contextSampleRate: number,
  targetSampleRate = FRONTLINE_VOICE_INPUT_RATE,
  targetFrames = FRONTLINE_VOICE_CHUNK_SAMPLES,
): number {
  const needed = Math.ceil(targetFrames * (contextSampleRate / targetSampleRate))
  return SCRIPT_PROCESSOR_SIZES.find((size) => size >= needed) ?? 16384
}

export function floatTo16BitPCM(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < float32.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32[i] ?? 0))
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return buffer
}

export function float32ToInt16(float32: Float32Array): Int16Array {
  const out = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32[i] ?? 0))
    out[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return out
}

export function downsampleBuffer(
  buffer: Float32Array,
  sampleRate: number,
  outSampleRate: number,
): Float32Array {
  if (outSampleRate === sampleRate) return buffer
  const ratio = sampleRate / outSampleRate
  const newLength = Math.round(buffer.length / ratio)
  const result = new Float32Array(newLength)
  let offsetResult = 0
  let offsetBuffer = 0
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio)
    let accum = 0
    let count = 0
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i] ?? 0
      count++
    }
    result[offsetResult] = count > 0 ? accum / count : 0
    offsetResult++
    offsetBuffer = nextOffsetBuffer
  }
  return result
}

export function pcm16ToBase64(pcm: ArrayBuffer | Int16Array): string {
  const bytes =
    pcm instanceof Int16Array
      ? new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
      : new Uint8Array(pcm)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

export function pcm16ToFloat32(pcm: ArrayBuffer): Float32Array {
  const view = new DataView(pcm)
  const out = new Float32Array(pcm.byteLength / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = view.getInt16(i * 2, true) / 0x8000
  }
  return out
}

/**
 * Schedules PCM16 on a single continuous timeline (AWS sample spirit).
 * flush() stops all in-flight buffers — required for Nova barge-in.
 */
export class PcmStreamPlayer {
  private ctx: AudioContext
  private nextStart = 0
  private sources = new Set<AudioBufferSourceNode>()
  private readonly startLeadSec = 0.02

  constructor(sampleRate = FRONTLINE_VOICE_OUTPUT_RATE) {
    this.ctx = new AudioContext({ sampleRate })
  }

  get context(): AudioContext {
    return this.ctx
  }

  get isPlaying(): boolean {
    return this.sources.size > 0 || this.nextStart > this.ctx.currentTime
  }

  async resume(): Promise<void> {
    if (this.ctx.state === "suspended") await this.ctx.resume()
  }

  schedule(pcm: ArrayBuffer, sampleRate = FRONTLINE_VOICE_OUTPUT_RATE): void {
    const floats = pcm16ToFloat32(pcm)
    if (floats.length === 0) return

    const buffer = this.ctx.createBuffer(1, floats.length, sampleRate)
    buffer.copyToChannel(floats, 0)

    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.ctx.destination)

    const now = this.ctx.currentTime
    if (this.nextStart < now) {
      this.nextStart = now + this.startLeadSec
    }

    source.start(this.nextStart)
    this.nextStart += buffer.duration
    this.sources.add(source)
    source.onended = () => {
      this.sources.delete(source)
    }
  }

  /** Stop queued playback immediately (Nova barge-in / interrupted). */
  flush(): void {
    for (const source of this.sources) {
      try {
        source.stop()
      } catch {
        /* already stopped */
      }
    }
    this.sources.clear()
    this.nextStart = 0
  }

  close(): void {
    this.flush()
    void this.ctx.close()
  }
}
