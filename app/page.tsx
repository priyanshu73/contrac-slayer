import { HeroSection } from '@/components/ui/hero-section-2'
import { Features } from '@/components/features'
import { CTA } from '@/components/cta'
import { Header } from '@/components/header'
import { HowItWorks } from '@/components/how-it-works'

export default function Home() {
  return (
    <div className="h-full">
      <Header />
      <HeroSection
        backgroundImage="/hero.png"
        contactInfo={{ website: "yourwebsite.com", phone: "+1 (555) 123-4567", address: "20 Fieldstone Dr, Roswell, GA" }}
      />
      <HowItWorks />
      <Features />
      <CTA />
    </div>
  )
}


