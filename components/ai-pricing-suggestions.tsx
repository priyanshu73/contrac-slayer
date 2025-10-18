"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"

interface AIPricingSuggestionsProps {
  serviceDescription: string
  onSelectPrice: (price: number) => void
}

export function AIPricingSuggestions({ serviceDescription, onSelectPrice }: AIPricingSuggestionsProps) {
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<
    Array<{
      label: string
      price: number
      description: string
      confidence: string
    }>
  >([])

  useEffect(() => {
    // Simulate AI pricing analysis
    const timer = setTimeout(() => {
      // Mock AI-generated pricing suggestions
      setSuggestions([
        {
          label: "Competitive",
          price: 75,
          description: "Below market average - good for winning new clients",
          confidence: "High",
        },
        {
          label: "Market Rate",
          price: 95,
          description: "Average local rate for similar services",
          confidence: "Very High",
        },
        {
          label: "Premium",
          price: 125,
          description: "Above market - for established relationships",
          confidence: "Medium",
        },
      ])
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [serviceDescription])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Analyzing market rates and generating pricing suggestions...</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold">AI Pricing Suggestions</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Based on your service description and local market analysis, here are competitive pricing options:
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.label}
            onClick={() => onSelectPrice(suggestion.price)}
            className="rounded-lg border-2 border-border p-4 text-left transition-all hover:border-primary hover:bg-primary/5"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{suggestion.label}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {suggestion.confidence}
              </span>
            </div>
            <p className="text-2xl font-bold">${suggestion.price.toFixed(2)}</p>
            <p className="mt-2 text-xs text-muted-foreground">{suggestion.description}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> These suggestions are based on local market data, service complexity, and competitive
          analysis. Adjust as needed for your specific situation.
        </p>
      </div>
    </Card>
  )
}
