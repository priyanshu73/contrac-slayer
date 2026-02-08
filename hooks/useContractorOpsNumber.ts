"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

const CACHE_KEY_PREFIX = "contractorOpsAiNumber"

function getCacheKey(profileId: string | number | null | undefined): string {
  if (profileId == null || profileId === "") return ""
  return `${CACHE_KEY_PREFIX}_${profileId}`
}

/**
 * Custom hook to fetch and cache the ContractorOps AI number.
 * Cache is keyed by current user's contractor_profile.id (or user.id) so it's profile-specific.
 */
export function useContractorOpsNumber() {
  const { user } = useAuth()
  const profileId = user?.contractor_profile?.id ?? user?.id ?? null
  const cacheKey = useMemo(() => getCacheKey(profileId), [profileId])

  const [number, setNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!cacheKey) {
      setNumber(null)
      setLoading(false)
      return
    }

    // Remove legacy key (profile-agnostic) if present so we don't keep stale data
    if (typeof window !== "undefined") {
      localStorage.removeItem(CACHE_KEY_PREFIX)
    }

    let cancelled = false
    const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null
    if (cached) {
      setNumber(cached)
      setLoading(false)
      return
    }

    setError(null)

    const fetchNumber = async () => {
      try {
        const { twilio_number } = await api.getContractorOpsAiNumber()
        if (cancelled) return
        if (twilio_number && typeof window !== "undefined") {
          localStorage.setItem(cacheKey, twilio_number)
          setNumber(twilio_number)
        } else if (typeof window !== "undefined") {
          localStorage.removeItem(cacheKey)
          setNumber(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch number"))
          setNumber(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchNumber()
    return () => { cancelled = true }
  }, [cacheKey])

  const refresh = async () => {
    if (!cacheKey) return
    setLoading(true)
    setError(null)
    try {
      const { twilio_number } = await api.getContractorOpsAiNumber()
      if (twilio_number && typeof window !== "undefined") {
        localStorage.setItem(cacheKey, twilio_number)
        setNumber(twilio_number)
      } else if (typeof window !== "undefined") {
        localStorage.removeItem(cacheKey)
        setNumber(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch number"))
    } finally {
      setLoading(false)
    }
  }

  return {
    number,
    loading,
    error,
    refresh,
  }
}

/**
 * Clear all profile-specific ContractorOps AI number caches from localStorage.
 * Call this on logout so the next user doesn't see the previous profile's number.
 */
export function clearContractorOpsNumber() {
  if (typeof window === "undefined") return
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(CACHE_KEY_PREFIX)) keysToRemove.push(key)
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}
