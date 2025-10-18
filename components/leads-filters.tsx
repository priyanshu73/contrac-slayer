"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function LeadsFilters() {
  const [activeFilter, setActiveFilter] = useState("all")

  const filters = [
    { id: "all", label: "All", count: 12 },
    { id: "new", label: "New", count: 5 },
    { id: "contacted", label: "Contacted", count: 4 },
    { id: "quoted", label: "Quoted", count: 3 },
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
            <span className="ml-2 rounded-full bg-background/20 px-2 py-0.5 text-xs">{filter.count}</span>
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
          <Button variant="outline" size="sm">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Button>
        </div>
      </div>
    </Card>
  )
}
