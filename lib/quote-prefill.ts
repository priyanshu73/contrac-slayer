// Transient prefill for the quote builder.
//
// The "Create Quote from lead" modal lets the user review (and AI-enhance) the
// title/scope before landing on /quotes/new. We can't pass that reviewed text
// through the URL (long, and we deliberately route with clientId only so the
// builder's raw-lead prefill does NOT overwrite the enhanced description), so we
// hand it off via sessionStorage and consume it once on the builder's mount.

const KEY = "quote-prefill"

export interface QuotePrefill {
    clientId?: number
    title?: string
    description?: string
    projectType?: string
    measurements?: any
}

export function setQuotePrefill(data: QuotePrefill): void {
    if (typeof window === "undefined") return
    try {
        window.sessionStorage.setItem(KEY, JSON.stringify(data))
    } catch {
        // Private mode / storage disabled — the builder just falls back to blank.
    }
}

// Reads and clears the prefill so a refresh of the builder doesn't re-apply it.
export function consumeQuotePrefill(): QuotePrefill | null {
    if (typeof window === "undefined") return null
    try {
        const raw = window.sessionStorage.getItem(KEY)
        if (!raw) return null
        window.sessionStorage.removeItem(KEY)
        return JSON.parse(raw) as QuotePrefill
    } catch {
        return null
    }
}
