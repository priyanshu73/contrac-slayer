/** PCM helpers for Frontline Nova Sonic voice training (16 kHz in, 24 kHz out). */

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

export function base64ToPcm16(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function pcm16ToFloat32(pcm: ArrayBuffer): Float32Array {
  const view = new DataView(pcm)
  const out = new Float32Array(pcm.byteLength / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = view.getInt16(i * 2, true) / 0x8000
  }
  return out
}

/** Play mono PCM16 at sampleRate via Web Audio API. */
export async function playPcm16Chunk(
  audioContext: AudioContext,
  pcm: ArrayBuffer,
  sampleRate: number,
): Promise<void> {
  const floats = pcm16ToFloat32(pcm)
  const audioBuffer = audioContext.createBuffer(1, floats.length, sampleRate)
  audioBuffer.copyToChannel(floats, 0)
  const source = audioContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(audioContext.destination)
  source.start()
  await new Promise<void>((resolve) => {
    source.onended = () => resolve()
  })
}
