// Display configuration only. Checkout prices are configured separately in Stripe.
const monthly = 100
const yearly = 900

export const PRICING_OFFER = {
  monthly,
  yearly,
  yearlyMonthlyEquivalent: yearly / 12,
  yearlySavings: monthly * 12 - yearly,
  yearlySavingsPercent: (1 - yearly / (monthly * 12)) * 100,
} as const

// Both billing periods provide the same product features.
export const PRICING_FEATURE_KEYS = [
  "outboundEmailingAndLeadGeneration",
  "projectManagement",
  "aiReceptionist",
  "leadTracking",
  "aiQuoteGeneration",
  "quotesAndInvoices",
  "clientManagement",
  "calendarIntegration",
  "emailNotifications",
  "mobileFriendly",
] as const
