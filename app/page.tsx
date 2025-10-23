"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

export default function LandingPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return null // AuthGuard will show the loading spinner
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large blob gradients */}
        <div
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-sky-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"
          style={{ animationDelay: "0s" }}
        ></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"
          style={{ animationDelay: "4s" }}
        ></div>

        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-[10%] w-4 h-4 bg-sky-400 rounded-full animate-float" style={{ animationDelay: "0s", animationDuration: "6s" }}></div>
        <div className="absolute top-40 right-[15%] w-3 h-3 bg-blue-400 rounded-sm animate-float" style={{ animationDelay: "1s", animationDuration: "7s" }}></div>
        <div className="absolute top-60 left-[20%] w-2 h-2 bg-cyan-400 rounded-full animate-float" style={{ animationDelay: "2s", animationDuration: "5s" }}></div>
        
        <div className="absolute top-[30%] right-[25%] w-6 h-6 border-2 border-sky-300 rounded-full animate-float-slow" style={{ animationDelay: "0.5s" }}></div>
        <div className="absolute top-[45%] left-[15%] w-5 h-5 border-2 border-blue-300 rounded-sm rotate-45 animate-float-slow" style={{ animationDelay: "1.5s" }}></div>
        <div className="absolute top-[60%] right-[30%] w-4 h-4 border-2 border-cyan-300 rounded-sm animate-float-slow" style={{ animationDelay: "2.5s" }}></div>
        
        <div className="absolute bottom-[20%] left-[25%] w-3 h-3 bg-sky-300 rounded-full animate-float" style={{ animationDelay: "0.8s", animationDuration: "6.5s" }}></div>
        <div className="absolute bottom-[35%] right-[20%] w-2 h-2 bg-blue-300 rounded-sm animate-float" style={{ animationDelay: "1.8s", animationDuration: "5.5s" }}></div>
        
        {/* Animated grid lines */}
        <div className="absolute top-[15%] left-0 w-full h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent animate-pulse" style={{ animationDuration: "3s" }}></div>
        <div className="absolute top-[75%] left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent animate-pulse" style={{ animationDuration: "4s", animationDelay: "1s" }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-400/30">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent">
            ContractPro
          </span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push("/auth/login")}
            className="hover:bg-sky-100/60 text-gray-700"
          >
            Log In
          </Button>
          <Button
            onClick={() => router.push("/auth/signup")}
            className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-lg shadow-sky-500/40"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-20 pb-32 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div
            className="text-center space-y-8 transform transition-all duration-200"
            style={{
              transform: `translateY(${scrollY * 0.3}px)`,
              opacity: 1 - scrollY * 0.002,
            }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100/80 backdrop-blur-sm rounded-full border border-sky-200/60 shadow-sm">
              <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-sky-700">
                Built for Landscape Contractors
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-blue-700 bg-clip-text text-transparent">
                Manage Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 bg-clip-text text-transparent">
                Contracting Business
              </span>
              <br />
              <span className="text-gray-700">With Confidence</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Streamline your leads, create professional quotes, manage jobs, and grow your landscaping business—all in one beautiful platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <Button
                size="lg"
                onClick={() => router.push("/auth/signup")}
                className="bg-gradient-to-r from-sky-500 via-blue-500 to-blue-600 hover:from-sky-600 hover:via-blue-600 hover:to-blue-700 text-white px-8 py-6 text-lg shadow-2xl shadow-sky-500/50 hover:shadow-sky-600/60 transform hover:scale-105 transition-all"
              >
                Start Free Trial
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
                }}
                className="border-2 border-sky-300 text-sky-700 hover:bg-sky-50 px-8 py-6 text-lg backdrop-blur-sm"
              >
                Learn More
              </Button>
            </div>

            {/* Social Proof */}
            <div className="pt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span>500+ Contractors</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>4.9/5 Rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 py-20 md:px-12 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent">
                Everything You Need
              </span>
            </h2>
            <p className="text-xl text-gray-600">
              Powerful tools designed specifically for landscape contractors
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 border border-sky-100 hover:border-sky-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-sky-400/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Lead Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Capture leads from your website with photo uploads. Track status, priority, and never miss an opportunity.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 border border-sky-100 hover:border-sky-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-sky-400/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Smart Quotes</h3>
              <p className="text-gray-600 leading-relaxed">
                Create professional quotes with AI-powered pricing suggestions. Send, track, and convert faster.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 border border-sky-100 hover:border-sky-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-sky-400/30">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Job Scheduling</h3>
              <p className="text-gray-600 leading-relaxed">
                Organize your calendar, manage crews, and keep projects on track with our intuitive scheduling tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-sky-500 via-blue-500 to-blue-700 rounded-3xl p-12 md:p-16 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-sky-100 mb-8 max-w-2xl mx-auto">
              Join hundreds of landscape contractors who are growing faster with ContractPro
            </p>
            <Button
              size="lg"
              onClick={() => router.push("/auth/signup")}
              className="bg-white text-sky-600 hover:bg-sky-50 px-10 py-6 text-lg shadow-xl transform hover:scale-105 transition-all"
            >
              Start Your Free Trial
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-sky-200 bg-white/50 backdrop-blur-sm py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-400/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            </div>
            <span className="font-semibold">ContractPro</span>
          </div>
          <p>© 2024 ContractPro. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-sky-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-sky-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-sky-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
            opacity: 0.6;
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(90deg);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-40px) translateX(-10px) rotate(180deg);
            opacity: 1;
          }
          75% {
            transform: translateY(-20px) translateX(10px) rotate(270deg);
            opacity: 0.8;
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-30px) scale(1.1);
            opacity: 0.7;
          }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
