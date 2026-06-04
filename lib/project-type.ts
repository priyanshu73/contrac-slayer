// Helpers for turning a lead's `project_type` into a human label and deciding
// whether it actually describes work.

// Quote-request forms store project_type as a snake_case slug (e.g. "bathroom_renovation").
const PROJECT_TYPE_LABELS: Record<string, string> = {
    bathroom_renovation: "Bathroom Renovation",
    kitchen_renovation: "Kitchen Renovation",
    flooring: "Flooring Installation",
    painting: "Painting",
    roofing: "Roofing",
    plumbing: "Plumbing",
    electrical: "Electrical Work",
    hvac: "HVAC",
    landscaping: "Landscaping",
    general_construction: "General Construction",
    other: "Other",
}

export function formatProjectType(value?: string): string {
    if (!value) return ""
    const key = value.trim().toLowerCase()
    if (PROJECT_TYPE_LABELS[key]) return PROJECT_TYPE_LABELS[key]
    return value
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Placeholder/system values the backend assigns to call leads (see
// unified_lead_service.py). These describe the *channel*, not the work, so they
// should not be used as a project/quote title — we derive a real title from the
// request text instead.
const GENERIC_LEAD_TYPES = new Set([
    "ai operator call",
    "service call",
    "call",
    "phone call",
    "inbound call",
    "missed call",
    "general inquiry",
    "general",
    "other",
])

// True when the project_type names actual work we can use as a title/context.
export function isUsableProjectType(value?: string): boolean {
    if (!value || !value.trim()) return false
    return !GENERIC_LEAD_TYPES.has(value.trim().toLowerCase())
}
