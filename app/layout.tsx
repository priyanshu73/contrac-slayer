import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { MobileThemeSync } from "@/components/mobile-theme-sync"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const mobileThemeScript = `try{if(localStorage.getItem("contractorops-mobile-dark-mode")==="true"){document.documentElement.classList.add("mobile-dark")}}catch(e){}`

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "ContractorOps AI - AI-Powered CRM for Modern Contractors",
  description: "Communicate with clients via SMS—no app downloads required. ContractorOps AI listens to calls, reads texts, and automatically responds. Generate invoices instantly, capture every lead, and close more deals powered by cutting edge AI technology.",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ContractorOps",
  },
  alternates: {
    languages: {
      'en': '/en',
      'es': '/es',
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: mobileThemeScript }} />
        <MobileThemeSync />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
