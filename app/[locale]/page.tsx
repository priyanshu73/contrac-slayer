"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { HeroSection } from '@/components/ui/hero-section-2'
import { Features } from '@/components/features'
import { Pricing } from '@/components/pricing'
import { CTA } from '@/components/cta'
import { Header } from '@/components/header'
import { HowItWorks } from '@/components/how-it-works'
import { useLocale } from 'next-intl'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const locale = useLocale()

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
      <div className="h-full">
        <Header />
        <HeroSection
          backgroundImage="/hero.png"
          contactInfo={{ website: "yourwebsite.com", phone: "+1 (555) 123-4567", address: "20 Fieldstone Dr, Roswell, GA" }}
        />
        <HowItWorks />
        <Features />
        <Pricing />
        <CTA />
      </div>
    )
  }

  // Return null while redirecting (shouldn't be visible)
  return null
}


