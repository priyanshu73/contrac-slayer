"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { LandingLoader } from '@/components/landing-loader'
import { useLocale, useTranslations } from 'next-intl'

/** Flip to true to re-enable the hammer loader animation */
const SHOW_LANDING_LOADER = false;

const LOADER_SEEN_KEY = 'landing-loader-seen'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('landing')

  const loaderEnabled = SHOW_LANDING_LOADER
  const [animationDone, setAnimationDone] = useState(!loaderEnabled)
  const [exiting, setExiting] = useState(false)
  const [unmountLoader, setUnmountLoader] = useState(!loaderEnabled)
  const [showLoader, setShowLoader] = useState(loaderEnabled)

  const sections = useMemo(
    () => [
      { id: 'hero', label: t('sectionHero') ?? 'Home' },
      { id: 'features', label: t('sectionFeatures') ?? 'Features' },
      { id: 'pricing', label: t('sectionPricing') ?? 'Pricing' },
      { id: 'cta', label: t('sectionCta') ?? 'Get Started' },
    ],
    [t],
  )

  // Loader lifecycle (only runs when SHOW_LANDING_LOADER is true)
  useEffect(() => {
    if (!loaderEnabled) return

    const alreadySeen = sessionStorage.getItem(LOADER_SEEN_KEY)
    if (alreadySeen) {
      setShowLoader(false)
      setAnimationDone(true)
      setUnmountLoader(true)
      return
    }

    sessionStorage.setItem(LOADER_SEEN_KEY, '1')
    const timer = setTimeout(() => setAnimationDone(true), 2900)
    return () => clearTimeout(timer)
  }, [loaderEnabled])

  useEffect(() => {
    if (!loading && user) {
      router.push(`/${locale}/dashboard`)
    }
  }, [user, loading, router, locale])

  useEffect(() => {
    if (animationDone && !loading && showLoader) {
      setExiting(true)
    }
  }, [animationDone, loading, showLoader])

  const handleCurtainDone = useCallback(() => setUnmountLoader(true), [])

  // Redirect in progress
  if (!loading && user) return null

  return (
    <>
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

      {/* Loader overlay — only active when SHOW_LANDING_LOADER = true */}
      {showLoader && !unmountLoader && (
        <LandingLoader exiting={exiting} onCurtainDone={handleCurtainDone} />
      )}
    </>
  )
}
