"use client"

import { Zap } from "lucide-react"
import { useTranslations } from "next-intl"
import { PRICING_OFFER } from "@/lib/pricing-offer"
import { PricingCountdown } from "@/components/pricing-countdown"

export function PricingPromo() {
  const t = useTranslations("billing")

  return (
    <div className="flex flex-col items-center gap-3 mb-6">
      <style>{`
        @keyframes pricingPromoShift {
          from { background-position: 0% 50%; }
          to { background-position: 200% 50%; }
        }
        .pricing-promo-ribbon {
          background: linear-gradient(100deg, oklch(0.55 0.18 240), oklch(0.62 0.2 280), oklch(0.55 0.18 240));
          background-size: 200% 100%;
          animation: pricingPromoShift 4s linear infinite;
          box-shadow: 0 4px 18px oklch(0.55 0.18 240 / 0.25);
        }
        @media (prefers-reduced-motion: reduce) {
          .pricing-promo-ribbon { animation: none; }
        }
      `}</style>
      <div className="pricing-promo-ribbon inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold tracking-wide text-white">
        <Zap className="h-4 w-4 fill-current" aria-hidden="true" />
        <span>{t("salePromoBadge")}</span>
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {t("salePromoDescription", { percent: PRICING_OFFER.yearlySavingsPercent })}
      </p>
      <PricingCountdown />
    </div>
  )
}
