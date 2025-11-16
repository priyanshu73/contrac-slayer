"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

interface User {
  id: number
  email: string
  full_name: string
  is_contractor: boolean
  contractor_profile?: any
  contractor_ai_sp_id?: number | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  getContractorAISpId: () => number | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchUser = async () => {
    try {
      const userData = await api.getCurrentUser()
      
      // If user is a contractor, try to get their contractor profile to get SP ID
      if (userData.is_contractor) {
        try {
          const profile = await api.getMyProfile()
          userData.contractor_profile = profile
          userData.contractor_ai_sp_id = profile.contractor_ai_sp_id
        } catch (profileError) {
          // Profile might not exist yet, that's okay
          console.log('No contractor profile found or error fetching profile:', profileError)
          userData.contractor_ai_sp_id = null
        }
      }
      
      setUser(userData)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

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

