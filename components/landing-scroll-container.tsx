"use client"

import {
  ReactNode,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react"
import { LandingPageIndicator } from "./landing-page-indicator"

interface Section {
  id: string
  label: string
}

interface LandingScrollContainerProps {
  children: ReactNode
  sections: Section[]
}

type LandingNavigateDetail = {
  sectionId: string
}

export function LandingScrollContainer({
  children,
  sections,
}: LandingScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const isNavigating = useRef(false)
  const navTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const resetTimeoutsRef = useRef<number[]>([])
  const resetAnimationFramesRef = useRef<number[]>([])

  const getSectionElements = useCallback(() => {
    const container = containerRef.current
    if (!container) return []

    return Array.from(
      container.querySelectorAll<HTMLElement>("[data-section-id]"),
    )
  }, [])

  const findSectionById = useCallback(
    (sectionId: string) => {
      const sectionEls = getSectionElements()
      const index = sectionEls.findIndex(
        (sectionEl) => sectionEl.getAttribute("data-section-id") === sectionId,
      )

      if (index === -1) {
        return { index: -1, element: null as HTMLElement | null }
      }

      return { index, element: sectionEls[index] }
    },
    [getSectionElements],
  )

  const clearSectionQueryParam = useCallback(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has("section")) return

    url.searchParams.delete("section")
    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState(null, "", nextUrl)
  }, [])

  const broadcastActiveSection = useCallback(
    (index: number) => {
      const section = sections[index]
      if (!section) return

      window.dispatchEvent(
        new CustomEvent<LandingNavigateDetail>("landing:section-change", {
          detail: { sectionId: section.id },
        }),
      )
    },
    [sections],
  )

  // ── Initial Scroll Reset ──
  // Always scroll to top on mount/refresh unless there is an intentional section request.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Disable native scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    // Prevent scroll tracker from firing while we reset
    isNavigating.current = true

    const requestedSectionId = new URLSearchParams(window.location.search).get("section")
    
    const resetScroll = () => {
      const firstSection =
        container.querySelector<HTMLElement>("[data-section-id]")

      if (firstSection) {
        firstSection.scrollIntoView({ behavior: "auto", block: "start" })
      } else {
        container.scrollTo({ top: 0, behavior: "auto" })
      }

      container.scrollTop = 0
      window.scrollTo({ top: 0, behavior: "auto" })
      setActiveIndex(0)
      broadcastActiveSection(0)
    }

    const navigateToRequestedSection = () => {
      if (!requestedSectionId) {
        resetScroll()
        return
      }

      const { index, element } = findSectionById(requestedSectionId)
      if (!element || index === -1) {
        resetScroll()
        return
      }

      element.scrollIntoView({ behavior: "auto", block: "start" })
      setActiveIndex(index)
      broadcastActiveSection(index)
      clearSectionQueryParam()
    }
    
    navigateToRequestedSection()
    resetAnimationFramesRef.current.push(window.requestAnimationFrame(navigateToRequestedSection))
    resetAnimationFramesRef.current.push(
      window.requestAnimationFrame(() => {
        resetAnimationFramesRef.current.push(window.requestAnimationFrame(navigateToRequestedSection))
      }),
    )
    resetTimeoutsRef.current.push(window.setTimeout(navigateToRequestedSection, 50))
    
    // Re-enable scroll tracker after layout settles
    resetTimeoutsRef.current.push(window.setTimeout(() => {
      navigateToRequestedSection()
      isNavigating.current = false
    }, 200))

    return () => {
      resetTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      resetAnimationFramesRef.current.forEach((frameId) => window.cancelAnimationFrame(frameId))
      resetTimeoutsRef.current = []
      resetAnimationFramesRef.current = []

      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto'
      }
    }
  }, [broadcastActiveSection, clearSectionQueryParam, findSectionById])

  // ── Scroll tracking ──
  // Determine which section occupies the most viewport area on every scroll.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (isNavigating.current) return

      const sectionEls = container.querySelectorAll<HTMLElement>("[data-section-id]")
      if (sectionEls.length === 0) return

      const containerRect = container.getBoundingClientRect()

      // Robust fallback: if scrolled to the absolute top, it must be the first section.
      if (container.scrollTop <= 8) {
        setActiveIndex(0)
        broadcastActiveSection(0)
        return
      }

      const firstSection = sectionEls[0]
      if (firstSection) {
        const firstRect = firstSection.getBoundingClientRect()
        const firstSectionStillDominant =
          firstRect.top <= containerRect.top + 8 &&
          firstRect.bottom >= containerRect.top + containerRect.height * 0.35

        if (firstSectionStillDominant) {
          setActiveIndex(0)
          broadcastActiveSection(0)
          return
        }
      }

      let bestIdx = 0
      let bestOverlap = -1

      sectionEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect()
        const overlapTop = Math.max(rect.top, containerRect.top)
        const overlapBottom = Math.min(rect.bottom, containerRect.bottom)
        const overlap = Math.max(0, overlapBottom - overlapTop)

        if (overlap > bestOverlap) {
          bestOverlap = overlap
          bestIdx = i
        }
      })

      setActiveIndex(bestIdx)
      broadcastActiveSection(bestIdx)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    
    // Initial check (deferred to let the reset finish)
    setTimeout(handleScroll, 250)

    return () => container.removeEventListener("scroll", handleScroll)
  }, [broadcastActiveSection])

  // ── Shared scroll helper ──
  const scrollToElement = useCallback(
    (el: HTMLElement, index: number) => {
      isNavigating.current = true
      if (index !== -1) setActiveIndex(index)

      // scrollIntoView works perfectly with CSS scroll-snap
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })

      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current)
      navTimeoutRef.current = setTimeout(() => {
        isNavigating.current = false
      }, 1000)
    },
    [],
  )

  // ── Programmatic navigation from the header/other controls ──
  useEffect(() => {
    const handleLandingNavigate = (
      event: Event,
    ) => {
      const customEvent = event as CustomEvent<LandingNavigateDetail>
      const sectionId = customEvent.detail?.sectionId
      if (!sectionId) return

      const { index, element } = findSectionById(sectionId)
      if (!element || index === -1) return

      scrollToElement(element, index)
    }

    window.addEventListener("landing:navigate", handleLandingNavigate as EventListener)

    return () => window.removeEventListener("landing:navigate", handleLandingNavigate as EventListener)
  }, [findSectionById, scrollToElement])

  // ── Dot click navigation ──
  const handleNavigate = useCallback(
    (index: number) => {
      const container = containerRef.current
      if (!container) return

      const sectionEls = container.querySelectorAll<HTMLElement>("[data-section-id]")
      const el = sectionEls[index]
      if (!el) return

      scrollToElement(el, index)
    },
    [scrollToElement],
  )

  return (
    <div
      ref={containerRef}
      className="landing-scroll-container"
    >
      <LandingPageIndicator
        sections={sections}
        activeIndex={activeIndex}
        onNavigate={handleNavigate}
      />
      {children}
    </div>
  )
}
