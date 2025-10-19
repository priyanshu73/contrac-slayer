"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Product {
  id: number
  name: string
  description: string
  image: string
  unitPrice: number
  priceDifference: number
  tier: "budget" | "standard" | "premium"
}

interface ProductSelectorProps {
  currentProduct: {
    description: string
    unitPrice?: number
    quantity?: number
    unit?: string
  }
  onSelect: (product: Product) => void
  onClose: () => void
}

export function ProductSelector({ currentProduct, onSelect, onClose }: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Mock alternative products
  const alternatives: Product[] = [
    {
      id: 1,
      name: "Budget Concrete Pavers",
      description: "Durable concrete pavers in gray. Cost-effective option for patios.",
      image: "/concrete-pavers-gray.jpg",
      unitPrice: 4.5,
      priceDifference: -1200,
      tier: "budget",
    },
    {
      id: 2,
      name: "Standard Flagstone - Mixed Colors",
      description: "Natural flagstone with varied earth tones. Good quality and appearance.",
      image: "/flagstone-pavers-mixed-colors.jpg",
      unitPrice: 7.0,
      priceDifference: -450,
      tier: "standard",
    },
    {
      id: 3,
      name: "Natural Flagstone - Earth Tone Mix",
      description: "Current selection. Premium natural stone with consistent earth tones.",
      image: "/natural-flagstone-earth-tones.jpg",
      unitPrice: 8.5,
      priceDifference: 0,
      tier: "standard",
    },
    {
      id: 4,
      name: "Premium Bluestone Pavers",
      description: "High-end bluestone with rich blue-gray color. Elegant and durable.",
      image: "/bluestone-pavers-premium.jpg",
      unitPrice: 12.0,
      priceDifference: 1050,
      tier: "premium",
    },
    {
      id: 5,
      name: "Luxury Travertine Pavers",
      description: "Premium travertine stone with unique patterns. Highest quality option.",
      image: "/travertine-pavers-luxury.jpg",
      unitPrice: 15.0,
      priceDifference: 1950,
      tier: "premium",
    },
  ]

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "budget":
        return "bg-[var(--status-completed)]/10 text-[var(--status-completed)]"
      case "standard":
        return "bg-[var(--status-active)]/10 text-[var(--status-active)]"
      case "premium":
        return "bg-[var(--status-pending)]/10 text-[var(--status-pending)]"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const filteredAlternatives = alternatives.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-background sm:max-w-3xl sm:rounded-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 p-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold">Select Replacement Material</h2>
              <p className="mt-1 text-sm text-muted-foreground">Currently: {currentProduct.description}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-4">
            <Input
              type="search"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="space-y-4 p-4">
          {filteredAlternatives.map((product) => (
            <Card
              key={product.id}
              className={`overflow-hidden transition-all hover:border-primary ${
                product.priceDifference === 0 ? "border-2 border-primary" : ""
              }`}
            >
              <div className="flex flex-col gap-4 p-4 sm:flex-row">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="h-32 w-full rounded-lg object-cover sm:h-24 sm:w-40"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getTierColor(product.tier)}`}
                    >
                      {product.tier}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        ${product.unitPrice.toFixed(2)} per {currentProduct.unit || "unit"}
                      </p>
                      {product.priceDifference !== 0 && (
                        <p
                          className={`mt-1 text-sm font-semibold ${
                            product.priceDifference > 0 ? "text-[var(--status-pending)]" : "text-[var(--status-active)]"
                          }`}
                        >
                          {product.priceDifference > 0 ? "+" : ""}${product.priceDifference.toFixed(2)} total
                        </p>
                      )}
                      {product.priceDifference === 0 && (
                        <p className="mt-1 text-sm font-semibold text-primary">Current Selection</p>
                      )}
                    </div>
                    <Button
                      onClick={() => onSelect(product)}
                      variant={product.priceDifference === 0 ? "outline" : "default"}
                      disabled={product.priceDifference === 0}
                    >
                      {product.priceDifference === 0 ? "Selected" : "Select"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
