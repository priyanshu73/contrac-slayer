import type { ClientPortalProposalItem, ClientPortalQuoteItem } from "@/lib/types"

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
