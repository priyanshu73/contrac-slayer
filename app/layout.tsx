import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/AuthContext"
import { AuthGuard } from "@/components/auth-guard"
import { Navbar } from "@/components/navbar"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ContractPro AI - AI-Powered CRM for Modern Contractors",
  description: "Transform your contracting business with intelligent automation. Generate invoices instantly, capture every lead, and close more deals all powered by cutting edge AI technology.",
  generator: "v0.app",
  icons: {
    icon: "/images/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <AuthGuard>
            <Navbar />
            <EmailVerificationBanner />
            {children}
          </AuthGuard>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
