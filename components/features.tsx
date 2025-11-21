"use client"

import React, { useRef, useEffect } from "react";
import { InvoicePreview } from "@/components/invoice-preview";
import { AIConversationPreview } from "@/components/ai-conversation-preview";
import { ProductRecommendations } from "@/components/product-recommendations";
import ProjectManagementCard from "@/components/project-management-card";
import { FileText, MessageSquare, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";

export function Features() {
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
      title: "Instant Invoice Generation",
      body:
        "Describe your project and upload photos, and our AI generates accurate invoices with material lists and labor estimates in seconds.",
      icon: <FileText className="h-6 w-6 text-primary" />,
      preview: <InvoicePreview />,
    },
    {
      id: "calls",
      title: "AI Call & Text Listening",
      body:
        "Capture every lead: AI transcribes calls and texts, generates responses, and offers scheduling links so you never miss an opportunity.",
      icon: <MessageSquare className="h-6 w-6 text-accent" />,
      preview: <AIConversationPreview />,
    },
    {
      id: "products",
      title: "Smart Product Suggestions",
      body:
        "Get job-specific product recommendations with pricing and availability from major retailers so you can order with confidence.",
      icon: <ShoppingCart className="h-6 w-6 text-chart-3" />,
      preview: <ProductRecommendations />,
    },
    {
      id: "pm",
      title: "Project Management",
      body:
        "Keep projects on track with task lists, assignees, due dates and simple reporting, built to work with your estimates.",
      icon: null,
      preview: <ProjectManagementCard />,
    },
  ];

  return (
    <section id="features" className="py-20 px-4 bg-white relative overflow-hidden dark:bg-background">
      <div className="container mx-auto max-w-8xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-3 text-balance">Everything You Need to Scale Your Business</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">Powerful AI-driven tools that automate estimates, follow-ups, product selection, and project management.</p>
        </div>

        <div className="relative">
          {/* Nav buttons for large screens */}
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
              className="flex gap-6 overflow-x-auto snap-x snap-mandatory touch-pan-x pb-6 scroll-smooth px-8 md:px-16"
            >
              {slides.map((s) => (
                <article key={s.id} className="snap-center flex-shrink-0 w-[min(92vw,84rem)] h-[64vh]">
                  <div className="rounded-2xl p-6 bg-gradient-to-br from-white to-gray-50 dark:from-background dark:to-muted/10 shadow-lg h-full">
                    <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 items-center h-full">
                      {/* Left: laptop-like preview area (slightly larger) */}
                      <div className="flex justify-center">
                        <div className="w-full max-w-[52rem]">
                          <div className="rounded-xl border border-gray-200 bg-gray-50 shadow-sm overflow-hidden">
                            {/* screen */}
                            <div className="bg-white p-4 border-b border-gray-100">
                              <div className="rounded-md overflow-hidden bg-white">
                                {s.preview}
                              </div>
                            </div>
                            {/* keyboard area */}
                            <div className="bg-gray-100 p-4">
                              <div className="mx-auto w-full max-w-[48rem]">
                                <div className="grid grid-cols-12 gap-2">
                                  {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="h-2 bg-gray-200 rounded-sm"></div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: title + description (centered, larger) */}
                      <div className="flex items-center h-full">
                        <div>
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-muted/20">{s.icon}</div>
                            <div>
                              <h3 className="text-3xl md:text-4xl font-semibold">{s.title}</h3>
                              <p className="mt-3 text-lg md:text-xl text-muted-foreground max-w-lg">{s.body}</p>
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
        </div>
      </div>
    </section>
  );
}
