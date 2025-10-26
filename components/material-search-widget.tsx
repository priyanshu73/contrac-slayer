"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import Image from "next/image"

interface MaterialResult {
  name: string
  description: string
  category: string
  estimated_quantity: string
  unit_of_measure: string
  estimated_cost: string
  confidence: number
  source: string
  image_url?: string
  thumbnail_url?: string
  availability?: string
  url?: string
  brand?: string
  model?: string
  searchResults?: any[] // All search results for substitutes
}

interface MaterialSearchResponse {
  materials: MaterialResult[]
  total_count: number
  page: number
  per_page: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

interface MaterialSearchWidgetProps {
  zipCode?: string
  onAddMaterial: (material: MaterialResult) => void
}

// Material Image Component with proper fallback handling
function MaterialImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [src])

  if (!src || imageError) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setImageError(true)}
        onLoad={() => setImageLoaded(true)}
        onLoadingComplete={() => setImageLoaded(true)}
      />
      {!imageLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}

export function MaterialSearchWidget({ zipCode, onAddMaterial }: MaterialSearchWidgetProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MaterialResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchAttempted, setSearchAttempted] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      setSearchAttempted(false)
      return
    }

    // Don't search for very short queries (less than 3 characters)
    if (searchQuery.trim().length < 3) {
      setResults([])
      setSearchAttempted(false)
      return
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 1000) // 1000ms debounce - wait 1 second after user stops typing

    return () => clearTimeout(timer)
  }, [searchQuery])

  const performSearch = async (query: string) => {
    console.log(`🔍 Starting material search for: "${query}"`)
    const startTime = Date.now()
    
    setLoading(true)
    setError(null)
    setSearchAttempted(true)

    try {
      // Call backend API to search materials using api library
      console.log(`📡 Calling API for: "${query}"`)
      const response = await api.searchMaterials(query, zipCode, 10) as MaterialSearchResponse
      const duration = Date.now() - startTime
      console.log(`✅ API call completed in ${duration}ms for: "${query}"`)
      console.log(`📊 Results: ${response.materials?.length || 0} items`)
      
      setResults(response.materials || [])
    } catch (err) {
      const duration = Date.now() - startTime
      console.error(`❌ Material search error after ${duration}ms:`, err)
      setError(err instanceof Error ? err.message : 'Failed to search materials. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddMaterial = (material: MaterialResult) => {
    // Add search results to the material for substitute functionality
    const materialWithResults = {
      ...material,
      searchResults: results // Pass all search results for substitutes
    }
    onAddMaterial(materialWithResults)
    // Optional: Show success feedback
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            type="search"
            placeholder="Search for materials (e.g., 'flagstone pavers', 'concrete mix')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      {!searchAttempted && !searchQuery && (
        <p className="text-sm text-muted-foreground">
          Search Home Depot catalog for materials to add to your quote
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* No Results */}
      {searchAttempted && !loading && results.length === 0 && !error && (
        <div className="text-center py-8 text-muted-foreground">
          <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p>No materials found for "{searchQuery}"</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((material, index) => (
            <Card key={index} className="p-4 hover:border-primary transition-all">
              <div className="flex gap-3">
                {/* Product Image */}
                <MaterialImage
                  src={material.image_url}
                  alt={material.name}
                  className="w-20 h-20 flex-shrink-0 rounded border"
                />

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">{material.name}</h4>
                  
                  <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                    {material.description}
                  </p>

                  {/* Category Badge */}
                  <div className="flex items-center gap-1 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {material.category}
                    </Badge>
                    {material.confidence > 0.95 && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        📏 Dimensions
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {Math.round(material.confidence * 100)}% confidence
                    </span>
                  </div>

                  {/* Price and Add Button */}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <p className="text-lg font-bold text-primary">
                                ${parseFloat(material.estimated_cost).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">per {material.unit_of_measure}</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Estimated price from {material.source}. You can edit this price after adding to your quote.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2">
                      {material.url && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(material.url, '_blank')}
                          className="flex-shrink-0"
                        >
                          <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        onClick={() => handleAddMaterial(material)}
                        className="flex-shrink-0"
                      >
                        <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Availability Badge */}
                  {material.availability && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {material.availability}
                    </Badge>
                  )}
                </div>
              </div>

            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

