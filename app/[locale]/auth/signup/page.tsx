"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

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
      await api.signup(formData.email, formData.password, formData.full_name)
      
      // Track referral if present (don't await - fire and forget)
      trackReferral(formData.full_name)
      
      // Redirect to OTP verification page
      router.push(`/${locale}/auth/verify-otp?email=${encodeURIComponent(formData.email)}`)
    } catch (err: any) {
      setError(err.message || "An error occurred during signup")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[0.95fr_1.05fr]">
      <aside className="relative hidden overflow-hidden lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/signup.jpg)' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(6,13,24,0.85),rgba(6,13,24,0.65)_50%,rgba(6,13,24,0.45))]" />

        <div className="relative z-10 flex w-full flex-col justify-between px-12 py-10 text-white xl:px-16">
          <motion.div
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-full object-contain" />
            </span>
            <span className="text-lg font-black tracking-tight">ContractorOps AI</span>
          </motion.div>

          <div className="max-w-xl">
            <motion.p
              className="mb-5 text-sm font-black uppercase tracking-[0.18em] text-white/50"
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              transition={{ ...transition, delay: 0.18 }}
            >
              Start clean
            </motion.p>
            <motion.h2
              className="text-4xl font-semibold leading-[1.05] tracking-tight text-white xl:text-6xl"
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              transition={{ ...transition, delay: 0.24 }}
            >
              {t("signupHeadline")}
            </motion.h2>
            <motion.p
              className="mt-6 max-w-md text-lg leading-8 text-white/72"
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              transition={{ ...transition, delay: 0.32 }}
            >
              {t("signupSubtitle")}
            </motion.p>
          </div>

          <motion.div
            className="grid max-w-lg gap-3 text-sm font-semibold text-white/72"
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.4 }}
          >
            {[t("signupFeature1"), t("signupFeature2"), t("signupFeature3")].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-white/64" />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </aside>

      <section className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-8 sm:px-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...transition, delay: 0.15 }}
        >
          <button
            onClick={() => router.push(`/${locale}`)}
            className="mb-6 inline-flex items-center gap-2 rounded-full px-1 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to home</span>
          </button>

          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.25 }}
          >
            <div className="mb-8">
              <div className="mb-6 flex items-center gap-3 lg:hidden">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                  <img src="/logo.png" alt="Logo" className="h-9 w-9 rounded-full object-contain" />
                </span>
                <span className="text-base font-black text-slate-950">ContractorOps AI</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">
                {t("signupFormTitle")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t("signupFormSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-semibold text-slate-700">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  disabled={isLoading}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 text-slate-950 shadow-none transition-colors focus:bg-white focus-visible:ring-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">{t("emailAddress")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 text-slate-950 shadow-none transition-colors focus:bg-white focus-visible:ring-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 text-slate-950 shadow-none transition-colors focus:bg-white focus-visible:ring-slate-300"
                />
                <p className="text-xs text-slate-500">{tForms("passwordTooShort")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">{t("confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 text-slate-950 shadow-none transition-colors focus:bg-white focus-visible:ring-slate-300"
                />
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-slate-950 text-base font-bold text-white shadow-none transition-colors hover:bg-slate-800"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                {t("alreadyHaveAccount")}{" "}
                <a href={`/${locale}/auth/login`} className="font-bold text-slate-950 hover:underline">
                  {t("logIn")}
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
