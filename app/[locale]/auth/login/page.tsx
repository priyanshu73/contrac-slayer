"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}
const transition = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }

export default function LoginPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("auth")
  const { login, refreshUser } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(formData.email, formData.password)
      await refreshUser()
      router.push(`/${locale}/dashboard`)
    } catch (err: any) {
      const errorMessage = err.message || t("invalidCredentials")
      
      // Check if error is about email verification
      if (errorMessage.toLowerCase().includes("email not verified") || errorMessage.toLowerCase().includes("verify your email")) {
        // Automatically send OTP when email is not verified
        try {
          await api.sendOtp(formData.email)
          // Show toast with verify email option
          toast({
            title: t("emailNotVerified"),
            description: t("otpSentDescription"),
            variant: "default",
            action: (
              <ToastAction
                altText={t("verifyEmail")}
                onClick={() => router.push(`/${locale}/auth/verify-otp?email=${encodeURIComponent(formData.email)}&fromLogin=true`)}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0"
              >
                {t("verifyEmail")}
              </ToastAction>
            ),
          })
        } catch (otpErr: any) {
          setError(otpErr.message || t("failedToSendVerification"))
        }
      } else {
        setError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-[#f6f8fb] lg:grid-cols-[0.95fr_1.05fr]">
      <aside className="relative hidden overflow-hidden lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/hero2.webp)' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(6,13,24,0.82),rgba(6,13,24,0.62)_48%,rgba(6,13,24,0.28))]" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#f6f8fb] to-transparent" />

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
              Welcome back
            </motion.p>
            <motion.h2
              className="text-4xl font-semibold leading-[1.05] tracking-tight text-white xl:text-6xl"
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              transition={{ ...transition, delay: 0.24 }}
            >
              {t("welcomeBackCommandCenter")}
            </motion.h2>
            <motion.p
              className="mt-6 max-w-md text-lg leading-8 text-white/72"
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              transition={{ ...transition, delay: 0.32 }}
            >
              {t("manageBusiness")}
            </motion.p>
          </div>

          <motion.div
            className="grid max-w-lg gap-3 text-sm font-semibold text-white/72"
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.4 }}
          >
            {["Leads, quotes, projects, and invoices in one place", "Built for fast-moving contractor teams", "Clean workspace for daily operations"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-white/64" />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
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
            <span>{t("backToHome")}</span>
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
                {t("welcomeBack")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t("loginSubtitle")}</p>
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
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
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
                    <span>{t("loggingIn")}</span>
                  </div>
                ) : (
                  t("logIn")
                )}
              </Button>
            </form>

            <div className="mt-8 space-y-3 text-center">
              <p className="text-sm text-slate-500">
                <a href={`/${locale}/auth/forgot-password`} className="font-bold text-slate-950 hover:underline">
                  {t("forgotPassword")}
                </a>
              </p>
              <p className="text-sm text-slate-500">
                {t("dontHaveAccount")}{" "}
                <a href={`/${locale}/auth/signup`} className="font-bold text-slate-950 hover:underline">
                  {t("signUpForFree")}
                </a>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
