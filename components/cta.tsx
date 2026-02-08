'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useTranslations } from 'next-intl'
import { useReferral, buildSignupUrl } from '@/contexts/ReferralContext'

export function CTA() {
  const locale = useLocale()
  const t = useTranslations('landing')
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

  return (
    <section className="py-14 px-4 sm:py-20 md:py-24 bg-white dark:bg-background">
      <div className="container mx-auto max-w-4xl text-center px-2 sm:px-4">
        <h2 className="text-2xl font-bold mb-4 text-balance sm:text-3xl md:text-5xl md:mb-6">
          {t('ctaTitle')}
        </h2>
        <p className="text-base text-muted-foreground mb-8 text-balance max-w-2xl mx-auto sm:text-lg md:text-xl md:mb-10">
          {t('ctaSubtitle')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center max-w-sm mx-auto sm:max-w-none">
          <Button size="lg" className="w-full sm:w-auto text-base px-6 py-6 sm:px-8 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <Link href={signupUrl}>
              {t('ctaStartTrial')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-6 py-6 sm:px-8" asChild>
            <a href="https://cal.com/johnson-subedi/30min" target="_blank" rel="noopener noreferrer">
              {t('ctaScheduleDemo')}
            </a>
          </Button>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          {t('ctaTrialCancel')}
        </p>
      </div>
    </section>
  )
}
