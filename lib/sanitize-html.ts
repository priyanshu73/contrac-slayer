import DOMPurify from "isomorphic-dompurify"

/**
 * Sanitize contractor- or AI-authored rich-text HTML before it is injected into
 * the DOM (edit hydration or read-only render). The proposal document stores raw
 * HTML strings produced by the rich-text editor and the AI generator; that HTML
 * is rendered verbatim on the PUBLIC, unauthenticated proposal page, so it must
 * be stripped of scripts, event handlers, and dangerous URIs first.
 *
 * DOMPurify's defaults already allow the formatting the editor emits
 * (b/strong, i/em, u, s, h2, p, ul/ol/li, br, a…) while removing <script>,
 * on* handlers, and javascript:/data: URIs. We only tighten link handling.
 */
export function sanitizeProposalHtml(html: string | null | undefined): string {
  if (!html) return ""
  // Keep the inline `style` attribute (DOMPurify sanitizes its CSS, dropping
  // expression()/url(javascript:)) so AI/editor formatting survives, but drop
  // the <style> element and interactive form controls entirely.
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
  })
}
