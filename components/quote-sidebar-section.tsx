"use client"

import { forwardRef, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Single unified container that holds the quote sidebar's collapsible sections
 * (Proposals, Invoices, Change Orders). Renders one bordered card; each
 * `QuoteSidebarSection` child becomes a divider-separated row.
 */
export function QuoteSidebarBox({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-sky-200/60 overflow-hidden rounded-xl border border-sky-200/70 bg-white shadow-sm print:hidden">
      {children}
    </div>
  )
}

interface QuoteSidebarSectionProps {
  icon?: ReactNode
  title: string
  /** Shown as a pill beside the title; omit/undefined hides the pill. */
  count?: number
  open: boolean
  onToggle: () => void
  /** Action control (e.g. New / Edit). Only rendered while the section is open. */
  action?: ReactNode
  children?: ReactNode
}

/**
 * Uniform collapsible section header + body used by every quote sidebar block.
 * forwardRef so it can be a Radix `PopoverAnchor asChild` target (Invoices edit).
 */
export const QuoteSidebarSection = forwardRef<HTMLElement, QuoteSidebarSectionProps>(
  function QuoteSidebarSection({ icon, title, count, open, onToggle, action, children, ...rest }, ref) {
    return (
      <section ref={ref} {...rest}>
        <div className="flex items-center justify-between gap-2 bg-sky-50/60 px-3 py-2.5">
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold text-slate-800 transition-colors hover:text-slate-900"
            aria-expanded={open}
          >
            {icon}
            <span className="truncate">{title}</span>
            {count != null && (
              <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-sky-700">
                {count}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
          {open && action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {open ? children : null}
      </section>
    )
  },
)
