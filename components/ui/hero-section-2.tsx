"use client"

import React from 'react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
// framer-motion's intrinsic element typings can be strict in some TS configs.
// Use a loose-typed alias so we can use motion elements with standard HTML props (className, href, etc.).
const m = motion as any;

// Icon component for contact details
const InfoIcon = ({ type }: { type: 'website' | 'phone' | 'address' }) => {
    const icons = {
        website: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" x2="22" y1="12" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
        ),
        phone: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
        ),
        address: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
        ),
    };
    return <div className="mr-2 flex-shrink-0">{icons[type]}</div>;
};


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
  contactInfo: {
    website: string;
    phone: string;
    address: string;
  };
}

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  ({ className, slogan, title, subtitle, callToAction, backgroundImage, contactInfo, ...props }, ref) => {
    
    // Animation variants for the container to orchestrate children animations
    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.15,
          delayChildren: 0.2,
        },
      },
    };

    // Animation variants for individual text/UI elements
    const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          duration: 0.5,
          ease: "easeOut",
        },
      },
    };
    
    return (
      <m.section
        ref={ref}
        className={cn(
          "relative flex w-full flex-col overflow-hidden bg-background text-foreground md:flex-row mt-16 min-h-[90vh]",
          className
        )}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        {...(props as any)}
      >
  {/* Left Side: Content */}
  <div className="flex w-full flex-col justify-center p-8 md:pl-20 md:pr-12 md:py-12 md:w-1/2 lg:pl-28 lg:pr-16 lg:w-3/5">
            {/* Top Section: Logo & Main Content */}
            <div>
                <m.header className="mb-12" variants={itemVariants}>
                  {/* previous hero content: large heading, paragraph, CTA and feature list */}
                  <m.h1 className="text-6xl md:text-8xl font-bold tracking-tight text-balance mb-6 leading-tight" variants={itemVariants}>
                    {title ?? (
                      <>
                        AI-Powered CRM for
                        <span className="text-primary block mt-2">Modern Contractors</span>
                      </>
                    )}
                  </m.h1>

                  <m.p className="text-2xl md:text-2xl text-muted-foreground text-balance max-w-3xl mb-10 leading-relaxed" variants={itemVariants}>
                    {subtitle ?? 'Transform your contracting business with intelligent automation. Generate invoices instantly, capture every lead, and close more deals all powered by cutting edge AI technology.'}
                  </m.p>

                  <div className="flex flex-col sm:flex-row gap-4 mb-12">
                    <Button size="lg" className="text-base px-8 bg-primary text-primary-foreground hover:bg-primary/90">
                      {callToAction?.text ?? 'Start Free Trial'}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span>No credit card required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span>14-day free trial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span>Cancel anytime</span>
                    </div>
                  </div>
                </m.header>
            </div>

            
        </div>

        {/* Right Side: Image with Clip Path Animation */}
        <m.div 
          className="w-full min-h-[300px] bg-cover bg-center md:w-1/2 md:min-h-full lg:w-2/5"
          style={{ 
            backgroundImage: `url(${backgroundImage})`,
          }}
          initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
          animate={{ clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0% 100%)' }}
          transition={{ duration: 1.2, ease: "circOut" }}
        >
        </m.div>
      </m.section>
    );
  }
);

HeroSection.displayName = "HeroSection";

export { HeroSection };
