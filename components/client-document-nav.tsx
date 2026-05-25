"use client"

import { BookOpen, ExternalLink, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export type ClientDocumentView = "quote" | "proposal"

type NavItem = {
  id: ClientDocumentView
  label: string
  icon: typeof FileText
  available: boolean
  href?: string
}

interface ClientDocumentNavProps {
  locale: string
  portalToken?: string | null
  activeView: ClientDocumentView
  hasQuote?: boolean
  hasProposal?: boolean
  quoteUrl?: string
  proposalUrl?: string
  onViewChange?: (view: ClientDocumentView) => void
}

function NavButton({
  item,
  activeView,
  onViewChange,
}: {
  item: NavItem
  activeView: ClientDocumentView
  onViewChange?: (view: ClientDocumentView) => void
}) {
  const { id, label, icon: Icon, available, href } = item
  const isActive = activeView === id
  const displayLabel = available ? label : `No ${label.toLowerCase()}`

  const className = cn(
    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left w-full",
    !available
      ? "cursor-not-allowed text-slate-300"
      : isActive
        ? "bg-slate-900 text-white"
        : "text-slate-700 hover:bg-slate-100"
  )

  if (href && available) {
    return (
      <a href={href} className={className} aria-current={isActive ? "page" : undefined}>
        <Icon className="h-4 w-4 shrink-0" />
        <span>{displayLabel}</span>
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={() => available && onViewChange?.(id)}
      disabled={!available}
      className={className}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{displayLabel}</span>
    </button>
  )
}

function MobileNavButton({
  item,
  activeView,
  onViewChange,
}: {
  item: NavItem
  activeView: ClientDocumentView
  onViewChange?: (view: ClientDocumentView) => void
}) {
  const { id, label, icon: Icon, available, href } = item
  const isActive = activeView === id
  const displayLabel = available ? label : `No ${label.toLowerCase()}`

  const className = cn(
    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
    !available
      ? "cursor-not-allowed text-slate-300 border-transparent"
      : isActive
        ? "border-slate-900 text-slate-900"
        : "border-transparent text-slate-500 hover:text-slate-700"
  )

  if (href && available) {
    return (
      <a href={href} className={className} aria-current={isActive ? "page" : undefined}>
        <Icon className="h-4 w-4 shrink-0" />
        {displayLabel}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={() => available && onViewChange?.(id)}
      disabled={!available}
      className={className}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {displayLabel}
    </button>
  )
}

export function ClientDocumentNav({
  locale,
  portalToken,
  activeView,
  hasQuote = false,
  hasProposal = false,
  quoteUrl,
  proposalUrl,
  onViewChange,
}: ClientDocumentNavProps) {
  const navItems: NavItem[] = [
    {
      id: "quote",
      label: "Quote",
      icon: FileText,
      available: hasQuote || Boolean(quoteUrl),
      href: quoteUrl,
    },
    {
      id: "proposal",
      label: "Proposal",
      icon: BookOpen,
      available: hasProposal || Boolean(proposalUrl),
      href: proposalUrl,
    },
  ]

  const portalHref = portalToken ? `/${locale}/client/${portalToken}` : undefined

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-44 flex-col bg-white border-r border-slate-200 px-3 pt-8 pb-6 print:hidden">
        {portalHref && (
          <>
            <a
              href={portalHref}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors mb-4"
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />
              <span>My Portal</span>
            </a>
            <div className="mb-3 border-t border-slate-100" />
          </>
        )}
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Documents</p>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavButton key={item.id} item={item} activeView={activeView} onViewChange={onViewChange} />
          ))}
        </nav>
      </aside>

      <div className="flex md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 print:hidden">
        {portalHref && (
          <a
            href={portalHref}
            className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold text-slate-900 hover:text-slate-600 transition-colors whitespace-nowrap border-b-2 border-slate-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            My Portal
          </a>
        )}
        <div className="flex items-center gap-1 px-2 pt-2">
          {navItems.map((item) => (
            <MobileNavButton key={item.id} item={item} activeView={activeView} onViewChange={onViewChange} />
          ))}
        </div>
      </div>
    </>
  )
}

/** Offset main content when the fixed sidebar / mobile bar is shown. */
export function clientDocumentNavContentClassName() {
  return "flex-1 md:ml-44 mt-12 md:mt-0"
}
