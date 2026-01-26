"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Sparkles, Zap, Shield, Clock } from "lucide-react"

export default function BillingPage() {
  const locale = useLocale()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState<"monthly" | "yearly" | null>(null)
  const [error, setError] = useState("")

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    setIsLoading(plan)
    setError("")

    try {
      const baseUrl = window.location.origin
      const result = await api.createCheckoutSession({
        plan,
        success_url: `${baseUrl}/${locale}/billing/success`,
        cancel_url: `${baseUrl}/${locale}/billing`,
      })

      // Redirect to Stripe Checkout
      window.location.href = result.url
    } catch (err: any) {
      setError(err.message || "Failed to start checkout")
      setIsLoading(null)
    }
  }

  const features = [
    "AI-Powered Quote Generation",
    "Real-time Material Pricing",
    "Unlimited Quotes & Invoices",
    "Client Management",
    "Lead Tracking & CRM",
    "Calendar Integration",
    "Email Notifications",
    "Mobile Friendly",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-24 md:pb-6">
      <main className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            14-Day Free Trial
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Start Growing Your Business
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get full access to all features. Cancel anytime. No credit card charged during trial.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {/* Monthly Plan */}
          <Card className="p-6 md:p-8 relative">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Monthly</h2>
              <p className="text-muted-foreground text-sm">
                Flexible month-to-month billing
              </p>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$139</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>

            <Button 
              className="w-full mb-6" 
              size="lg"
              variant="outline"
              onClick={() => handleSubscribe("monthly")}
              disabled={isLoading !== null}
            >
              {isLoading === "monthly" ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </span>
              ) : (
                "Start Free Trial"
              )}
            </Button>

            <ul className="space-y-3">
              {features.slice(0, 4).map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>

          {/* Yearly Plan */}
          <Card className="p-6 md:p-8 relative border-primary bg-primary/5">
            {/* Best Value Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Best Value - Save $480/year
              </span>
            </div>

            <div className="mb-6 pt-2">
              <h2 className="text-xl font-semibold mb-2">Yearly</h2>
              <p className="text-muted-foreground text-sm">
                Save 29% with annual billing
              </p>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Billed annually ($1,188/year)
              </p>
            </div>

            <Button 
              className="w-full mb-6" 
              size="lg"
              onClick={() => handleSubscribe("yearly")}
              disabled={isLoading !== null}
            >
              {isLoading === "yearly" ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </span>
              ) : (
                "Start Free Trial"
              )}
            </Button>

            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">14-Day Free Trial</h3>
            <p className="text-sm text-muted-foreground">
              Full access to all features during your trial
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Cancel Anytime</h3>
            <p className="text-sm text-muted-foreground">
              No long-term contracts or commitments
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Secure Payments</h3>
            <p className="text-sm text-muted-foreground">
              Powered by Stripe for your security
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
