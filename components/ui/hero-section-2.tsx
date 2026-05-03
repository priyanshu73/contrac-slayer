"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { useReferral, buildSignupUrl } from "@/contexts/ReferralContext"
import { cn } from "@/lib/utils"
import { motion, Variants } from "framer-motion"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
}

interface HeroSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  slogan?: string
  title?: React.ReactNode
  subtitle?: string
  callToAction?: {
    text: string
    href: string
  }
  backgroundImage: string
  mobileBackgroundImage?: string
  contactInfo: {
    website: string
    phone: string
    address: string
  }
}

const CHOOSE_VIDEO = 1

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  ({ className, title, subtitle, callToAction, slogan, backgroundImage, mobileBackgroundImage, contactInfo, ...props }, ref) => {
    const t = useTranslations("landing")
    const locale = useLocale()
    const { referralId } = useReferral()
    const signupUrl = buildSignupUrl(locale, referralId)
    const heroImage = mobileBackgroundImage ?? backgroundImage
    void slogan
    void contactInfo

    return (
      <section
        ref={ref}
        className={cn("relative isolate overflow-hidden rounded-b-[2rem] bg-[#fbf6f1] px-5 pt-24 text-white shadow-[0_22px_80px_rgba(96,75,64,0.10)] sm:px-8 lg:pt-28", className)}
        {...props}
      >
        {CHOOSE_VIDEO === 1 ? (
          <div className="absolute inset-0 -z-20 overflow-hidden">
            <video
              className="absolute left-0 top-0 h-[115%] w-full object-cover object-[center_top]"
              autoPlay
              muted
              loop
              playsInline
            >
              <source src="/videos/hero.mp4" type="video/mp4" />
            </video>
          </div>
        ) : (
          <picture className="absolute inset-0 -z-20 overflow-hidden">
            <source media="(max-width: 767px)" srcSet={heroImage} />
            <img
              src={backgroundImage}
              alt=""
              className="motion-safe-animate h-full w-full object-cover object-center"
              style={{ animation: "ken-burns 20s ease-in-out infinite alternate" }}
            />
          </picture>
        )}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,14,22,0.72),rgba(8,14,22,0.52)_46%,rgba(8,14,22,0.40)),radial-gradient(circle_at_center,rgba(38,49,61,0.08),rgba(8,14,22,0.48)_82%)]" />

        <motion.div 
          className="mx-auto flex min-h-[calc(100svh-1rem)] max-w-6xl items-center justify-center pb-20 pt-10 text-center sm:min-h-[100svh] lg:pb-24"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="max-w-5xl">
            <motion.h1 variants={itemVariants} className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.08] tracking-normal text-white sm:text-5xl lg:text-6xl">
              {title ?? (
                <>
                  {t("heroHeadline")}
                  <span className="block font-medium text-white/55">{t("heroHeadlineAccent")}</span>
                </>
              )}
            </motion.h1>

            <motion.p variants={itemVariants} className="mx-auto mt-6 max-w-2xl text-base font-medium leading-7 text-white/70 [text-shadow:0_2px_18px_rgba(0,0,0,0.62)] sm:text-lg">
              {subtitle ?? t("heroBody")}
            </motion.p>

            <motion.div variants={itemVariants} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 rounded-full bg-white px-7 text-base text-[#26313d] hover:bg-white/90" asChild>
                <Link href={signupUrl}>
                  {t("heroPrimaryCta")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="h-12 rounded-full px-7 text-base text-white/88 hover:bg-white/12 hover:text-white" asChild>
                <a href={callToAction?.href ?? "https://cal.com/johnson-subedi/30min"} target="_blank" rel="noopener noreferrer">
                  {callToAction?.text ?? t("scheduleDemo")}
                </a>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>
    )
  },
)

HeroSection.displayName = "HeroSection"

export { HeroSection }
