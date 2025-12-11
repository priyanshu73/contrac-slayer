"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTranslations } from "next-intl"

interface LeadsFiltersProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
  counts: {
    all: number
    new: number
    contacted: number
    quoted: number
    converted: number
    lost: number
  }
}

export function LeadsFilters({ activeFilter, onFilterChange, counts }: LeadsFiltersProps) {
  const t = useTranslations('filters')
  
  const filters = [
    { id: "all", label: t('all'), count: counts.all },
    { id: "NEW", label: t('new'), count: counts.new },
    { id: "CONTACTED", label: t('contacted'), count: counts.contacted },
    { id: "QUOTED", label: t('quoted'), count: counts.quoted },
    { id: "CONVERTED", label: t('converted'), count: counts.converted },
    { id: "LOST", label: t('lost'), count: counts.lost },
  ]

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        <div className="flex gap-2 flex-wrap">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={activeFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange(filter.id)}
              className="shrink-0"
            >
              {filter.label}
              <span className="ml-2 rounded-full bg-background/20 px-2 py-0.5 text-xs">{filter.count}</span>
            </Button>
          ))}
        </div>
      </div>
    </Card>
  )
}
