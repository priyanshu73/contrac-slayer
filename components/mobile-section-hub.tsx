"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import type { LucideIcon } from "lucide-react"
import { ChevronRight } from "lucide-react"

export type MobileSectionLink = { label: string; subtitle: string; path: string; icon: LucideIcon; color: string; tint: string }

/** Native SectionHub pattern, scoped to small viewports. Existing desktop destinations stay unchanged. */
export function MobileSectionHub({ title, links }: { title: string; links: MobileSectionLink[] }) {
  const locale = useLocale()
  return <main className="min-h-screen bg-[#F5F5F7] px-4 pb-8 pt-6 md:mx-auto md:max-w-4xl md:bg-transparent">
    <h1 className="mb-5 text-[26px] font-bold tracking-tight text-[#1C1C1E]">{title}</h1>
    <div className="space-y-3">{links.map(({ label, subtitle, path, icon: Icon, color, tint }) =>
      <Link href={`/${locale}${path}`} key={path} className="flex min-h-[84px] items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition-colors active:bg-gray-50 md:border md:border-gray-100">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: tint, color }}><Icon size={20} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1"><span className="block text-base font-semibold text-[#1C1C1E]">{label}</span><span className="mt-0.5 block text-sm text-gray-500">{subtitle}</span></span>
        <ChevronRight size={20} className="shrink-0 text-gray-400" aria-hidden="true" />
      </Link>)}
    </div>
  </main>
}
