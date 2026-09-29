"use client"

import Link from "next/link"
// Native Bob art from contractorops-app/assets/images/logo.png, optimized to 128px.
export const nativeBobLogo = "data:image/png;base64,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"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { BriefcaseBusiness, Grid2X2, LocateFixed, UsersRound } from "lucide-react"

/** The native app's Home / Sales / Work / Engage tabs and raised Bob action. */
export function MobileWorkspaceNav() {
  const locale = useLocale()
  const pathname = usePathname() || ""
  const tabs = [
    { label: "Home", href: `/${locale}/dashboard`, icon: Grid2X2, active: /^\/(dashboard)$/.test(pathname.replace(/^\/[a-z]{2}/, "")) },
    { label: "Sales", href: `/${locale}/mobile/sales`, icon: UsersRound, active: /^\/(mobile\/sales|leads|quotes|clients|invoices|reports)(\/|$)/.test(pathname.replace(/^\/[a-z]{2}/, "")) },
    { label: "Work", href: `/${locale}/mobile/work`, icon: BriefcaseBusiness, active: /^\/(mobile\/work|projects|tasks|calendar|crew)(\/|$)/.test(pathname.replace(/^\/[a-z]{2}/, "")) },
    { label: "Engage", href: `/${locale}/mobile/engage`, icon: LocateFixed, active: /^\/(mobile\/engage|lead-generator-agent|frontline)(\/|$)/.test(pathname.replace(/^\/[a-z]{2}/, "")) },
  ]
  const item = ({ label, href, icon: Icon, active }: typeof tabs[number]) => (
    <Link key={label} href={href} aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold ${active ? "text-blue-700" : "text-gray-400"}`}>
      <Icon size={21} strokeWidth={active ? 2.5 : 2} aria-hidden="true" /><span>{label}</span>
    </Link>
  )
  return (
    <>
    <nav aria-label="Mobile workspace" className="mobile-workspace-nav fixed inset-x-0 bottom-0 z-[55] flex min-h-[calc(4.5rem+env(safe-area-inset-bottom))] items-start border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] backdrop-blur md:hidden print:hidden">
      {tabs.slice(0, 2).map(item)}
      <button type="button" aria-label="Open Bob AI" onClick={() => document.getElementById("agent-chat-trigger")?.click()}
        className="relative flex min-w-[68px] flex-col items-center text-[10px] font-semibold text-gray-400">
        <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-white shadow-lg">
          <img src={nativeBobLogo} alt="" className="h-[84px] w-[84px] max-w-none shrink-0 object-contain" />
        </span><span className="mt-0.5">Bob AI</span>
      </button>
      {tabs.slice(2).map(item)}
    </nav>
    </>
  )
}
