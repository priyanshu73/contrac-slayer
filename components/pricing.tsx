"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Sparkles } from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"
import { useReferral, buildSignupUrl } from "@/contexts/ReferralContext"

export function Pricing() {
  const locale = useLocale()
  const t = useTranslations('landing')
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

  const basicFeatures = [
    t('pricingBasic1'),
    t('pricingBasic2'),
    t('pricingBasic3'),
    t('pricingBasic4'),
    t('pricingBasic5'),
    t('pricingWebsite'),
  ]

  const premiumFeatures = [
    t('pricingBasic1'),
    t('pricingBasic2'),
    t('pricingBasic3'),
    t('pricingBasic4'),
    t('pricingBasic5'),
    t('pricingWebsite'),
    t('pricingPremium6'),
    t('pricingPremium7'),
  ]

  return (
    <section id="pricing" className="py-14 px-4 sm:py-20 md:py-24 bg-background">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-3 md:mb-4">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('pricingTrialBadge')}
          </div>
          <h2 className="text-2xl font-bold mb-3 sm:text-3xl md:text-5xl md:mb-4">
            {t('pricingTitle')}
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto sm:text-lg md:text-xl">
            {t('pricingSubtitle')}
          </p>
        </div>

        {/* Pricing Cards: single column on mobile, side-by-side on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <Card className="p-5 sm:p-6 md:p-8 relative">
            <div className="mb-4 md:mb-6">
              <h3 className="text-xl sm:text-2xl font-semibold mb-1 md:mb-2">{t('monthly')}</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('monthlyDesc')}
              </p>
            </div>
            
            <div className="mb-6 md:mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-bold">$139</span>
                <span className="text-muted-foreground text-base sm:text-lg">{t('perMonth')}</span>
              </div>
            </div>

            <Button 
              className="w-full mb-6 md:mb-8 py-6 sm:py-6" 
              size="lg"
              variant="outline"
              asChild
            >
              <Link href={signupUrl}>
                {t('startFreeTrial')}
              </Link>
            </Button>

            <ul className="space-y-3 sm:space-y-4">
              {basicFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm sm:text-base">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Yearly Plan */}
          <Card className="p-5 sm:p-6 md:p-8 relative border-primary border-2 bg-primary/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 md:-top-4">
              <span className="bg-primary text-primary-foreground px-3 py-1 sm:px-5 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap shadow-lg">
                {t('bestValue')}
              </span>
            </div>

            <div className="mb-4 pt-4 md:mb-6 md:pt-2">
              <h3 className="text-xl sm:text-2xl font-semibold mb-1 md:mb-2">{t('yearly')}</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('yearlyDesc')}
              </p>
            </div>
            
            <div className="mb-6 md:mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-bold">$99</span>
                <span className="text-muted-foreground text-base sm:text-lg">{t('perMonth')}</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {t('billedAnnually')}
              </p>
            </div>

            <Button 
              className="w-full mb-6 md:mb-8 py-6 sm:py-6" 
              size="lg"
              asChild
            >
              <Link href={signupUrl}>
                {t('startFreeTrial')}
              </Link>
            </Button>

            <ul className="space-y-3 sm:space-y-4">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm sm:text-base">
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="mt-8 md:mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            {t('pricingTrialCancel')}
          </p>
        </div>
      </div>
    </section>
  )
}
