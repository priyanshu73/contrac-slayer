"use client"

import Link from "next/link"
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
    <style>{`@media (max-width: 767px) { body:has(.mobile-workspace-nav) #agent-chat-trigger { display: none; } }`}</style>
    <nav aria-label="Mobile workspace" className="mobile-workspace-nav fixed inset-x-0 bottom-0 z-[55] flex min-h-[calc(4.5rem+env(safe-area-inset-bottom))] items-start border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] backdrop-blur md:hidden print:hidden">
      {tabs.slice(0, 2).map(item)}
      <button type="button" aria-label="Open Bob AI" onClick={() => document.getElementById("agent-chat-trigger")?.click()}
        className="relative flex min-w-[68px] flex-col items-center text-[10px] font-semibold text-gray-400">
        <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-blue-700 shadow-lg">
          <img src="/bob-ai-mark.png" alt="" className="h-9 w-9 rounded-full object-contain" />
        </span><span className="mt-0.5">Bob AI</span>
      </button>
      {tabs.slice(2).map(item)}
    </nav>
    </>
  )
}
