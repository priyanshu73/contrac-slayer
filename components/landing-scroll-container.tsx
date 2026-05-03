"use client"

import { ReactNode, useEffect } from "react"

interface Section {
  id: string
  label: string
}

interface LandingScrollContainerProps {
  children: ReactNode
  sections: Section[]
}

export function LandingScrollContainer({
  children,
  sections,
}: LandingScrollContainerProps) {
  useEffect(() => {
    const sectionIds = sections.map((s) => s.id)
    
    const observer = new IntersectionObserver(
      (entries) => {
        let mostVisibleSection = ""
        let maxRatio = 0

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio
            mostVisibleSection = entry.target.id
          }
        })

        if (mostVisibleSection) {
          window.dispatchEvent(
            new CustomEvent("landing:section-change", {
              detail: { sectionId: mostVisibleSection },
            }),
          )
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px", // Trigger when section is near top third of screen
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      }
    )

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [sections])

  return (
    <div className="flex flex-col w-full">
      {children}
    </div>
  )
}
