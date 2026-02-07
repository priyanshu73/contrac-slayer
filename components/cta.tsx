'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useReferral, buildSignupUrl } from '@/contexts/ReferralContext'

export function CTA() {
  const locale = useLocale()
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

  return (
    <section className="py-24 px-4 bg-primary/5">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
          Ready to Transform Your Contracting Business?
        </h2>
        <p className="text-xl text-muted-foreground mb-10 text-balance max-w-2xl mx-auto">
          Join thousands of contractors who are closing more deals and saving time with ContractorOps AI
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="text-base px-8 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <Link href={signupUrl}>
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base px-8" asChild>
            <a href="https://cal.com/johnson-subedi/30min" target="_blank" rel="noopener noreferrer">
              Schedule a Demo
            </a>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          14-day free trial • Cancel anytime
        </p>
      </div>
    </section>
  )
}
