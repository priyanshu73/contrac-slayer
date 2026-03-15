"use client"

import * as React from "react"
import { Check, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  PopoverAnchor,
  Popover,
  PopoverContent,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useDebounce } from "@/hooks/useDebounce"

export interface AutocompleteSuggestion {
  description: string
  price: number
  unit: string
  source: string
}

interface QuoteItemAutocompleteProps {
  value: string
  onChange: (description: string, price?: number, unit?: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function QuoteItemAutocomplete({
  value,
  onChange,
  disabled = false,
  placeholder = "Search items...",
  className
}: QuoteItemAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)
  const debouncedQuery = useDebounce(inputValue.trim(), 300)
  const anchorRef = React.useRef<HTMLDivElement>(null)
  const [popoverWidth, setPopoverWidth] = React.useState<number>()
  
  const [sourceFilter, setSourceFilter] = React.useState<"all" | "master" | "historical">("all")
  const [suggestions, setSuggestions] = React.useState<AutocompleteSuggestion[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  React.useEffect(() => {
    const updateWidth = () => {
      if (anchorRef.current) {
        setPopoverWidth(anchorRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener("resize", updateWidth)

    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  React.useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([])
      return
    }

    let isMounted = true

    async function fetchSuggestions() {
      setLoading(true)
      try {
        const results = await api.getQuoteItemsAutocomplete(debouncedQuery, sourceFilter)
        if (isMounted) {
          setSuggestions(results)
        }
      } catch (err) {
        console.error("Autocomplete fetch error", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchSuggestions()

    return () => {
      isMounted = false
    }
  }, [debouncedQuery, sourceFilter])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative w-full">
          <Input
            value={inputValue}
            onChange={(e) => {
              const nextValue = e.target.value
              setInputValue(nextValue)
              onChange(nextValue)
              if (!open) {
                setOpen(true)
              }
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false)
              }
            }}
            disabled={disabled}
            placeholder={placeholder}
            className={cn("w-full pr-10", className)}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="max-w-[calc(100vw-2rem)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        style={popoverWidth ? { width: `${popoverWidth}px` } : undefined}
      >
        <Command shouldFilter={false}>
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
            <div className="flex flex-wrap gap-1">
            {(["all", "master", "historical"] as const).map(s => (
              <button
                type="button"
                key={s}
                onClick={() => setSourceFilter(s)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                  sourceFilter === s 
                    ? "bg-blue-100 border-blue-200 text-blue-700" 
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                )}
              >
                {s === "all" ? "All" : s === "master" ? "Cost Book" : "Past Quotes"}
              </button>
            ))}
            </div>
          </div>

          <CommandList>
            {inputValue.trim().length > 0 && (
              <div className="border-b border-slate-100 p-1.5">
                <CommandItem
                  value={`custom-${inputValue}`}
                  onSelect={() => {
                    onChange(inputValue)
                    setOpen(false)
                  }}
                  className="flex items-start justify-between rounded-md border border-blue-100 bg-blue-50/60 px-2.5 py-2 data-[selected=true]:border-blue-200 data-[selected=true]:bg-blue-100 data-[selected=true]:text-slate-900"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      Use “{inputValue}”
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Keep your own wording
                    </div>
                  </div>
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                </CommandItem>
              </div>
            )}

            {loading ? (
              <div className="py-6 text-center text-sm text-slate-500 flex justify-center items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
              </div>
            ) : suggestions.length === 0 && debouncedQuery.length >= 2 ? (
              <CommandEmpty>No items found.</CommandEmpty>
            ) : suggestions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                Start typing to see matching suggestions.
              </div>
            ) : (
              <CommandGroup heading="Suggestions">
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`${index}-${suggestion.description}`}
                    value={suggestion.description}
                    onSelect={() => {
                      setInputValue(suggestion.description)
                      onChange(suggestion.description, suggestion.price, suggestion.unit)
                      setOpen(false)
                    }}
                    className="flex justify-between items-center rounded-md px-2 py-2 data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900"
                  >
                    <div className="flex flex-col max-w-[70%]">
                      <span className="truncate font-medium">{suggestion.description}</span>
                      <span className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
                        {suggestion.source === 'master' ? 'Cost Book' : 'Past Quote'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end text-sm">
                      <span className="font-semibold">${suggestion.price.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-500">per {suggestion.unit}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
