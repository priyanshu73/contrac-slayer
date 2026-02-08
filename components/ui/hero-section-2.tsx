"use client"

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, MessageSquare, Bot, FileText } from "lucide-react";
import { useTranslations } from 'next-intl';
// framer-motion's intrinsic element typings can be strict in some TS configs.
// Use a loose-typed alias so we can use motion elements with standard HTML props (className, href, etc.).
const m = motion as any;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const handler = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

// Prop types for the HeroSection component
interface HeroSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  slogan?: string;
  title?: React.ReactNode;
  subtitle?: string;
  callToAction?: {
    text: string;
    href: string;
  };
  backgroundImage: string;
  /** If set, used as background on mobile; otherwise backgroundImage is used for both. */
  mobileBackgroundImage?: string;
  contactInfo: {
    website: string;
    phone: string;
    address: string;
  };
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  ({ className, slogan, title, subtitle, callToAction, backgroundImage, mobileBackgroundImage, contactInfo, ...props }, ref) => {
    const t = useTranslations('landing');
    const isDesktop = useIsDesktop();
    const mobileImage = mobileBackgroundImage ?? backgroundImage;

    // Desktop: slant clip reveal
    const imageClipEnd = 'polygon(18% 0, 100% 0, 100% 100%, 0 100%)';

    // Animation variants for the container to orchestrate children animations
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.12,
          delayChildren: 0.15,
        },
      },
    };

    // Animation variants for individual text/UI elements
    const itemVariants = {
      hidden: { y: 24, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          duration: 0.55,
          ease: [0.25, 0.46, 0.45, 0.94],
        },
      },
    };

    /* ──────────────────────────────────────────────
       MOBILE HERO — Full-screen immersive layout
       ────────────────────────────────────────────── */
    if (!isDesktop) {
      return (
        <m.section
          ref={ref}
          className={cn(
            "relative flex w-full flex-col overflow-hidden mt-14",
            className
          )}
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          {...(props as any)}
        >
          {/* Hero image — shorter height on mobile */}
          <div className="relative w-full h-[420px] sm:h-[480px]">
            {/* Background image */}
            <m.div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${mobileImage})` }}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            />

            {/* Multi-layer gradient overlay — stronger at top for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

            {/* Content positioned towards top of viewport */}
            <div className="relative z-10 flex flex-col justify-start h-full px-5 pt-24 pb-8">
              {/* Headline */}
              <m.h1
                className="text-[2rem] font-bold tracking-tight leading-[1.15] text-white mb-3 sm:text-4xl"
                variants={itemVariants}
              >
                {title ?? (
                  <>
                    {t('heroTitle1')}{' '}
                    <span className="text-blue-400 font-extrabold">{t('heroTitle2')}</span>
                  </>
                )}
              </m.h1>

              {/* Subtitle — single concise line */}
              <m.p
                className="text-[0.95rem] leading-relaxed text-white/80 mb-5 max-w-md sm:text-base"
                variants={itemVariants}
              >
                {t('heroSubtitle1')}
              </m.p>

              {/* Feature pills row */}
              <m.div
                className="flex flex-wrap gap-2 mb-6"
                variants={itemVariants}
              >
                {[
                  { icon: MessageSquare, label: t('heroFeatureSms'), sub: t('heroFeatureSmsSub') },
                  { icon: Bot, label: t('heroFeatureAi') },
                  { icon: FileText, label: t('heroFeatureInvoices') },
                ].map(({ icon: Icon, label, sub }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-1.5 text-xs font-medium text-white/90"
                  >
                    <Icon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    {label}
                    {sub && <span className="text-white/50">· {sub}</span>}
                  </span>
                ))}
              </m.div>

              {/* CTA Button */}
              <m.div variants={itemVariants} className="mb-5">
                <Button
                  size="lg"
                  className="w-full max-w-xs text-base px-6 py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all rounded-xl"
                  asChild
                >
                  <a href={callToAction?.href ?? 'https://cal.com/johnson-subedi/30min'} target="_blank" rel="noopener noreferrer">
                    {callToAction?.text ?? t('scheduleDemo')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
              </m.div>

              {/* Trust badges */}
              <m.div
                className="flex items-center gap-4 text-xs text-white/60"
                variants={itemVariants}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  {t('trialBadge')}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  {t('cancelAnytime')}
                </span>
              </m.div>
            </div>
          </div>
        </m.section>
      );
    }

    /* ──────────────────────────────────────────────
       DESKTOP HERO — Side-by-side layout (preserved)
       Content uses semantic HTML + explicit colors so it's always visible
       (variant animation only applied to section/image to avoid invisible text)
       ────────────────────────────────────────────── */
    return (
      <m.section
        ref={ref}
        className={cn(
          "relative flex w-full flex-row overflow-hidden bg-background text-foreground mt-16 min-h-[90vh]",
          className
        )}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        {...(props as any)}
      >
        {/* Left content column — no variant on wrapper so text is never opacity:0 */}
        <div className="flex w-[52%] lg:w-[48%] flex-col justify-center p-8 pl-16 pr-10 py-12 lg:pl-24 lg:pr-12 text-left">
          <header className="mb-12">
            <h1 className="text-6xl lg:text-8xl font-bold tracking-tight text-balance mb-6 leading-tight text-foreground">
              {title ?? (
                <>
                  <span className="block">{t('heroTitle1')}</span>
                  <span className="font-extrabold block mt-2 text-primary">{t('heroTitle2')}</span>
                </>
              )}
            </h1>

            <div className="mb-10">
              <p className="text-muted-foreground text-balance max-w-3xl leading-relaxed text-xl">
                {subtitle ?? t('heroSubtitle')}
              </p>
            </div>

            <div className="flex flex-row gap-4 mb-12 justify-start">
              <Button
                size="lg"
                className="text-base px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
                asChild
              >
                <a href={callToAction?.href ?? 'https://cal.com/johnson-subedi/30min'} target="_blank" rel="noopener noreferrer">
                  {callToAction?.text ?? t('scheduleDemo')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap justify-start gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <span>{t('trialBadge')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <span>{t('cancelAnytime')}</span>
              </div>
            </div>
          </header>
        </div>

        {/* Right image column with slant reveal */}
        <m.div
          className="relative w-[48%] lg:w-[52%] bg-cover bg-center min-h-full overflow-hidden"
          style={{ backgroundImage: `url(${backgroundImage})` }}
          initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
          animate={{ clipPath: imageClipEnd }}
          transition={{ duration: 1.2, ease: 'circOut' as const }}
        />
      </m.section>
    );
  }
);

HeroSection.displayName = "HeroSection";

export { HeroSection };
