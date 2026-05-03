'use client'

import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { useReferral, buildSignupUrl } from '@/contexts/ReferralContext'
import { motion, Variants } from 'framer-motion'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
}

export function CTA() {
  const locale = useLocale()
  const t = useTranslations('landing')
  const { referralId } = useReferral()
  const signupUrl = buildSignupUrl(locale, referralId)

  return (
    <section className="bg-[#fbf6f1] px-5 pb-[80px] pt-10 sm:px-8">
      <div className="mx-auto max-w-[800px]">
        <motion.div 
          className="relative overflow-hidden rounded-[24px] border border-[#E8E3D6] bg-white px-5 pb-10 pt-12 shadow-[0_0_0_6px_rgba(10,10,10,0.02),0_1px_2px_rgba(0,0,0,0.02)] sm:px-10 sm:pb-[56px] sm:pt-[72px]"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          {/* Background Radial Glow */}
          <div 
            className="pointer-events-none absolute left-1/2 top-[-120px] h-[240px] w-[480px] -translate-x-1/2"
            style={{ background: 'radial-gradient(circle, rgba(30, 120, 212, 0.06) 0%, transparent 70%)' }}
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.div variants={itemVariants}>
              <span className="inline-block rounded-full bg-[#E6F1FB] px-[12px] py-[5px] text-[11px] font-semibold tracking-[0.3px] text-[#1E78D4]">
                READY WHEN YOU ARE
              </span>
            </motion.div>

            <motion.h2 
              variants={itemVariants}
              className="mt-6 text-[36px] font-semibold leading-[1.05] tracking-[-1.8px] text-[#0A0A0A] sm:text-[48px]"
            >
              Run the next lead with AI.
            </motion.h2>

            <motion.p 
              variants={itemVariants}
              className="mt-5 max-w-[480px] text-[16px] text-[#5F5E5A]"
            >
              Start with calls, texts, estimates, and dispatch in one cleaner flow.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6"
            >
              <Link 
                href={signupUrl}
                className="group flex items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-[22px] py-[13px] text-[15px] font-medium text-white transition-all duration-300 hover:-translate-y-[2px] hover:bg-[#1A1A1A] hover:shadow-[0_8px_20px_rgba(10,10,10,0.15)]"
              >
                Start your free trial
                <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
              </Link>
              <a 
                href="https://cal.com/johnson-subedi/30min" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-[8px] py-[13px] text-[15px] font-medium text-[#0A0A0A] transition-colors hover:text-[#333333]"
              >
                Schedule a demo
              </a>
            </motion.div>

            {/* Stats Row */}
            <motion.div 
              variants={itemVariants}
              className="mt-10 grid w-full max-w-[540px] grid-cols-3 divide-x divide-[#F0EDE3] border-t border-[#F0EDE3] pt-8"
            >
              {/* Column 1: Avatars + Text */}
              <div className="flex flex-1 flex-col items-center justify-center px-2">
                <div className="mb-[6px] flex items-center -space-x-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#FFF5F0] text-[10px] font-bold text-[#D85A30]">JM</div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#E6F1FB] text-[10px] font-bold text-[#1E78D4]">DP</div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#F1FAF5] text-[10px] font-bold text-[#047857]">AW</div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#F1EFE8] text-[11px] font-bold text-[#5F5E5A]">30+</div>
                </div>
                <span className="text-[11px] font-medium text-[#888780]">Contractors</span>
              </div>

              {/* Column 2 */}
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="leading-none text-[#0A0A0A]">
                  <span className="text-[22px] font-bold sm:text-[26px]">14</span>
                  <span className="text-[14px] font-semibold text-[#888780] sm:text-[16px]">-day</span>
                </div>
                <span className="mt-[6px] text-[11px] font-medium text-[#888780]">Free trial</span>
              </div>

              {/* Column 3 */}
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="text-[22px] font-bold leading-none text-[#0A0A0A] sm:text-[26px]">Cancel</div>
                <span className="mt-[6px] text-[11px] font-medium text-[#888780]">anytime</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
