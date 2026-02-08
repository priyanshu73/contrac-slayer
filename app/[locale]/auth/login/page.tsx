"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
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
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* Left Side - Intentional, grid-aligned, no glass */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center overflow-hidden">
        {/* Background: image as texture + strong L→R dark gradient */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/hero2.webp)' }}
        />
        {/* 60–70% darker on left, fading to lighter toward center; image = texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.25) 75%, transparent 100%)',
          }}
        />
        {/* Soft vignette for depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 120px rgba(0,0,0,0.15)',
          }}
        />
        {/* Fade into right (form side) */}
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />

        {/* Vertical divider */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-48 bg-white/30 z-10" />

        {/* Content: centered in panel, not fully left-aligned */}
        <div className="relative z-10 w-full max-w-md mx-auto px-10 text-center">
          {/* Logo */}
          <motion.div
            className="flex items-center justify-center gap-3 mb-12"
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.1 }}
          >
            <img src="/logo.png" alt="Logo" className="w-11 h-11 object-contain" />
            <span className="text-2xl font-bold text-white tracking-tight">
              ContractorOps AI
            </span>
          </motion.div>

          {/* Headline: huge, bold, no glass */}
          <motion.h2
            className="text-5xl lg:text-6xl font-extrabold leading-[1.1] text-white tracking-tight mb-6"
            style={{
              textShadow: '0 2px 20px rgba(0,0,0,0.4), 0 0 40px rgba(59, 130, 246, 0.08)',
            }}
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.2 }}
          >
            {t("welcomeBackCommandCenter")} !
          </motion.h2>

          {/* Subtext: small, muted */}
          <motion.p
            className="text-xl text-white/80 font-normal max-w-sm leading-relaxed mb-10 mx-auto"
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.35 }}
          >
            {t("manageBusiness")}
          </motion.p>

          {/* Micro trust line */}
          <motion.p
            className="text-xl text-white/50 font-medium mt-2"
            initial={fadeUp.initial}
            animate={fadeUp.animate}
            transition={{ ...transition, delay: 0.5 }}
          >
            50+ Contractors and growing
          </motion.p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        {/* Subtle fade-in from left edge */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-transparent pointer-events-none z-0"></div>
        
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
            onClick={() => router.push(`/${locale}`)}
            className="mb-8 flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>{t("backToHome")}</span>
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
                {t("welcomeBack")}
              </h1>
              <p className="text-gray-600 mt-2">{t("loginSubtitle")}</p>
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
                <Label htmlFor="password" className="text-gray-700 font-medium">{t("password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
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
                    <span>{t("loggingIn")}</span>
                  </div>
                ) : (
                  t("logIn")
                )}
              </Button>
            </form>

            <div className="mt-8 space-y-3 text-center">
              <p className="text-sm text-gray-600">
                <a href={`/${locale}/auth/forgot-password`} className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                  {t("forgotPassword")}
                </a>
              </p>
              <p className="text-sm text-gray-600">
                {t("dontHaveAccount")}{" "}
                <a href={`/${locale}/auth/signup`} className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                  {t("signUpForFree")}
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

