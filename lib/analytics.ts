// Lightweight, safe wrappers around the GA4 + TikTok pixels.
// Both pixels are gated to the production hostname, so on localhost/dev/preview
// `gtag` / `ttq` simply aren't present and these become no-ops — no fake events.

export function trackGA(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  if (typeof w.gtag === "function") w.gtag("event", event, params ?? {})
}

export function trackTikTok(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const w = window as unknown as {
    ttq?: { track: (event: string, params?: Record<string, unknown>) => void }
  }
  if (w.ttq && typeof w.ttq.track === "function") w.ttq.track(event, params ?? {})
}
