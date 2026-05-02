"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useReferral, buildSignupUrl } from "@/contexts/ReferralContext"

export function Pricing() {
  const locale = useLocale()
  const t = useTranslations("landing")
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

  const plans = [
    {
      name: t("monthly"),
      description: t("monthlyDesc"),
      price: "$139",
      note: t("pricingPlanFlexible"),
      featured: false,
    },
    {
      name: t("yearly"),
      description: t("yearlyDesc"),
      price: "$99",
      note: t("billedAnnually"),
      featured: true,
    },
  ]

  return (
    <section id="pricing" className="scroll-mt-20 bg-[#fbf6f1] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{t("pricingTitle")}</h2>
          <p className="mt-4 text-lg text-slate-600">{t("pricingSubtitle")}</p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-[2rem] p-6 ${
                plan.featured
                  ? "bg-[#26313d] text-white shadow-[0_28px_90px_rgba(38,49,61,0.18)]"
                  : "border border-slate-200 bg-white text-slate-950"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black">{plan.name}</h3>
                  <p className={`mt-2 text-sm ${plan.featured ? "text-slate-300" : "text-slate-500"}`}>
                    {plan.description}
                  </p>
                </div>
                {plan.featured && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">
                    {t("bestValue")}
                  </span>
                )}
              </div>

              <div className="mt-10 flex items-end gap-1">
                <span className="text-6xl font-black tracking-tight">{plan.price}</span>
                <span className={`pb-2 text-sm font-bold ${plan.featured ? "text-slate-300" : "text-slate-500"}`}>
                  {t("perMonth")}
                </span>
              </div>
              <p className={`mt-3 min-h-5 text-sm ${plan.featured ? "text-slate-400" : "text-slate-500"}`}>
                {plan.note}
              </p>

              <Button
                size="lg"
                className={`mt-8 h-12 w-full rounded-full ${
                  plan.featured ? "bg-white text-[#26313d] hover:bg-slate-100" : "bg-[#26313d] text-white hover:bg-[#202a34]"
                }`}
                asChild
              >
                <Link href={signupUrl}>{t("startFreeTrial")}</Link>
              </Button>
            </article>
          ))}
        </div>

        <p className="mt-6 text-center text-sm font-semibold text-slate-500">{t("pricingTrialCancel")}</p>
      </div>
    </section>
  )
}
