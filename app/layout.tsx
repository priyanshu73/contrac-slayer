import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ContractPro AI - AI-Powered CRM for Modern Contractors",
  description: "Transform your contracting business with intelligent automation. Generate invoices instantly, capture every lead, and close more deals all powered by cutting edge AI technology.",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
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
    <html>
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
