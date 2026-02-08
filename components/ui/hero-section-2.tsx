"use client"

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
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
       MOBILE HERO — High-converting, brutal simplicity
       Headline → Subline → CTA → Trial copy. Features below as stacked rows.
       ────────────────────────────────────────────── */
    if (!isDesktop) {
      const mobileFeatures = [
        { label: t('heroFeatureSmsLong') },
        { label: t('heroFeatureAiLong') },
        { label: t('heroFeatureInvoicesLong') },
      ];
      return (
        <section
          ref={ref}
          className={cn(
            "relative flex w-full flex-col overflow-hidden mt-14 bg-background",
            className
          )}
          {...(props as any)}
        >
          {/* Hero image — full viewport height, center-aligned text */}
          <div className="relative w-full flex flex-col" style={{ minHeight: 'calc(100svh - 56px)' }}>
            {/* Background image — no scale animation, just fade */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
              style={{ backgroundImage: `url(${mobileImage})` }}
            />
            {/* Dark overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.75))' }}
            />

            {/* Content — centered text, pushed to bottom */}
            <div className="relative z-10 flex flex-col items-center justify-end flex-1 px-5 pt-20 text-center" style={{ paddingBottom: 'calc(var(--spacing) * 50)' }}>
              {/* Headline */}
              <h1 className="text-3xl font-bold leading-tight text-white mb-4">
                {title ?? (
                  <>
                    <span className="block">{t('heroTitleMobileLine1')}</span>
                    <span className="block text-blue-400">{t('heroTitleMobileLine2')}</span>
                  </>
                )}
              </h1>

              {/* Subtext */}
              <div className="mb-5 max-w-[340px]">
                <p className="text-base text-white/90 leading-snug">
                  {t('heroSubtitleMobile')}
                </p>
                <p className="text-base text-white/80 leading-snug mt-0.5">
                  {t('heroSubtitleMobileLine2')}
                </p>
              </div>

              {/* CTA */}
              <div className="w-full max-w-[360px] mb-3">
                <Button
                  size="lg"
                  className="w-full h-[52px] text-base rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg active:scale-[0.98] transition-transform"
                  asChild
                >
                  <a href={callToAction?.href ?? 'https://cal.com/johnson-subedi/30min'} target="_blank" rel="noopener noreferrer">
                    {callToAction?.text ?? t('scheduleDemo')}
                  </a>
                </Button>
              </div>

              {/* Trial copy */}
              <p className="text-sm text-white/60 mb-8">
                {t('trialBadge')} • {t('cancelAnytime')}
              </p>

              {/* Feature bullets */}
              <div className="flex flex-col items-center gap-3 w-full">
                {mobileFeatures.map(({ label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 text-sm font-medium text-white/90 leading-relaxed"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
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
          transition={{ duration: 0.5, ease: 'circOut' as const }}
        />
      </m.section>
    );
  }
);

HeroSection.displayName = "HeroSection";

export { HeroSection };
