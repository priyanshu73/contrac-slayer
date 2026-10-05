import type { WebsitePhotoCrop } from "./types/website"

// Keep invalid persisted data visually safe. Backend rejects it on save.
export function websitePhotoCropStyle(crop?: WebsitePhotoCrop | null) {
  const clamp = (value: number | undefined, fallback: number, min: number, max: number) => Number.isFinite(value) ? Math.min(max, Math.max(min, value!)) : fallback
  const x = clamp(crop?.x, .5, 0, 1) * 100
  const y = clamp(crop?.y, .5, 0, 1) * 100
  return { objectPosition: `${x}% ${y}%`, transformOrigin: `${x}% ${y}%`, transform: `scale(${clamp(crop?.zoom, 1, 1, 3)})` }
}
