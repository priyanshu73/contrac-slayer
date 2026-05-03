"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useReferral, buildSignupUrl } from "@/contexts/ReferralContext"

export function Pricing() {
  const locale = useLocale()
  const t = useTranslations("landing")
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

  const coreFeatures = [
    t("pricingBasic1"),
    t("pricingBasic2"),
    t("pricingBasic3"),
    t("pricingBasic4"),
    t("pricingBasic5"),
    t("pricingWebsite"),
  ]

  const yearlyExtras = [
    t("pricingPremium6"),
    t("pricingPremium7"),
    t("pricingPremium8"),
    t("pricingPremium9"),
  ]

  const plans = [
    {
      name: t("monthly"),
      description: t("monthlyDesc"),
      price: "$139",
      note: t("pricingPlanFlexible"),
      featured: false,
      features: coreFeatures,
      featureTitle: t("pricingMonthlyIncludesTitle"),
      accentNote: null,
    },
    {
      name: t("yearly"),
      description: t("yearlyDesc"),
      price: "$99",
      note: t("billedAnnually"),
      featured: true,
      features: coreFeatures,
      featureTitle: t("pricingYearlyIncludesTitle"),
      accentNote: t("pricingYearlyBonusTitle"),
      extras: yearlyExtras,
    },
  ]

  return (
    <section id="pricing" className="scroll-mt-20 bg-[#fbf6f1] px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{t("pricingTitle")}</h2>
          <p className="mt-3 text-lg text-slate-600">{t("pricingSubtitle")}</p>
        </div>

        <div className="mt-10 grid items-start gap-5 lg:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-[2rem] p-6 lg:p-7 ${
                plan.featured
                  ? "border-2 border-sky-500 bg-sky-50/80 text-slate-950 shadow-[0_24px_90px_rgba(14,165,233,0.14)]"
                  : "border border-slate-200 bg-white text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
              }`}
            >
              {plan.featured && (
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500 px-5 py-2 text-sm font-black text-white shadow-[0_12px_28px_rgba(14,165,233,0.3)]">
                  {t("bestValue")}
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black sm:text-3xl">{plan.name}</h3>
                  <p className="mt-2 text-base text-slate-500">
                    {plan.description}
                  </p>
                </div>
              </div>

              <div className="mt-10 flex items-end gap-2">
                <span className="text-5xl font-black tracking-tight sm:text-6xl">{plan.price}</span>
                <span className="pb-2 text-sm font-bold text-slate-500">
                  {t("perMonth")}
                </span>
              </div>
              <p className="mt-3 min-h-5 text-sm text-slate-500">
                {plan.note}
              </p>

              <Button
                size="lg"
                className={`mt-7 h-11 w-full rounded-full ${
                  plan.featured ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
                asChild
              >
                <Link href={signupUrl}>{t("startFreeTrial")}</Link>
              </Button>

              <div className="mt-8 rounded-[1.5rem] bg-white/70 p-4 ring-1 ring-slate-200/70">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
                  {plan.featureTitle}
                </p>
                <ul className="mt-4 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-base leading-7 text-slate-900">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.featured && plan.extras && plan.extras.length > 0 ? (
                <div className="mt-5 rounded-[1.5rem] bg-[#26313d] p-4 text-white shadow-[0_18px_50px_rgba(38,49,61,0.18)]">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-sky-300">
                    {plan.accentNote}
                  </p>
                  <ul className="mt-4 space-y-3">
                    {plan.extras.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-100 sm:text-base">
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-sky-300">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        <p className="mt-5 text-center text-sm font-semibold text-slate-500">{t("pricingTrialCancel")}</p>
      </div>
    </section>
  )
}
