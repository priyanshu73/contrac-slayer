"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

export default function VerifyOTPPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [email, setEmail] = useState("")
  const [fromLogin, setFromLogin] = useState(false)
  const initialOtpSentRef = useRef<string | null>(null)

  // Extract email and fromLogin from searchParams once
  const emailParam = searchParams?.get("email") || ""
  const fromLoginParam = searchParams?.get("fromLogin") === "true"

  useEffect(() => {
    if (!emailParam) {
      router.push("/auth/signup")
      return
    }

    // Set email and fromLogin state
    setEmail(emailParam)
    setFromLogin(fromLoginParam)

    // Only auto-send OTP if coming from signup, not from login, and haven't sent for this email yet
    // If from login, OTP was already sent, so just show the page
    if (!fromLoginParam && initialOtpSentRef.current !== emailParam) {
      initialOtpSentRef.current = emailParam
      const sendInitialOtp = async () => {
        setIsSending(true)
        setError("")
        setSuccess("")

        try {
          await api.sendOtp(emailParam)
          setSuccess("OTP sent successfully! Check your email.")
        } catch (err: any) {
          setError(err.message || "Failed to send OTP")
          // Reset ref on error so user can try again
          initialOtpSentRef.current = null
        } finally {
          setIsSending(false)
        }
      }

      sendInitialOtp()
    } else if (fromLoginParam && !success) {
      // From login - OTP was already sent, just show message (only once)
      setSuccess("Please enter the OTP sent to your email.")
    }
  }, [emailParam, fromLoginParam, router, success])

  const sendOtp = async () => {
    if (!email) return

    setIsSending(true)
    setError("")
    setSuccess("")

    try {
      await api.sendOtp(email)
      setSuccess("OTP sent successfully! Check your email.")
      // Clear OTP boxes
      setOtp(["", "", "", "", "", ""])
      // Focus first input
      document.getElementById("otp-0")?.focus()
    } catch (err: any) {
      setError(err.message || "Failed to send OTP")
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const otpString = otp.join("")
    if (!otpString || otpString.length !== 6) {
      setError("Please enter a valid 6-digit OTP")
      return
    }

    if (!email) {
      setError("Invalid session. Please sign up again.")
      return
    }

    setIsLoading(true)
    setIsAuthenticating(true)

    try {
      const otpString = otp.join("")
      const response = await api.verifyOtp(email, otpString) as any
      // Refresh user data
      await refreshUser()
      // Small delay for smoother transition
      await new Promise(resolve => setTimeout(resolve, 500))
      // Redirect to dashboard if coming from login, otherwise profile setup
      router.push(fromLogin ? "/dashboard" : "/auth/profile-setup")
    } catch (err: any) {
      setIsAuthenticating(false)
      setError(err.message || "Invalid OTP. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (value: string, index: number) => {
    if (/^\d?$/.test(value)) {
      const updated = [...otp]
      updated[index] = value
      setOtp(updated)
      // Auto-focus next input
      if (value && index < otp.length - 1) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Handle backspace to go to previous input
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, "").slice(0, 6).split("")
        const updated = [...otp]
        digits.forEach((digit, idx) => {
          if (index + idx < otp.length) {
            updated[index + idx] = digit
          }
        })
        setOtp(updated)
        // Focus the last filled input or the last input
        const lastFilledIndex = Math.min(index + digits.length - 1, otp.length - 1)
        const lastInput = document.getElementById(`otp-${lastFilledIndex}`)
        lastInput?.focus()
      })
    }
  }

  // Show full-screen loading overlay during authentication
  if (isAuthenticating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="relative">
          {/* Abstract spinning circles */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-blue-50"></div>
            <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-blue-400 border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-blue-600 text-center animate-pulse">Verifying and logging you in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md relative z-10">
          {/* Back button - goes to login if from login, otherwise signup */}
          <button
            onClick={() => router.push(fromLogin ? "/auth/login" : "/auth/signup")}
            className="mb-8 flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to {fromLogin ? "login" : "signup"}</span>
          </button>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-blue-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Verify Your Email
              </h1>
              <p className="text-gray-600 mt-2">
                We've sent a 6-digit code to <span className="font-semibold">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-gray-700 font-medium block text-center mb-4">Enter Verification Code</Label>
                <div className="flex justify-center gap-3 mb-4">
                  {otp.map((digit, idx) => (
                    <Input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      required
                      maxLength={1}
                      disabled={isLoading}
                      className="w-14 h-14 text-center text-2xl font-semibold rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center">Enter the 6-digit code sent to your email</p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-base shadow-lg shadow-blue-500/30 transform hover:scale-[1.02] transition-all"
                disabled={isLoading || otp.join("").length !== 6}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify Email"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={isSending}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? "Sending..." : "Resend OTP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Animation CSS */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  )
}

