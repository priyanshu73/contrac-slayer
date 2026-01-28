"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useSearchParams } from "next/navigation"

interface ReferralContextType {
  referralId: string | null
  setReferralId: (id: string | null) => void
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined)

export function ReferralProvider({ children }: { children: ReactNode }) {
  const [referralId, setReferralId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for referral_id in URL params
    const refId = searchParams.get("ref") || searchParams.get("referral_id")
    if (refId) {
      setReferralId(refId)
      // Store in sessionStorage so it persists across navigation
      sessionStorage.setItem("referral_id", refId)
    } else {
      // Try to get from sessionStorage if not in URL
      const storedRefId = sessionStorage.getItem("referral_id")
      if (storedRefId) {
        setReferralId(storedRefId)
      }
    }
  }, [searchParams])

  return (
    <ReferralContext.Provider value={{ referralId, setReferralId }}>
      {children}
    </ReferralContext.Provider>
  )
}

export function useReferral() {
  const context = useContext(ReferralContext)
  if (context === undefined) {
    throw new Error("useReferral must be used within a ReferralProvider")
  }
  return context
}

// Helper function to build signup URL with referral param
export function buildSignupUrl(locale: string, referralId: string | null): string {
  const baseUrl = `/${locale}/auth/signup`
  if (referralId) {
    return `${baseUrl}?ref=${encodeURIComponent(referralId)}`
  }
  return baseUrl
}
