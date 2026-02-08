"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}
const transition = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }

export default function SignupPage() {
  const router = useRouter()
  const locale = useLocale()
  const searchParams = useSearchParams()
  const t = useTranslations("auth")
  const tForms = useTranslations("forms")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [referralId, setReferralId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
  })
  const [activeFeatureTab, setActiveFeatureTab] = useState(0)

  const features = [t("signupFeature1"), t("signupFeature2"), t("signupFeature3"), t("signupFeature4")]
  const featureTabLabels = [t("signupTabLeads"), t("signupTabQuotes"), t("signupTabCalendar"), t("signupTabInvoices")]

  // Get referral ID from URL params or sessionStorage
  useEffect(() => {
    const refFromUrl = searchParams.get("ref") || searchParams.get("referral_id")
    if (refFromUrl) {
      setReferralId(refFromUrl)
      sessionStorage.setItem("referral_id", refFromUrl)
    } else {
      const storedRef = sessionStorage.getItem("referral_id")
      if (storedRef) {
        setReferralId(storedRef)
      }
    }
  }, [searchParams])

  // Function to track referral in SheetDB
  const trackReferral = async (customerName: string) => {
    if (!referralId) return

    const sheetDbUrl = process.env.NEXT_PUBLIC_SHEETDB_API
    if (!sheetDbUrl) {
      console.warn("SHEETDB_API environment variable not set")
      return
    }

    try {
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD format

      await fetch(sheetDbUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            id: referralId,
            customer_name: customerName,
            date: dateStr,
          },
        }),
      })

      // Clear referral from sessionStorage after successful tracking
      sessionStorage.removeItem("referral_id")
    } catch (err) {
      // Don't block signup if referral tracking fails
      console.error("Failed to track referral:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError(tForms("passwordsDoNotMatch"))
      return
    }

    if (formData.password.length < 8) {
      setError(tForms("passwordTooShort"))
      return
    }

    setIsLoading(true)

    try {
      const response = await api.signup(formData.email, formData.password, formData.full_name) as any
      
      // Track referral if present (don't await - fire and forget)
      trackReferral(formData.full_name)
      
      // Redirect to OTP verification page
      router.push(`/auth/verify-otp?email=${encodeURIComponent(formData.email)}`)
    } catch (err: any) {
      setError(err.message || "An error occurred during signup")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* Left Side - Branding (centered like login, no full left-align) */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/signup.jpg)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.25) 75%, transparent 100%)',
          }}
        />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />

        {/* Content: centered in panel */}
        <div className="relative z-10 w-full max-w-md mx-auto px-10 text-center">
          <motion.div
            className="flex items-center justify-center gap-3 mb-10"
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.1 }}
          >
            <img src="/logo.png" alt="Logo" className="w-11 h-11 object-contain" />
            <span className="text-2xl font-bold text-white tracking-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              ContractorOps AI
            </span>
          </motion.div>

          <motion.h2
            className="text-5xl lg:text-6xl font-extrabold leading-[1.1] text-white tracking-tight mb-6"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4), 0 0 40px rgba(59, 130, 246, 0.08)' }}
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.2 }}
          >
            {t("signupHeadline")}
          </motion.h2>

          <motion.p
            className="text-xl text-white/80 font-normal max-w-sm leading-relaxed mb-8 mx-auto"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.35 }}
          >
            {t("signupSubtitle")}
          </motion.p>

          {/* Features - tabs */}
          <motion.div
            className="w-full max-w-sm mx-auto"
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.5 }}
          >
            <div className="flex gap-1 p-1 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              {featureTabLabels.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveFeatureTab(i)}
                  className={`flex-1 min-w-0 py-2.5 px-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeFeatureTab === i
                      ? 'bg-white text-blue-900 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p
              className="mt-4 text-white/90 text-lg font-medium text-center min-h-[3rem] flex items-center justify-center"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
            >
              {features[activeFeatureTab]}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        {/* Subtle fade-in from left edge */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-transparent pointer-events-none z-0" />
        {/* Floating animated elements - More bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Small bubbles */}
          <div className="absolute top-[15%] left-[10%] w-3 h-3 bg-sky-300 rounded-full animate-float opacity-40" style={{ animationDelay: "0s", animationDuration: "6s" }}></div>
          <div className="absolute top-[25%] right-[15%] w-2 h-2 bg-blue-300 rounded-full animate-float opacity-30" style={{ animationDelay: "1s", animationDuration: "7s" }}></div>
          <div className="absolute top-[45%] left-[20%] w-4 h-4 border-2 border-sky-200 rounded-full animate-float-slow opacity-30" style={{ animationDelay: "0.5s" }}></div>
          <div className="absolute top-[60%] right-[25%] w-3 h-3 border-2 border-blue-200 rounded-sm animate-float-slow opacity-25" style={{ animationDelay: "1.5s" }}></div>
          <div className="absolute bottom-[30%] left-[15%] w-2 h-2 bg-cyan-300 rounded-full animate-float opacity-35" style={{ animationDelay: "2s", animationDuration: "5s" }}></div>
          <div className="absolute bottom-[15%] right-[20%] w-3 h-3 bg-sky-200 rounded-sm animate-float opacity-30" style={{ animationDelay: "0.8s", animationDuration: "6.5s" }}></div>
          
          {/* Additional bubbles */}
          <div className="absolute top-[10%] right-[30%] w-2 h-2 bg-blue-200 rounded-full animate-float opacity-35" style={{ animationDelay: "2.5s", animationDuration: "6s" }}></div>
          <div className="absolute top-[35%] left-[8%] w-3 h-3 bg-cyan-300 rounded-full animate-float-slow opacity-30" style={{ animationDelay: "1.8s" }}></div>
          <div className="absolute top-[50%] right-[10%] w-4 h-4 border-2 border-sky-300 rounded-full animate-float opacity-25" style={{ animationDelay: "0.3s", animationDuration: "7s" }}></div>
          <div className="absolute top-[70%] left-[25%] w-2 h-2 bg-sky-400 rounded-full animate-float-slow opacity-40" style={{ animationDelay: "2.2s" }}></div>
          <div className="absolute bottom-[40%] right-[18%] w-3 h-3 bg-blue-300 rounded-full animate-float opacity-30" style={{ animationDelay: "1.2s", animationDuration: "5.5s" }}></div>
          <div className="absolute bottom-[25%] left-[12%] w-2 h-2 border-2 border-cyan-200 rounded-full animate-float-slow opacity-35" style={{ animationDelay: "0.7s" }}></div>
          <div className="absolute bottom-[10%] right-[28%] w-3 h-3 bg-sky-300 rounded-full animate-float opacity-30" style={{ animationDelay: "1.9s", animationDuration: "6.2s" }}></div>
          <div className="absolute top-[38%] right-[22%] w-2 h-2 bg-cyan-400 rounded-full animate-float-slow opacity-35" style={{ animationDelay: "2.8s" }}></div>
        </div>

        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...transition, delay: 0.15 }}
        >
          {/* Back to Home */}
          <button
            onClick={() => router.push("/")}
            className="mb-8 flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to home</span>
          </button>

          {/* Form Card */}
          <motion.div
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-blue-100 p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.25 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                {t("signupFormTitle")}
              </h1>
              <p className="text-gray-600 mt-2">{t("signupFormSubtitle")}</p>
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

          <div className="space-y-2">
                <Label htmlFor="full_name" className="text-gray-700 font-medium">Full Name</Label>
            <Input
              id="full_name"
              type="text"
                  placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              disabled={isLoading}
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">{t("emailAddress")}</Label>
            <Input
              id="email"
              type="email"
                  placeholder={t("emailPlaceholder")}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
            <Input
              id="password"
              type="password"
                  placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              disabled={isLoading}
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
                <p className="text-xs text-gray-500">{tForms("passwordTooShort")}</p>
          </div>

          <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
                  placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              minLength={8}
              disabled={isLoading}
                  className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-base shadow-lg shadow-blue-500/30 transform hover:scale-[1.02] transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
          </Button>
        </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                {t("alreadyHaveAccount")}{" "}
                <a href={`/${locale}/auth/login`} className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                  {t("logIn")}
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
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
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
            opacity: 0.4;
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(90deg);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-40px) translateX(-10px) rotate(180deg);
            opacity: 0.6;
          }
          75% {
            transform: translateY(-20px) translateX(10px) rotate(270deg);
            opacity: 0.5;
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-30px) scale(1.1);
            opacity: 0.5;
          }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

