"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTranslations } from "next-intl"

export function InvoicesFilters() {
  const t = useTranslations('filters')
  const [activeFilter, setActiveFilter] = useState("all")

  const filters = [
    { id: "all", label: t('all') },
    { id: "pending", label: t('pending') },
    { id: "paid", label: t('paid') },
    { id: "overdue", label: t('overdue') },
  ]

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            variant={activeFilter === filter.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(filter.id)}
            className="shrink-0"
          >
            {filter.label}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </Button>
        </div>
      </div>
    </Card>
  )
}
