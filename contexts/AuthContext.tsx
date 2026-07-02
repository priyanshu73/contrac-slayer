"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { api } from "@/lib/api"
import { User, ContractorProfile } from "@/lib/types"
import { clearContractorOpsNumber } from "@/hooks/useContractorOpsNumber"

const PENDING_ZIP_STORAGE_KEY = "contractorops_pending_zip"

// Approximate combined sales tax rates by state. Used after onboarding to set a sensible default.
const STATE_TAX_RATES: Record<string, string> = {
  AL: "9.46",
  AK: "1.82",
  AZ: "8.52",
  AR: "9.46",
  CA: "8.99",
  CO: "7.89",
  CT: "6.35",
  DE: "0.00",
  FL: "6.98",
  GA: "7.49",
  HI: "4.50",
  ID: "6.03",
  IL: "8.96",
  IN: "7.00",
  IA: "6.94",
  KS: "8.69",
  KY: "6.00",
  LA: "10.11",
  ME: "5.50",
  MD: "6.00",
  MA: "6.25",
  MI: "6.00",
  MN: "8.14",
  MS: "7.06",
  MO: "8.44",
  MT: "0.00",
  NE: "6.98",
  NV: "8.24",
  NH: "0.00",
  NJ: "6.60",
  NM: "7.67",
  NY: "8.54",
  NC: "7.00",
  ND: "7.09",
  OH: "7.29",
  OK: "9.06",
  OR: "0.00",
  PA: "6.34",
  RI: "7.00",
  SC: "7.49",
  SD: "6.11",
  TN: "9.61",
  TX: "8.20",
  UT: "7.42",
  VT: "6.39",
  VA: "5.77",
  WA: "9.51",
  WV: "6.59",
  WI: "5.72",
  WY: "5.56",
  DC: "6.00",
}

function normalizeZip(zip: string): string {
  return zip.trim()
}

function isValidZip(zip: string): boolean {
  // 5-digit ZIP or ZIP+4
  return /^\d{5}(?:-\d{4})?$/.test(zip)
}

async function resolveStateFromZip(zip: string, apiKey: string): Promise<string | null> {
  const response = await fetch(
    `https://api.api-ninjas.com/v1/zipcode?zip=${encodeURIComponent(zip)}`,
    { headers: { "X-Api-Key": apiKey } }
  )
  if (!response.ok) return null
  const data = await response.json()
  if (Array.isArray(data) && data.length > 0) {
    const state = data[0]?.state
    if (typeof state === "string" && state.trim()) return state.trim().toUpperCase()
  }
  return null
}

interface ExtendedUser extends User {
  contractor_profile?: ContractorProfile
  contractor_ai_sp_id?: number | null
  preferred_language?: string | null
}

interface AuthContextType {
  user: ExtendedUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  getContractorAISpId: () => number | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchUser = async () => {
    try {
      const userData = await api.getCurrentUser()
      const extendedUser: ExtendedUser = { ...userData }
      
      // If user is a contractor, try to get their contractor profile to get SP ID
      // Skip fetching profile if we're on the profile setup page (profile doesn't exist yet)
      if (userData.is_contractor && !pathname.match(/\/auth\/profile-setup$/)) {
        try {
          const profile = await api.getMyProfile() as ContractorProfile & { contractor_ai_sp_id?: number | null }
          let effectiveProfile: ContractorProfile = profile

          // After onboarding, we want to derive tax rate from zipcode once (no "while typing" lookups).
          // Profile setup stores zipcode in localStorage; we consume it here post-redirect and patch the profile.
          try {
            const pendingZipRaw = localStorage.getItem(PENDING_ZIP_STORAGE_KEY) || ""
            const pendingZip = normalizeZip(pendingZipRaw)
            const apiKey = process.env.NEXT_PUBLIC_API_NINJA_KEY

            if (pendingZip && isValidZip(pendingZip) && apiKey) {
              const state = await resolveStateFromZip(pendingZip, apiKey)
              const rate = state ? STATE_TAX_RATES[state] : null

              if (rate) {
                const updated = await api.updateProfile({
                  default_zip_code: pendingZip,
                  default_sales_tax_rate: parseFloat(rate),
                }) as ContractorProfile
                effectiveProfile = updated ?? effectiveProfile
                localStorage.removeItem(PENDING_ZIP_STORAGE_KEY)
              }
            }
          } catch {
            // ignore localStorage/network failures
          }

          extendedUser.contractor_profile = effectiveProfile
          extendedUser.contractor_ai_sp_id = (effectiveProfile as any)?.contractor_ai_sp_id ?? null
        } catch (profileError: any) {
          // Profile might not exist yet, that's expected and okay
          // Silently handle "not found" errors - they're expected when user hasn't created profile yet
          const errorMessage = profileError?.message?.toLowerCase() || ""
          if (errorMessage && !errorMessage.includes("not found") && !errorMessage.includes("contractor profile")) {
            // Only log unexpected errors (and only in development)
            if (process.env.NODE_ENV === 'development') {
              console.warn('Unexpected error fetching contractor profile:', profileError)
            }
          }
          extendedUser.contractor_ai_sp_id = null
        }
      }
      
      setUser(extendedUser)
    } catch (error: any) {
      // Only clear the user session on actual auth failures (401/403).
      // Transient errors (network blip, 500, timeout) should not log the user out.
      const status = error?.status ?? error?.response?.status
      const msg = String(error?.message ?? "")
      const isAuthFailure =
        status === 401 ||
        status === 403 ||
        msg.includes("401") ||
        msg.includes("Unauthorized") ||
        msg.includes("Forbidden")
      if (isAuthFailure) {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount — re-fetching on every pathname change causes auth redirect loops


  const login = async (email: string, password: string) => {
    await api.login(email, password)
    await fetchUser()
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (error) {
      // Continue with logout even if API call fails
    }
    setUser(null)
    // Clear cached ContractorOps number
    clearContractorOpsNumber()
    // Redirect to login with current locale
    router.push("/en/auth/login")
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  const getContractorAISpId = () => {
    return user?.contractor_ai_sp_id || null
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, getContractorAISpId }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

