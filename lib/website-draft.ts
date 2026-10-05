import type { WebsiteSave, WebsiteState } from "./types/website"
import { normalizeWebsiteSave } from "./website-validation"

// Sort object keys, but preserve array order and null/default distinctions.
function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]))
  }
  return value
}

// Revision and approval metadata are not editable content. Normalization here
// is a comparison-only projection; it never writes back into input state.
export function websiteDraftSignature(draft: WebsiteSave, normalize = true): string {
  const projected = { slug: draft.slug, content: draft.content }
  const value = normalize ? normalizeWebsiteSave(projected) : projected
  return JSON.stringify(stableValue(value))
}

export function reconcileWebsiteDraft(current: WebsiteSave | null, submittedSignature: string, result: WebsiteState): WebsiteSave {
  if (!current || websiteDraftSignature(current, false) === submittedSignature) {
    return { slug: result.slug, content: result.content, expected_draft_revision: result.draft_revision }
  }
  // Compare raw content here: even a trailing space typed during the request
  // is a newer edit and must survive. The next save uses the new revision.
  return { ...current, expected_draft_revision: result.draft_revision }
}
