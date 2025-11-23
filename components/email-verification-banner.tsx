"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"

export function EmailVerificationBanner() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Don't show on auth pages, public pages, or homepage
  if (
    !user ||
    user.is_email_verified ||
    pathname === "/" ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/quote-request")
  ) {
    return null
  }

  const handleSendOtp = async () => {
    setIsSending(true)
    setMessage(null)

    try {
      await api.sendOtp(user.email)
      setMessage({ type: "success", text: "Verification code sent! Check your email." })
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to send verification code" })
    } finally {
      setIsSending(false)
    }
  }

  const handleVerifyEmail = () => {
    router.push(`/auth/verify-otp?email=${encodeURIComponent(user.email)}`)
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 print:hidden">
      <div className="container mx-auto">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Email Not Verified
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Please verify your email address to access all features.</p>
              {message && (
                <p className={`mt-1 ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>
                  {message.text}
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleSendOtp}
                disabled={isSending}
                size="sm"
                variant="outline"
                className="bg-white hover:bg-yellow-50"
              >
                {isSending ? "Sending..." : "Resend Code"}
              </Button>
              <Button
                onClick={handleVerifyEmail}
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Verify Email
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

