import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { createTranslator } from "next-intl"
import { PRICING_FEATURE_KEYS, PRICING_OFFER } from "../lib/pricing-offer"

test("simple offer is $100 monthly or $900 annually with accurate savings", () => {
  assert.deepEqual(PRICING_OFFER, {
    monthly: 100,
    regularMonthly: 139,
    monthlySavings: 39,
    yearly: 900,
    yearlyMonthlyEquivalent: 75,
    yearlySavings: 300,
    yearlySavingsPercent: 25,
  })
})

test("public pricing and billing share prices, features and sale styling without introductory terms", () => {
  for (const file of ["components/pricing.tsx", "app/[locale]/billing/page.tsx"]) {
    const page = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
    assert.match(page, /PRICING_OFFER\.monthly/)
    assert.match(page, /PRICING_OFFER\.yearlyMonthlyEquivalent/)
    assert.match(page, /PRICING_OFFER\.yearly/)
    assert.match(page, /PRICING_FEATURE_KEYS\.map/)
    assert.match(page, /<PricingPromo \/>/)
    assert.match(page, /PRICING_OFFER\.regularMonthly/)
    assert.match(page, /line-through/)
    assert.doesNotMatch(page, /monthlyIntroTerm|monthlyAfterIntro|yearlyExclusive|pricingPremium|pricingWebsite|features\.slice/)
  }
})

test("sale ribbon has localized trial/savings and a transparently resetting countdown", () => {
  const promo = readFileSync(new URL("../components/pricing-promo.tsx", import.meta.url), "utf8")
  assert.match(promo, /prefers-reduced-motion/)
  assert.match(promo, /PRICING_OFFER\.yearlySavingsPercent/)
  assert.match(promo, /<PricingCountdown \/>/)
  const countdown = readFileSync(new URL("../components/pricing-countdown.tsx", import.meta.url), "utf8")
  assert.match(countdown, /48 \* 60 \* 60 \* 1000/)
  assert.match(countdown, /now % CYCLE_MS/)
  assert.match(countdown, /saleCountdownReset/)
  assert.doesNotMatch(countdown, /Price lock expires|Ends in|Limited Offer/)
  for (const locale of ["en", "es"]) {
    const messages = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"))
    const t = createTranslator({ locale, messages, namespace: "billing" })
    assert.ok(t("salePromoBadge"))
    assert.match(t("salePromoDescription", { percent: PRICING_OFFER.yearlySavingsPercent }), /14.*25%/)
    assert.match(t("monthlySavings", { amount: PRICING_OFFER.monthlySavings }), /\$39/)
  }
})

test("English and Spanish render the annual total, savings and every supported feature", () => {
  for (const locale of ["en", "es"]) {
    const messages = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"))
    const { billing } = messages
    const t = createTranslator({ locale, messages, namespace: "billing" })
    assert.match(t("billedAnnually", { amount: PRICING_OFFER.yearly }), /\$900/)
    assert.match(t("yearlySavings", { amount: PRICING_OFFER.yearlySavings, percent: PRICING_OFFER.yearlySavingsPercent }), /\$300.*25%/)
    for (const key of PRICING_FEATURE_KEYS) {
      assert.ok(billing.features[key], `${locale} missing feature ${key}`)
      assert.ok(t(`features.${key}`))
    }
    assert.doesNotMatch(JSON.stringify(billing), /139|1,020|first 3 months|primeros 3 meses|Real-time|Ilimitadas|Unlimited/)
    assert.match(billing.freeTrial, /14/) // Existing frontend trial copy is unchanged.
  }
  const { billing } = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf8"))
  assert.equal(billing.features.outboundEmailingAndLeadGeneration, "Outbound Emailing and Lead Generation")
  assert.equal(billing.features.projectManagement, "Project Management")
  assert.equal(billing.features.aiReceptionist, "AI Receptionist")
  assert.equal(billing.features.leadTracking, "Lead Tracking & CRM")
})
