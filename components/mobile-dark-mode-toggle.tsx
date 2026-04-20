"use client"

import { useEffect, useState } from "react"
import { Moon, Smartphone, Sun } from "lucide-react"

import { MOBILE_DARK_MODE_KEY } from "@/components/mobile-theme-sync"

function setMobileDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle("mobile-dark", enabled)
  localStorage.setItem(MOBILE_DARK_MODE_KEY, String(enabled))
  window.dispatchEvent(new Event("mobile-dark-mode-change"))
}

export function MobileDarkModeToggle() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(localStorage.getItem(MOBILE_DARK_MODE_KEY) === "true")
  }, [])

  const handleToggle = () => {
    const nextEnabled = !enabled
    setEnabled(nextEnabled)
    setMobileDarkMode(nextEnabled)
  }

  return (
    <section className="mobile-theme-panel md:hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mobile-theme-icon" aria-hidden="true">
            {enabled ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Phone only
            </p>
            <h3 className="mt-1 text-base font-black tracking-tight text-slate-950">
              Dark mode
            </h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              A softer night look for your mobile workspace. Desktop stays light for now.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          className="mobile-theme-switch"
        >
          <span className="sr-only">Toggle mobile dark mode</span>
          <span className="mobile-theme-switch-track" data-enabled={enabled}>
            <span className="mobile-theme-switch-thumb" data-enabled={enabled}>
              <Smartphone className="h-3.5 w-3.5" />
            </span>
          </span>
        </button>
      </div>
    </section>
  )
}
