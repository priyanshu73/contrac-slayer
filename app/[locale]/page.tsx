"use client"

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { HeroSection } from '@/components/ui/hero-section-2'
import { Features } from '@/components/features'
import { Pricing } from '@/components/pricing'
import { CTA } from '@/components/cta'
import { Header } from '@/components/header'
import { LandingFooter } from '@/components/landing-footer'
import { LandingScrollContainer } from '@/components/landing-scroll-container'
import { LandingSection } from '@/components/landing-section'
import { useLocale, useTranslations } from 'next-intl'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('landing')

  const sections = useMemo(
    () => [
      { id: 'hero', label: t('sectionHero') ?? 'Home' },
      { id: 'features', label: t('sectionFeatures') ?? 'Features' },
      { id: 'pricing', label: t('sectionPricing') ?? 'Pricing' },
      { id: 'cta', label: t('sectionCta') ?? 'Get Started' },
    ],
    [t],
  )

  useEffect(() => {
    // Redirect to dashboard if user is logged in
    if (!loading && user) {
      router.push(`/${locale}/dashboard`)
    }
  }, [user, loading, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show landing page if not logged in
  if (!user) {
    return (
      <div className="h-full min-h-screen bg-[#fbf6f1]">
        <Header />
        <LandingScrollContainer sections={sections}>
          <LandingSection id="hero">
            <HeroSection
              backgroundImage="/hero2.webp"
              mobileBackgroundImage="/hero2.webp"
              contactInfo={{ website: "www.contractorops.ai", phone: "+1 (555) 123-4567", address: "20 Fieldstone Dr, Roswell, GA" }}
            />
          </LandingSection>
          <LandingSection id="features">
            <Features />
          </LandingSection>
          <LandingSection id="pricing" className="landing-section-pricing">
            <Pricing />
          </LandingSection>
          <LandingSection id="cta" className="landing-section-cta">
            <CTA />
          </LandingSection>
          <LandingFooter />
        </LandingScrollContainer>
      </div>
    )
  }

  // Return null while redirecting (shouldn't be visible)
  return null
}
