"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { api } from "@/lib/api"
import { User, ContractorProfile } from "@/lib/types"

interface ExtendedUser extends User {
  contractor_profile?: ContractorProfile
  contractor_ai_sp_id?: number | null
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
      if (userData.is_contractor && pathname !== "/auth/profile-setup") {
        try {
          const profile = await api.getMyProfile() as ContractorProfile & { contractor_ai_sp_id?: number | null }
          extendedUser.contractor_profile = profile
          extendedUser.contractor_ai_sp_id = profile.contractor_ai_sp_id ?? null
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
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [pathname])

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
    router.push("/auth/login")
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

