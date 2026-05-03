'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReferral, buildSignupUrl } from '@/contexts/ReferralContext'

export function CTA() {
  const locale = useLocale()
  const t = useTranslations('landing')
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

  return (
    <section className="bg-[#fbf6f1] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-600">{t('ctaKicker')}</p>
        <h2 className="mt-5 text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
          {t('ctaTitle')}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-slate-600">
          {t('ctaSubtitle')}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="h-12 rounded-full bg-[#26313d] px-6 text-base text-white hover:bg-[#202a34]" asChild>
            <Link href={signupUrl}>
              {t('ctaStartTrial')}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="ghost" className="h-12 rounded-full px-6 text-base text-slate-700 hover:bg-slate-100" asChild>
            <a href="https://cal.com/johnson-subedi/30min" target="_blank" rel="noopener noreferrer">
              {t('ctaScheduleDemo')}
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
