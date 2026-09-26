"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Zap } from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { useReferral, buildSignupUrl } from "@/contexts/ReferralContext"
import { PricingCountdown } from "@/components/pricing-countdown"

export function Pricing() {
  const locale = useLocale()
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

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
    <section id="pricing" className="py-24 px-4 bg-background">
      <style>{`
        @keyframes launchRibbonShift {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes diagonalStrikeDraw {
          from { transform: rotate(-14deg) scaleX(0); }
          to { transform: rotate(-14deg) scaleX(1); }
        }
        @keyframes promoPriceShine {
          0%, 55% { background-position: 110% 0; }
          85%, 100% { background-position: -60% 0; }
        }
        .launch-ribbon {
          background: linear-gradient(100deg, oklch(0.55 0.18 240), oklch(0.62 0.2 280), oklch(0.55 0.18 240));
          background-size: 200% 100%;
          animation: launchRibbonShift 4s linear infinite;
          box-shadow: 0 4px 18px oklch(0.55 0.18 240 / 0.35);
        }
        .diagonal-strike {
          position: relative;
        }
        .diagonal-strike::after {
          content: "";
          position: absolute;
          left: -8%;
          top: 50%;
          width: 116%;
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(90deg, oklch(0.58 0.22 27), oklch(0.62 0.24 27));
          transform-origin: left center;
          transform: rotate(-14deg);
          animation: diagonalStrikeDraw 0.7s cubic-bezier(0.6, 0, 0.2, 1) backwards;
          box-shadow: 0 0 6px oklch(0.58 0.22 27 / 0.4);
        }
        .diagonal-strike.strike-delay-1::after { animation-delay: 0.35s; }
        .diagonal-strike.strike-delay-2::after { animation-delay: 0.65s; }
        .diagonal-strike-sm {
          position: relative;
        }
        .diagonal-strike-sm::after {
          content: "";
          position: absolute;
          left: -6%;
          top: 52%;
          width: 112%;
          height: 2px;
          border-radius: 2px;
          background: oklch(0.58 0.22 27 / 0.8);
          transform: rotate(-10deg);
        }
        .shine-price {
          background: linear-gradient(100deg, var(--foreground) 40%, oklch(0.55 0.18 240) 50%, var(--foreground) 60%);
          background-size: 250% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: promoPriceShine 5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .launch-ribbon,
          .diagonal-strike::after,
          .shine-price {
            animation: none !important;
          }
          .shine-price {
            background: none;
            color: var(--foreground);
          }
        }
      `}</style>
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="launch-ribbon inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-full text-sm font-bold tracking-wide mb-6">
            <Zap className="h-4 w-4 fill-current" />
            Launch Sale - limited-time promo pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-7">
            Start your free trial today.
          </p>
          <PricingCountdown />
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-9 max-w-[960px] mx-auto items-start">
          {/* Monthly Plan */}
          <Card className="p-10 relative">
            <div className="mb-9">
              <h3 className="text-2xl font-semibold mb-2">Monthly</h3>
              <p className="text-muted-foreground">
                Flexible month-to-month billing
              </p>
            </div>

            <div className="flex items-baseline gap-3 mb-2.5">
              <span className="diagonal-strike strike-delay-1 text-2xl font-semibold text-muted-foreground">
                $139
              </span>
              <span className="shine-price text-[3.5rem] leading-none font-extrabold tracking-tight">$99</span>
              <span className="text-muted-foreground text-lg">/month</span>
            </div>
            <p className="text-[15.5px] font-semibold mb-4">for your first 3 months</p>
            <span className="inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Save $40/mo
            </span>

            <div className="mt-6 pt-5 border-t">
              <p className="text-sm text-muted-foreground">
                Then <span className="font-semibold text-foreground">$139/mo</span> · cancel anytime
              </p>
            </div>

            <Button
              className="w-full my-8"
              size="lg"
              variant="outline"
              asChild
            >
              <Link href={signupUrl}>
                Start Free Trial
              </Link>
            </Button>

            <ul className="space-y-4">
              {features.slice(0, 5).map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Yearly Plan */}
          <Card className="p-10 relative border-primary border-2 bg-primary/5">
            {/* Best Value Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="bg-primary text-primary-foreground px-5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap shadow-lg">
                Best Value
              </span>
            </div>

            <div className="mb-9 pt-2">
              <h3 className="text-2xl font-semibold mb-2">Yearly</h3>
              <p className="text-muted-foreground">
                One annual payment, biggest savings
              </p>
            </div>

            <div className="flex items-baseline gap-3 mb-2.5">
              <span className="diagonal-strike strike-delay-2 text-2xl font-semibold text-muted-foreground">
                $99
              </span>
              <span className="shine-price text-[3.5rem] leading-none font-extrabold tracking-tight">$85</span>
              <span className="text-muted-foreground text-lg">/month</span>
            </div>
            <p className="text-[15.5px] font-semibold mb-4">locked in for the whole year</p>
            <span className="inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Save $168/yr
            </span>

            <div className="mt-6 pt-5 border-t">
              <p className="text-sm text-muted-foreground">
                Billed annually · <span className="font-semibold text-foreground">$1,020/year</span>{" "}
                <span className="diagonal-strike-sm text-xs text-muted-foreground">($1,188)</span>
              </p>
            </div>

            <Button
              className="w-full my-8"
              size="lg"
              asChild
            >
              <Link href={signupUrl}>
                Start Free Trial
              </Link>
            </Button>

            <ul className="space-y-4">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Trust badges */}
        <div className="mt-14 text-center">
          <p className="text-muted-foreground">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}
