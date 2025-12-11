"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import Image from "next/image"
import { useTranslations } from "next-intl"

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
  const t = useTranslations('search')
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
    <div className="space-y-2">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Input
          type="search"
          placeholder={t('searchMaterials')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 h-10"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground px-1">
        {t('materialsFromHomeDepot')}
      </p>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* No Results */}
      {searchAttempted && !loading && results.length === 0 && !error && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          {t('noMaterialsFound', { query: searchQuery })}
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((material, index) => (
            <div key={index} className="flex items-center gap-3 p-2 rounded-md border hover:border-primary transition-colors bg-card">
              {/* Product Image */}
              <MaterialImage
                src={material.thumbnail_url || material.image_url}
                alt={material.name}
                className="w-12 h-12 flex-shrink-0 rounded border"
              />

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-1">{material.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-semibold text-primary">
                    ${parseFloat(material.estimated_cost).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">per {material.unit_of_measure}</span>
                </div>
              </div>

              {/* Add Button */}
              <Button 
                size="sm" 
                onClick={() => handleAddMaterial(material)}
                className="flex-shrink-0 h-8"
              >
                <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

