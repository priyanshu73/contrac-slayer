"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Sparkles } from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { useReferral, buildSignupUrl } from "@/contexts/ReferralContext"

export function Pricing() {
  const locale = useLocale()
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

  const basicFeatures = [
    "AI-Powered Quote Generation",
    "Client Management",
    "Lead Tracking & CRM",
    "Calendar Integration",
    "Email Notifications",
  ]

  const premiumFeatures = [
    "AI-Powered Quote Generation",
    "Client Management",
    "Lead Tracking & CRM",
    "Calendar Integration",
    "Email Notifications",
    "Social Lead Capture",
    "On-Site Meeting Recording",
  ]

  return (
    <section id="pricing" className="py-24 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            14-Day Free Trial
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start your free trial today.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <Card className="p-8 relative">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold mb-2">Monthly</h3>
              <p className="text-muted-foreground">
                Flexible month-to-month billing
              </p>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold">$139</span>
                <span className="text-muted-foreground text-lg">/month</span>
              </div>
            </div>

            <Button 
              className="w-full mb-8" 
              size="lg"
              variant="outline"
              asChild
            >
              <Link href={signupUrl}>
                Start Free Trial
              </Link>
            </Button>

            <ul className="space-y-4">
              {basicFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Yearly Plan */}
          <Card className="p-8 relative border-primary border-2 bg-primary/5">
            {/* Best Value Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-primary text-primary-foreground px-5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap shadow-lg">
                Best Value - Save $480/year
              </span>
            </div>

            <div className="mb-6 pt-2">
              <h3 className="text-2xl font-semibold mb-2">Yearly</h3>
              <p className="text-muted-foreground">
                Save 29% with annual billing
              </p>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold">$99</span>
                <span className="text-muted-foreground text-lg">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Billed annually ($1,188/year)
              </p>
            </div>

            <Button 
              className="w-full mb-8" 
              size="lg"
              asChild
            >
              <Link href={signupUrl}>
                Start Free Trial
              </Link>
            </Button>

            <ul className="space-y-4">
              {premiumFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Trust badges */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}
