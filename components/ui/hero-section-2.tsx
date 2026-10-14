"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, Play } from "lucide-react"
import "@/components/landing/landing.css"
import { HERO_CARD_HTML } from "@/components/landing/landing-markup"
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
          className="lp lp-hero-wrap mx-auto grid min-h-[calc(100svh-1rem)] max-w-[1200px] items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] sm:min-h-[100svh]"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="min-w-0 text-left">
            <motion.div variants={itemVariants} className="lp-hero-eyebrow">AI BACK OFFICE FOR CONTRACTORS</motion.div>
            <motion.h1 variants={itemVariants} className="lp-hero-title">
              More jobs.
              <br />
              Less chasing.
            </motion.h1>
            <motion.p variants={itemVariants} className="lp-hero-body">
              Keep leads, estimates, crews and job costs moving, with AI helping your team handle the follow-through.
            </motion.p>
            <motion.div variants={itemVariants} className="lp-hero-actions">
              <a
                href={callToAction?.href ?? "https://cal.com/johnson-subedi/30min"}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-hero-btn"
              >
                Book a demo
                <ArrowRight className="h-5 w-5" />
              </a>
              <a href="#receptionist" className="lp-hero-btn lp-hero-btn-ghost">
                <Play className="h-4 w-4 fill-current" />
                Hear the AI
              </a>
            </motion.div>
            <motion.div variants={itemVariants} className="lp-hero-note">For owner-operated shops and growing teams</motion.div>
          </div>
          <motion.div variants={itemVariants} className="lp-hero-card" dangerouslySetInnerHTML={{ __html: HERO_CARD_HTML }} />
        </motion.div>
      </section>
    )
  },
)

HeroSection.displayName = "HeroSection"

export { HeroSection }
