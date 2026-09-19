"use client"

import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"

export default function SupportPage() {
  const locale = useLocale()
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-12">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <Button variant="ghost" size="sm" className="-ml-2 gap-2" asChild><Link href={`/${locale}`}><ArrowLeft className="h-4 w-4" />Back to home</Link></Button>
        <Mail className="mt-6 h-8 w-8 text-slate-700" />
        <h1 className="mt-3 text-2xl font-bold text-slate-950">ContractorOps Support</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">For product help, account access, billing, or a privacy request, email our support team. Please do not include passwords, card numbers, or unnecessary sensitive information.</p>
        <a className="mt-6 inline-block rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="mailto:support@contractorops.ai">support@contractorops.ai</a>
        <p className="mt-6 text-sm text-slate-600">For account deletion, use the <Link className="font-semibold underline" href={`/${locale}/delete-account`}>Delete account page</Link>.</p>
      </section>
    </main>
  )
}
