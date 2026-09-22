"use client"

import { useEffect, useState } from "react"
import { Clock, Zap } from "lucide-react"

interface PricingCountdownProps {
  className?: string
  variant?: "banner" | "compact"
}

const CYCLE_MS = 48 * 60 * 60 * 1000 // 48 hours in milliseconds (2 days)

export function PricingCountdown({
  className = "",
  variant = "banner",
}: PricingCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Date.now()
      // Continuous 48-hour cycle that rolls over seamlessly
      const msRemaining = CYCLE_MS - (now % CYCLE_MS)

      const totalSeconds = Math.floor(msRemaining / 1000)
      const days = Math.floor(totalSeconds / (24 * 3600))
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      return { days, hours, minutes, seconds }
    }

    // Initialize on mount to avoid SSR mismatch
    setTimeLeft(calculateTimeRemaining())

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!timeLeft) {
    // Return placeholder during SSR / before hydration
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 ${className}`}
      >
        <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500 animate-pulse" />
        <span>Limited Offer: 48h Price Lock active</span>
      </div>
    )
  }

  const { days, hours, minutes, seconds } = timeLeft

  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm dark:bg-amber-950/40 dark:border-amber-400/30 dark:text-amber-300 ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
        </span>
        <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <span>
          Ends in {days}d {String(hours).padStart(2, "0")}h{" "}
          {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
        </span>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 px-4 py-2 text-xs sm:text-sm font-medium text-amber-900 shadow-sm backdrop-blur-sm dark:border-amber-400/25 dark:text-amber-200 ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75"></span>
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-600"></span>
        </span>
        <span className="font-semibold tracking-tight text-amber-900 dark:text-amber-200">
          ⚡ Limited Offer:
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Price lock expires in</span>
        <span className="inline-flex items-center font-mono font-bold text-amber-700 dark:text-amber-300">
          {days}d {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m{" "}
          {String(seconds).padStart(2, "0")}s
        </span>
      </div>
    </div>
  )
}
