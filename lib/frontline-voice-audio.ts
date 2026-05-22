/** PCM helpers for Frontline Nova Sonic voice training (16 kHz in, 24 kHz out). */

export const FRONTLINE_VOICE_INPUT_RATE = 16000
export const FRONTLINE_VOICE_OUTPUT_RATE = 24000
/** Mic capture buffer size (ScriptProcessor). ~32 ms at 48 kHz — matches AWS sample CHUNK_SIZE spirit. */
export const FRONTLINE_VOICE_CAPTURE_BUFFER = 512

export function floatTo16BitPCM(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < float32.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32[i] ?? 0))
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return buffer
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

export function pcm16ToBase64(pcm: ArrayBuffer): string {
  const bytes = new Uint8Array(pcm)
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
 * Schedules PCM16 chunks on a continuous timeline instead of waiting for each
 * chunk to finish — removes gaps and cuts perceived latency.
 */
export class PcmStreamPlayer {
  private ctx: AudioContext
  private nextStart = 0
  private activeSources = 0
  private readonly maxLeadSec = 0.12
  private readonly minLeadSec = 0.025

  constructor(sampleRate = FRONTLINE_VOICE_OUTPUT_RATE) {
    this.ctx = new AudioContext({ sampleRate })
  }

  get context(): AudioContext {
    return this.ctx
  }

  get isPlaying(): boolean {
    return this.activeSources > 0 || this.nextStart > this.ctx.currentTime
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
      this.nextStart = now + this.minLeadSec
    } else if (this.nextStart - now > this.maxLeadSec) {
      // Too much buffered — drop lead to stay responsive.
      this.nextStart = now + this.minLeadSec
    }

    source.start(this.nextStart)
    this.nextStart += buffer.duration
    this.activeSources += 1
    source.onended = () => {
      this.activeSources = Math.max(0, this.activeSources - 1)
    }
  }

  reset(): void {
    this.nextStart = 0
  }

  close(): void {
    void this.ctx.close()
  }
}
