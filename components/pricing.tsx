"use client"

import { useRef } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Check, ChevronDown, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useReferral, buildSignupUrl } from "@/contexts/ReferralContext"
import { motion, Variants, useInView } from "framer-motion"

const m = motion as any

export function Pricing() {
  const locale = useLocale()
  const t = useTranslations("landing")
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

  const cardRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(cardRef, { once: true, amount: 0.25 })

  const coreFeatures = [
    t("pricingBasic1") || "Lead Generator Agent",
    t("pricingBasic2") || "AI quote generation",
    t("pricingBasic3") || "Client management & CRM",
    t("pricingBasic4") || "Lead tracking & pipeline",
    t("pricingBasic5") || "Calendar & email sync",
    t("pricingWebsite") || "Pro website + maintenance",
  ]

  const yearlyExtras = [
    t("pricingPremium6") || "Social lead capture",
    t("pricingPremium7") || "On-site meeting recording",
    t("pricingPremium8") || "Priority onboarding",
    t("pricingPremium9") || "Quarterly workflow reviews",
  ]

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -4 },
    show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
  }

  const featureSectionVariants: Variants = {
    hidden: { opacity: 0, y: 44 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
        delay: 0.48,
        staggerChildren: 0.06,
        delayChildren: 0.65,
      },
    },
  }

  const springBlock = {
    type: "spring" as const,
    stiffness: 88,
    damping: 20,
    mass: 1.1,
  }

  return (
    <section id="pricing" className="scroll-mt-20 bg-[#fbf6f1] px-5 py-16 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <m.h2
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="text-[40px] font-bold tracking-tight text-[#0A0A0A] sm:text-[48px]"
          >
            {t("pricingTitle")}
          </m.h2>
          <m.p
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 text-[16px] text-[#5F5E5A]"
          >
            {t("pricingSubtitle")}
          </m.p>
        </div>

        <div
          ref={cardRef}
          className="mt-12 overflow-hidden rounded-[24px] border border-[#E8E3D6] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.04)]"
        >
          {/* Top Half: Pricing Plans — blocks slide in from opposite sides */}
          <div className="grid overflow-hidden md:grid-cols-2">
            {/* Monthly Block — from left */}
            <m.div
              initial={{ x: -240, opacity: 0 }}
              animate={isInView ? { x: 0, opacity: 1 } : { x: -240, opacity: 0 }}
              transition={springBlock}
              className="p-[36px] md:border-r md:border-[#F0EDE3]"
            >
              <p className="text-[14px] font-semibold text-[#888780]">{t("monthly")}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-[52px] font-bold leading-none tracking-tight text-[#0A0A0A]">$139</span>
                <span className="mb-2 text-[15px] font-medium text-[#888780]">/mo</span>
              </div>
              <p className="mt-3 text-[13px] font-medium text-[#888780]">{t("pricingBilledMonthly")}</p>
              <Button
                size="lg"
                className="mt-8 h-12 w-full rounded-[10px] border border-[#E8E3D6] bg-white text-[14px] font-semibold text-[#0A0A0A] shadow-sm hover:bg-[#FAFAFA]"
                asChild
              >
                <Link href={signupUrl}>{t("startFreeTrial")}</Link>
              </Button>
            </m.div>

            {/* Yearly Block — from right */}
            <m.div
              initial={{ x: 240, opacity: 0 }}
              animate={isInView ? { x: 0, opacity: 1 } : { x: 240, opacity: 0 }}
              transition={{ ...springBlock, delay: 0.04 }}
              className="p-[36px]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold text-[#0A0A0A]">{t("yearly")}</p>
                <div className="flex items-center gap-1 rounded-full bg-[#E1F5EE] px-[9px] py-[3px]">
                  <ChevronDown className="h-[9px] w-[9px]" stroke="#0F6E56" strokeWidth={3} />
                  <span className="text-[10px] font-semibold tracking-[0.3px] text-[#0F6E56]">{t("pricingSave29")}</span>
                </div>
              </div>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-[52px] font-bold leading-none tracking-tight text-[#0A0A0A]">$99</span>
                <span className="mb-2 text-[15px] font-medium text-[#888780]">/mo</span>
              </div>
              <p className="mt-3 text-[13px] font-medium text-[#888780]">{t("pricingBilledAnnuallyShort")}</p>
              <Button
                size="lg"
                className="mt-8 h-12 w-full rounded-[10px] bg-[#0A0A0A] text-[14px] font-semibold text-white shadow-sm hover:bg-[#1A1A1A]"
                asChild
              >
                <Link href={signupUrl}>{t("startFreeTrial")}</Link>
              </Button>
            </m.div>
          </div>

          {/* Bottom Half: Features — slides up after blocks connect */}
          <m.div
            initial="hidden"
            animate={isInView ? "show" : "hidden"}
            variants={featureSectionVariants}
            className="border-t border-[#F0EDE3]"
          >
            {/* Included in Both */}
            <div className="px-[36px] pb-[28px] pt-[32px]">
              <div className="mb-6 flex w-fit items-center gap-1.5 rounded-full bg-[#F1EFE8] px-[10px] py-[4px]">
                <Check className="h-[10px] w-[10px]" stroke="#5F5E5A" strokeWidth={3} />
                <span className="text-[10px] font-semibold tracking-[0.3px] text-[#5F5E5A]">{t("pricingIncludedBothBadge")}</span>
              </div>

              <div className="grid grid-cols-1 gap-x-[28px] gap-y-[14px] sm:grid-cols-2">
                {coreFeatures.map((feature, i) => (
                  <m.div key={i} variants={itemVariants} className="flex items-center gap-[10px]">
                    <Check className="h-[14px] w-[14px] shrink-0" stroke="#0A0A0A" strokeWidth={2.5} strokeLinecap="round" />
                    <span className="text-[13px] font-normal text-[#0A0A0A]">{feature}</span>
                  </m.div>
                ))}
              </div>
            </div>

            {/* Yearly Exclusive */}
            <div className="border-t border-[#F0EDE3] bg-[#FAFAF6] px-[36px] pb-[32px] pt-[28px]">
              <div className="mb-6 flex w-fit items-center gap-1.5 rounded-full bg-[#E1F5EE] px-[10px] py-[4px]">
                <Star className="h-[10px] w-[10px]" stroke="#0F6E56" strokeWidth={2.5} />
                <span className="text-[10px] font-semibold tracking-[0.3px] text-[#0F6E56]">{t("pricingYearlyExclusiveBadge")}</span>
              </div>

              <div className="grid grid-cols-1 gap-x-[28px] gap-y-[14px] sm:grid-cols-2">
                {yearlyExtras.map((feature, i) => (
                  <m.div key={i} variants={itemVariants} className="flex items-center gap-[10px]">
                    <Check className="h-[14px] w-[14px] shrink-0" stroke="#0F6E56" strokeWidth={2.5} strokeLinecap="round" />
                    <span className="text-[13px] font-medium text-[#0A0A0A]">{feature}</span>
                  </m.div>
                ))}
              </div>
            </div>
          </m.div>
        </div>

        <m.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.85 }}
          className="mt-8 text-center text-[13px] font-medium text-[#888780]"
        >
          {t("pricingTrialCancel")}
        </m.p>
      </div>
    </section>
  )
}
