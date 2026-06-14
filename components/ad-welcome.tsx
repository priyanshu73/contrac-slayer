"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import { X, Sparkles, ArrowRight } from "lucide-react"
import { useReferral, buildSignupUrl } from "@/contexts/ReferralContext"
import { useAuth } from "@/contexts/AuthContext"

// Fire a GA4 event when gtag is present. GA only loads on the prod hostname, so
// this is a safe no-op on localhost/dev (and SSR).
function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return
  const w = window as unknown as { gtag?: (...args: unknown[]) => void }
  if (typeof w.gtag === "function") w.gtag("event", event, params ?? {})
}

// On-theme confetti (grass greens + gold) that rains once behind the modal copy.
const CONFETTI_COLORS = ["#16a34a", "#22c55e", "#84cc16", "#f59e0b", "#facc15", "#0ea5e9"]

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 38 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        dur: 1.4 + Math.random() * 1.1,
        rot: 180 + Math.random() * 540,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    [],
  )
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl motion-reduce:hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="ad-confetti-piece absolute top-0 block rounded-[1px]"
          style={
            {
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 0.42}px`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              "--ad-confetti-rot": `${p.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

/**
 * AdWelcome — conversion nudge for paid-ad visitors (TikTok etc.).
 *
 * Only activates on the marketing home page for traffic that arrived via ad
 * params (utm_medium=paid or any utm_source). Shows:
 *   - a slim, always-visible "start free" bar, and
 *   - a closable exit-intent modal that fires when the visitor is about to leave
 *     (desktop: cursor leaves the top; mobile: scrolls back to top, or a timed
 *     safety net) — so it attacks bounce without interrupting the first impression.
 *
 * Gated on the utm param (NOT the hostname) so it can be tested locally:
 *   http://localhost:3000/?utm_source=tiktok&utm_medium=paid
 * Add ?nudge=1 to force the modal open for design previews.
 */

const HOME_PATHS = ["/", "/en", "/es"]
const VISITOR_FLAG = "ad_visitor"
const BAR_DISMISSED = "ad_bar_dismissed"
const MODAL_DISMISSED = "ad_modal_dismissed"

export function AdWelcome() {
  const pathname = usePathname()
  const locale = useLocale()
  const { referralId } = useReferral()
  const { user, loading } = useAuth()
  const signupUrl = buildSignupUrl(locale, referralId)

  const [active, setActive] = useState(false)
  const [showBar, setShowBar] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const shownRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!HOME_PATHS.includes(pathname)) return

    const params = new URLSearchParams(window.location.search)
    const cameFromAd = params.get("utm_medium") === "paid" || !!params.get("utm_source")
    if (cameFromAd) sessionStorage.setItem(VISITOR_FLAG, "1")
    const isAd = cameFromAd || sessionStorage.getItem(VISITOR_FLAG) === "1"
    const force = params.get("nudge") === "1"

    if (force) {
      setActive(true)
      setShowBar(true)
      setShowModal(true)
      shownRef.current = true
      return
    }
    // Never pitch a "sign up free" trial to someone already signed in.
    // (?nudge=1 above bypasses this so the design can still be previewed.)
    if (loading || user) return
    if (!isAd) return

    setActive(true)
    if (localStorage.getItem(BAR_DISMISSED) !== "1") setShowBar(true)
    if (localStorage.getItem(MODAL_DISMISSED) === "1") return

    const trigger = () => {
      if (shownRef.current) return
      shownRef.current = true
      setShowModal(true)
    }

    // Desktop exit-intent: cursor leaves through the top of the viewport.
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) trigger()
    }
    // Scroll-up exit-intent (works on mobile + desktop): once they've engaged
    // (scrolled down a bit), a deliberate UPWARD scroll — reversing direction to
    // head back / leave — triggers the offer. A tiny re-read jiggle won't, because
    // any downward movement resets the accumulator; only a sustained up-swipe fires.
    let engaged = false
    let lastY = window.scrollY
    let upAccum = 0
    const onScroll = () => {
      const y = window.scrollY
      if (y > 300) engaged = true
      if (y < lastY) {
        upAccum += lastY - y
        if (engaged && upAccum > 220) trigger()
      } else if (y > lastY) {
        upAccum = 0
      }
      lastY = y
    }
    // Safety net so lingering mobile visitors still get the offer.
    const timer = window.setTimeout(trigger, 25000)

    document.addEventListener("mouseout", onMouseOut)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      document.removeEventListener("mouseout", onMouseOut)
      window.removeEventListener("scroll", onScroll)
      window.clearTimeout(timer)
    }
  }, [pathname, user, loading])

  useEffect(() => {
    if (!showModal) return
    track("ad_nudge_shown", { nudge_location: "modal" })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [showModal])

  const closeBar = () => {
    setShowBar(false)
    localStorage.setItem(BAR_DISMISSED, "1")
  }
  const closeModal = () => {
    setShowModal(false)
    localStorage.setItem(MODAL_DISMISSED, "1")
  }
  const handleCtaClick = (where: "modal" | "bar") => {
    track("ad_nudge_cta_click", { nudge_location: where })
    // They clicked through to signup — quiet BOTH surfaces so we don't keep
    // nudging them if they come back to the landing page.
    localStorage.setItem(BAR_DISMISSED, "1")
    localStorage.setItem(MODAL_DISMISSED, "1")
    setShowBar(false)
    setShowModal(false)
  }

  if (!active) return null

  return (
    <>
      {showBar && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
          <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-white/10 bg-slate-950/95 py-2 pl-4 pr-2 text-sm text-white shadow-xl backdrop-blur">
            <Sparkles className="hidden h-4 w-4 shrink-0 text-amber-300 sm:block" />
            <span className="truncate font-medium">
              Start your <span className="text-amber-300">7-day free trial</span>
            </span>
            <Link
              href={signupUrl}
              onClick={() => handleCtaClick("bar")}
              className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Sign up free
            </Link>
            <button
              onClick={closeBar}
              aria-label="Dismiss"
              className="shrink-0 rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Confetti />
            <button
              onClick={closeModal}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              👀 Holy crop.
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
              We honestly thought you wouldn&apos;t give a sod about this ad.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              But you clicked! You must really dig what we&apos;re putting down. Since you
              didn&apos;t just mulch us out of your feed, you&apos;ve officially earned a{" "}
              <span className="font-semibold text-slate-900">7-day free trial</span>.
            </p>
            <Link
              href={signupUrl}
              onClick={() => handleCtaClick("modal")}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Let&apos;s get dirty (claim trial) <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={closeModal}
              className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600"
            >
              Nah, I&apos;ll go back to my weeds.
            </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
