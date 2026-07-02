"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"

export function LandingFooter() {
  const locale = useLocale()
  const t = useTranslations("landing")

  return (
    <footer className="border-t border-[#eadfd7] bg-[#fbf6f1] px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Link href={`/${locale}`} className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-contain" />
          </span>
          <div>
            <p className="text-sm font-black text-slate-950">ContractorOps</p>
            <p className="text-sm text-slate-500">{t("footerTagline")}</p>
          </div>
        </Link>

        <div className="flex flex-col gap-3 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:gap-6">
          <p>© {new Date().getFullYear()} ContractorOps</p>
          <Link href={`/${locale}/privacy`} className="transition-colors hover:text-slate-950">
            {t("footerPrivacy")}
          </Link>
        </div>
      </div>
    </footer>
  )
}
