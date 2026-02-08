"use client"

import React, { useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { InvoicePreview } from "@/components/invoice-preview";
import { AIConversationPreview } from "@/components/ai-conversation-preview";
import { ProductRecommendations } from "@/components/product-recommendations";
import ProjectManagementCard from "@/components/project-management-card";
import { FileText, MessageSquare, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";

export function Features() {
  const t = useTranslations('landing');
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scroll = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll by exactly one slide width (including gap) so each view shows a full slide
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return;
    const slideWidth = first.getBoundingClientRect().width;
    // read the gap from computed styles if available (fallback to 24px)
    const gap = parseFloat(getComputedStyle(el).gap || "") || 24;
    const distance = Math.round(slideWidth + gap);
    el.scrollBy({ left: dir * distance, behavior: "smooth" });
  };

  // Auto-slide: rotate slides every N ms but keep manual controls active.
  const autoRef = useRef<number | null>(null);
  const AUTO_INTERVAL = 6000; // 6s

  useEffect(() => {
    const start = () => {
      stop();
      autoRef.current = window.setInterval(() => scroll(1), AUTO_INTERVAL);
    };

    const stop = () => {
      if (autoRef.current) {
        clearInterval(autoRef.current);
        autoRef.current = null;
      }
    };

    // start auto sliding
    start();

    // pause on hover over scroller
    const el = scrollerRef.current;
    if (el) {
      el.addEventListener("mouseenter", stop);
      el.addEventListener("mouseleave", start);
    }

    return () => {
      stop();
      if (el) {
        el.removeEventListener("mouseenter", stop);
        el.removeEventListener("mouseleave", start);
      }
    };
  }, [scrollerRef]);

  const slides = [
    {
      id: "invoices",
      title: t('featuresInvoiceTitle'),
      body: t('featuresInvoiceBody'),
      icon: <FileText className="h-6 w-6 text-primary" />,
      preview: <InvoicePreview />,
    },
    {
      id: "calls",
      title: t('featuresCallsTitle'),
      body: t('featuresCallsBody'),
      icon: <MessageSquare className="h-6 w-6 text-accent" />,
      preview: <AIConversationPreview />,
    },
    {
      id: "products",
      title: t('featuresProductsTitle'),
      body: t('featuresProductsBody'),
      icon: <ShoppingCart className="h-6 w-6 text-chart-3" />,
      preview: <ProductRecommendations />,
    },
    {
      id: "pm",
      title: t('featuresPmTitle'),
      body: t('featuresPmBody'),
      icon: null,
      preview: <ProjectManagementCard />,
    },
  ];

  return (
    <section id="features" className="py-14 px-3 sm:px-4 sm:py-20 md:py-20 bg-white relative overflow-hidden dark:bg-background">
      <div className="container mx-auto max-w-8xl">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl font-bold mb-2 text-balance sm:text-3xl md:text-5xl md:mb-3">{t('featuresSectionTitle')}</h2>
          <p className="text-sm text-muted-foreground max-w-3xl mx-auto sm:text-base md:text-xl">{t('featuresSectionSubtitle')}</p>
        </div>

        <div className="relative">
          {/* Nav buttons for large screens only */}
          <button
            aria-label="Prev"
            onClick={() => scroll(-1)}
            className="hidden lg:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full h-12 w-12 rounded-full bg-white shadow-md z-20 mr-3"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            aria-label="Next"
            onClick={() => scroll(1)}
            className="hidden lg:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 translate-x-full h-12 w-12 rounded-full bg-white shadow-md z-20 ml-3"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="w-full overflow-hidden">
            <div
              ref={scrollerRef}
              className="flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden snap-x snap-mandatory touch-pan-x pb-4 scroll-smooth px-2 sm:px-4 md:px-8 lg:px-16"
            >
              {slides.map((s) => (
                <article key={s.id} className="snap-center flex-shrink-0 w-[88vw] sm:w-[min(92vw,84rem)] min-h-0 md:w-[min(92vw,84rem)] lg:h-[64vh]">
                  <div className="rounded-xl md:rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-white to-gray-50 dark:from-background dark:to-muted/10 shadow-lg h-full flex flex-col">
                    {/* Mobile: title + body on top, then compact preview */}
                    <div className="flex flex-col lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-8 lg:items-center lg:h-full">
                      <div className="order-2 lg:order-1 flex justify-center mt-4 lg:mt-0">
                        <div className={`w-full ${s.id === 'pm' ? 'max-w-[85rem]' : 'max-w-[52rem]'}`}>
                          <div className="rounded-lg md:rounded-xl border border-gray-200 bg-gray-50 shadow-sm overflow-hidden">
                            <div className="bg-white p-2 sm:p-4 border-b border-gray-100">
                              <div className="rounded-md overflow-hidden bg-white max-h-[200px] sm:max-h-[280px] lg:max-h-none">
                                {s.preview}
                              </div>
                            </div>
                            {/* keyboard area - hide on small mobile to save space */}
                            <div className="bg-gray-100 p-2 sm:p-4 hidden sm:block">
                              <div className="mx-auto w-full max-w-[48rem]">
                                <div className="grid grid-cols-12 gap-1 sm:gap-2">
                                  {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="h-1.5 sm:h-2 bg-gray-200 rounded-sm" />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="order-1 lg:order-2 flex items-center lg:h-full">
                        <div className="w-full">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center bg-muted/20 shrink-0">{s.icon}</div>
                            <div className="min-w-0">
                              <h3 className="text-xl font-semibold sm:text-2xl md:text-4xl">{s.title}</h3>
                              <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base md:text-xl max-w-lg">{s.body}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
          {/* Mobile: swipe hint */}
          <p className="text-center text-xs text-muted-foreground mt-3 lg:hidden">Swipe for more</p>
        </div>
      </div>
    </section>
  );
}
