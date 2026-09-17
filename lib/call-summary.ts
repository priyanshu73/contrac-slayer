/**
 * Prepare an AI call summary for a description-refinement surface.
 *
 * The original summary remains the source of truth in call history. This only
 * removes presentation and call-log narration before the text is shown as the
 * input to the description refiner.
 */
export function stripMarkdownBold(text: string): string {
  return text.replace(/\*\*([^*]*)\*\*/g, "$1").replace(/\*\*/g, "")
}

export function callSummaryToDescription(text?: string): string {
  if (!text) return ""

  return stripMarkdownBold(text)
    .replace(/^\s*(?:call summary|ai summary|summary)\s*:?\s*/i, "")
    .replace(
      /^\s*(?:(?:the\s+)?customer|caller|[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*){0,3})\s+called\s+(?:regarding|about|to discuss|to inquire about)\s+/i,
      "",
    )
    .trim()
}
