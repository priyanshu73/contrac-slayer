"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
    label: string
    href?: string
}

interface AppBreadcrumbProps {
    items: BreadcrumbItem[]
    className?: string
}

/**
 * AppBreadcrumb – A shared breadcrumb component used across all detail pages.
 *
 * The last item in `items` is treated as the current page (not a link).
 * All preceding items render as clickable links.
 *
 * Usage example:
 *   <AppBreadcrumb
 *     items={[
 *       { label: "Clients", href: `/${locale}/clients` },
 *       { label: "Crew", href: `/${locale}/crew` },
 *       { label: subcontractorName },
 *     ]}
 *   />
 */
export function AppBreadcrumb({ items, className }: AppBreadcrumbProps) {
    return (
        <nav
            aria-label="Breadcrumb"
            className={cn("flex items-center flex-wrap gap-1 text-sm text-slate-500", className)}
        >
            {items.map((item, index) => {
                const isLast = index === items.length - 1
                return (
                    <span key={index} className="flex items-center gap-1">
                        {index > 0 && (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        {isLast || !item.href ? (
                            <span
                                className={cn(
                                    "font-medium truncate max-w-[200px]",
                                    isLast ? "text-slate-800" : "text-slate-500"
                                )}
                                title={item.label}
                            >
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                href={item.href}
                                className="hover:text-slate-800 transition-colors truncate max-w-[200px]"
                                title={item.label}
                            >
                                {item.label}
                            </Link>
                        )}
                    </span>
                )
            })}
        </nav>
    )
}
