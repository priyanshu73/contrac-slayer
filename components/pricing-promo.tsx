"use client"

import { Zap } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { PRICING_OFFER } from "@/lib/pricing-offer"
import { PricingCountdown } from "@/components/pricing-countdown"
import { PricingPromoStyles } from "@/components/pricing-promo-styles"

export function PricingPromo({ children }: { children?: ReactNode }) {
  const t = useTranslations("billing")

  return (
    <div>
      <PricingPromoStyles />
      <div className="launch-ribbon inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-full text-sm font-bold tracking-wide mb-6">
        <Zap className="h-4 w-4 fill-current" aria-hidden="true" />
        <span>{t("salePromoBadge")}</span>
      </div>
      {children}
      <p className="text-sm font-medium text-muted-foreground mb-7">
        {t("salePromoDescription", { percent: PRICING_OFFER.yearlySavingsPercent })}
      </p>
      <PricingCountdown />
    </div>
  )
}
