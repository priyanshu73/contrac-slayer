"use client"

import { motion } from "framer-motion"

const m = motion as any

interface Section {
  id: string
  label: string
}

interface LandingPageIndicatorProps {
  sections: Section[]
  activeIndex: number
  onNavigate: (index: number) => void
}

export function LandingPageIndicator({
  sections,
  activeIndex,
  onNavigate,
}: LandingPageIndicatorProps) {
  return (
    <nav
      aria-label="Page sections"
      className="fixed left-6 top-1/2 z-50 hidden -translate-y-1/2 lg:flex"
    >
      <div className="relative flex flex-col items-center gap-6 rounded-full bg-white/20 px-2 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md">
        {/* Vertical track line */}
        <div className="absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2 bg-slate-400/30" />

        {sections.map((section, i) => {
          const isActive = i === activeIndex
          return (
            <button
              key={section.id}
              onClick={() => onNavigate(i)}
              className="group relative z-10 flex items-center"
              aria-label={`Go to ${section.label}`}
              aria-current={isActive ? "true" : undefined}
            >
              {/* Dot */}
              <m.span
                className="relative block rounded-full transition-shadow duration-300"
                initial={false}
                animate={{
                  width: isActive ? 12 : 8,
                  height: isActive ? 12 : 8,
                  backgroundColor: isActive ? "#0f172a" : "rgba(100, 116, 139, 0.5)",
                  boxShadow: isActive
                    ? "0 0 0 3px rgba(15, 23, 42, 0.15)"
                    : "0 0 0 0px rgba(15, 23, 42, 0)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              />

              {/* Label tooltip */}
              <m.span
                className="pointer-events-none absolute left-8 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl"
                initial={{ opacity: 0, x: -4, scale: 0.95 }}
                animate={
                  isActive
                    ? { opacity: 1, x: 0, scale: 1 }
                    : { opacity: 0, x: -4, scale: 0.95 }
                }
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {section.label}
                {/* Arrow */}
                <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-slate-900" />
              </m.span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
