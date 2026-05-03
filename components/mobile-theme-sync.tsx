"use client"

import { useEffect } from "react"

const MOBILE_DARK_MODE_KEY = "contractorops-mobile-dark-mode"

function applyMobileDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle("mobile-dark", enabled)
}

export function MobileThemeSync() {
  useEffect(() => {
    const syncFromStorage = () => {
      applyMobileDarkMode(localStorage.getItem(MOBILE_DARK_MODE_KEY) === "true")
    }

    syncFromStorage()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === MOBILE_DARK_MODE_KEY) {
        applyMobileDarkMode(event.newValue === "true")
      }
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("mobile-dark-mode-change", syncFromStorage)

    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("mobile-dark-mode-change", syncFromStorage)
    }
  }, [])

  return null
}

export { MOBILE_DARK_MODE_KEY }
