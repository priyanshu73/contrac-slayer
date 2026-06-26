import type {
  ClientPortalInvoice,
  ClientPortalProposalItem,
  ClientPortalQuoteItem,
} from "@/lib/types"
import type { ClientDocumentView } from "@/components/client-document-nav"

/** First shareable proposal URL for this client (prefers an explicit public link when provided). */
export function resolveProposalNavUrl(
  proposals: ClientPortalProposalItem[],
  locale: string,
  preferredPublicLink?: string | null
): string | undefined {
  const available = proposals.filter((p) => p.public_link)
  if (!available.length) {
    return preferredPublicLink ? `/${locale}/proposals/${preferredPublicLink}` : undefined
  }
  const match = preferredPublicLink
    ? available.find((p) => p.public_link === preferredPublicLink)
    : undefined
  const pick = match ?? available[0]
  return pick.public_link ? `/${locale}/proposals/${pick.public_link}` : undefined
}

/** First shareable quote URL for this client (prefers an explicit public link when provided). */
export function resolveQuoteNavUrl(
  quotes: ClientPortalQuoteItem[],
  locale: string,
  preferredPublicLink?: string | null
): string | undefined {
  const available = quotes.filter((q) => q.quote_public_link)
  if (!available.length) {
    return preferredPublicLink ? `/${locale}/quotes/${preferredPublicLink}` : undefined
  }
  const match = preferredPublicLink
    ? available.find((q) => q.quote_public_link === preferredPublicLink)
    : undefined
  const pick = match ?? available[0]
  return pick.quote_public_link ? `/${locale}/quotes/${pick.quote_public_link}` : undefined
}

/** First shareable invoice URL for this client (per-document public link, like quotes/proposals). */
export function resolveInvoiceNavUrl(
  invoices: ClientPortalInvoice[],
  locale: string,
  preferredPublicLink?: string | null
): string | undefined {
  const available = invoices.filter((inv) => inv.public_link)
  if (!available.length) {
    return preferredPublicLink ? `/${locale}/invoices/${preferredPublicLink}` : undefined
  }
  const match = preferredPublicLink
    ? available.find((inv) => inv.public_link === preferredPublicLink)
    : undefined
  const pick = match ?? available[0]
  return pick.public_link ? `/${locale}/invoices/${pick.public_link}` : undefined
}

/** Link back to the portal hub, used when a client has multiple siblings of one type. */
export function clientPortalUrl(locale: string, token?: string | null): string | undefined {
  return token ? `/${locale}/client/${token}` : undefined
}

export type ClientDocumentNavProps = {
  hasQuote: boolean
  quoteUrl?: string
  hasProposal: boolean
  proposalUrl?: string
  hasInvoice: boolean
  invoiceUrl?: string
}

type BuildNavArgs = {
  locale: string
  portalToken?: string | null
  activeView: ClientDocumentView
  documents: {
    quotes: ClientPortalQuoteItem[]
    proposals: ClientPortalProposalItem[]
    invoices: ClientPortalInvoice[]
  }
  /** Public link / id of the document currently being viewed, so its own nav item deep-links to itself. */
  preferred?: {
    quotePublicLink?: string | null
    proposalPublicLink?: string | null
    invoicePublicLink?: string | null
  }
}

/**
 * Single source of truth for the client document sidebar links, shared by the
 * quote / proposal / invoice viewers. For each document type:
 *   - 0 items            -> no link (sidebar shows a greyed "No X")
 *   - 1 item             -> deep link straight to it
 *   - >1 items, inactive -> route to the portal hub so the client disambiguates
 * The currently-active document always deep-links to itself via `preferred`.
 */
export function buildClientDocumentNavProps({
  locale,
  portalToken,
  activeView,
  documents,
  preferred,
}: BuildNavArgs): ClientDocumentNavProps {
  const portalHref = clientPortalUrl(locale, portalToken)
  const { quotes, proposals, invoices } = documents

  // For each type:
  //  - the active document always deep-links to itself (it exists - we're viewing
  //    it - even if the portal list hasn't surfaced it yet, e.g. a draft);
  //  - an explicit `preferred` link that points at a known document deep-links to
  //    it (e.g. an invoice -> its originating quote), even amid siblings;
  //  - otherwise: 0 items -> none, 1 item -> deep link, many -> the portal hub so
  //    the client disambiguates.
  const resolve = (
    view: ClientDocumentView,
    items: unknown[],
    hasPreferred: boolean,
    deepLink: () => string | undefined
  ): { has: boolean; url?: string } => {
    if (activeView === view) return { has: true, url: deepLink() }
    if (!items.length) return { has: false, url: undefined }
    if (items.length > 1 && !hasPreferred) return { has: true, url: portalHref }
    return { has: true, url: deepLink() }
  }

  const quote = resolve("quote", quotes, Boolean(preferred?.quotePublicLink), () =>
    resolveQuoteNavUrl(quotes, locale, preferred?.quotePublicLink)
  )
  const proposal = resolve(
    "proposal",
    proposals,
    Boolean(preferred?.proposalPublicLink),
    () => resolveProposalNavUrl(proposals, locale, preferred?.proposalPublicLink)
  )
  const invoice = resolve("invoice", invoices, Boolean(preferred?.invoicePublicLink), () =>
    resolveInvoiceNavUrl(invoices, locale, preferred?.invoicePublicLink)
  )

  return {
    hasQuote: quote.has,
    quoteUrl: quote.url,
    hasProposal: proposal.has,
    proposalUrl: proposal.url,
    hasInvoice: invoice.has,
    invoiceUrl: invoice.url,
  }
}
