"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"

const CONTRACTOR_OPS_AI_NUMBER_KEY = "contractorOpsAiNumber"

/**
 * Custom hook to fetch and cache the ContractorOps AI number.
 * Checks localStorage first, fetches from API only if not cached.
 * Automatically stores in localStorage on successful fetch.
 */
export function useContractorOpsNumber() {
  // Initialize number and loading state based on cache
  const [number, setNumber] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(CONTRACTOR_OPS_AI_NUMBER_KEY)
  })
  
  // Only show loading if we don't have a cached value
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return false
    return !localStorage.getItem(CONTRACTOR_OPS_AI_NUMBER_KEY)
  })
  
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchNumber = async () => {
      // If we already have a cached number, don't fetch
      const cached = typeof window !== "undefined" ? localStorage.getItem(CONTRACTOR_OPS_AI_NUMBER_KEY) : null
      if (cached) {
        // Already have it, no need to fetch
        return
      }

      // No cached number, fetch from API (loading already true from initialization)
      setError(null)

      try {
        const { twilio_number } = await api.getContractorOpsAiNumber()
        
        if (!cancelled) {
          if (twilio_number && typeof window !== "undefined") {
            localStorage.setItem(CONTRACTOR_OPS_AI_NUMBER_KEY, twilio_number)
            setNumber(twilio_number)
          } else if (!twilio_number && typeof window !== "undefined") {
            localStorage.removeItem(CONTRACTOR_OPS_AI_NUMBER_KEY)
            setNumber(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to fetch number"))
          setNumber(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchNumber()

    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Force refresh the number from the API (bypasses cache)
   */
  const refresh = async () => {
    setLoading(true)
    setError(null)

    try {
      const { twilio_number } = await api.getContractorOpsAiNumber()
      
      if (twilio_number && typeof window !== "undefined") {
        localStorage.setItem(CONTRACTOR_OPS_AI_NUMBER_KEY, twilio_number)
        setNumber(twilio_number)
      } else if (!twilio_number && typeof window !== "undefined") {
        localStorage.removeItem(CONTRACTOR_OPS_AI_NUMBER_KEY)
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
 * Clear the cached ContractorOps AI number from localStorage.
 * Call this on logout.
 */
export function clearContractorOpsNumber() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CONTRACTOR_OPS_AI_NUMBER_KEY)
  }
}
