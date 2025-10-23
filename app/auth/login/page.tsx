"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"

export default function LoginPage() {
  const router = useRouter()
  const { login, refreshUser } = useAuth()
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
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "Invalid credentials")
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

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-center px-16 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/imagee.jpg)' }}
        >
          {/* Darker overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/45 to-black/50"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3 bg-gradient-to-br from-blue-500/25 to-sky-500/25 backdrop-blur-md rounded-2xl p-4 inline-flex shadow-2xl border border-blue-300/30">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-sky-500 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-3xl font-bold text-white drop-shadow-2xl" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)' }}>
              ContractPro
            </span>
          </div>
          <div className="bg-gradient-to-br from-blue-500/15 to-sky-500/15 backdrop-blur-sm rounded-2xl p-6 inline-block shadow-2xl border border-blue-300/20">
            <h2 className="text-5xl font-bold leading-tight text-white" style={{ textShadow: '0 6px 20px rgba(0,0,0,0.6), 0 3px 8px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)' }}>
              Welcome back to your command center
            </h2>
          </div>
          <p className="text-xl text-white font-medium bg-gradient-to-br from-blue-500/15 to-sky-500/15 backdrop-blur-sm rounded-xl p-4 inline-block shadow-xl border border-blue-300/20" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)' }}>
            Manage your contracting business with confidence. All your tools in one place.
          </p>
          <div className="flex gap-6 pt-8">
            <div className="flex items-center gap-3 bg-gradient-to-br from-blue-500/20 to-sky-500/20 backdrop-blur-md rounded-xl p-4 shadow-xl border border-blue-300/30">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-sky-500 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-white" style={{ textShadow: '0 4px 8px rgba(0,0,0,0.5)' }}>500+</div>
                <div className="text-white text-sm font-medium" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>Contractors</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-md rounded-xl p-4 shadow-xl border border-yellow-300/30">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-white" style={{ textShadow: '0 4px 8px rgba(0,0,0,0.5)' }}>4.9/5</div>
                <div className="text-white text-sm font-medium" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
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

        <div className="w-full max-w-md relative z-10">
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-blue-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-gray-600 mt-2">Log in to your contractor account</p>
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
                <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
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
                    <span>Logging in...</span>
                  </div>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <a href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                  Sign up for free
                </a>
              </p>
            </div>
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

