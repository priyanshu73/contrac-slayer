"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"

export function QuickActions() {
  const tActions = useTranslations('dashboard.actions')
  const tDashboard = useTranslations('dashboard')
  const locale = useLocale()
  
  const actions = [
    {
      label: tActions('newLead'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      href: `/${locale}/leads`,
    },
    {
      label: tActions('createQuote'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      href: `/${locale}/quotes/new`,
    },
    {
      label: tActions('addClient'),
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      ),
      href: `/${locale}/clients/new`,
    },
  ]

  return (
    <Card className="p-5 w-fit">
      <h2 className="mb-4 text-lg font-semibold">{tDashboard('quickActions')}</h2>
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <Button key={action.label} variant="outline" className="h-auto flex-col gap-2 py-4 px-6 bg-transparent hover:bg-transparent hover:text-foreground hover:scale-101 hover:shadow-lg transition-all duration-300" asChild>
            <Link href={action.href}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {action.icon}
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </Card>
  )
}
