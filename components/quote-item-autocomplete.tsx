"use client"

import * as React from "react"
import { Check, Loader2, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useDebounce } from "@/hooks/useDebounce"

export interface AutocompleteSuggestion {
  title?: string | null
  description: string
  price: number
  unit: string
  source: string
}

export interface LineItemSearchResult {
  title?: string
  description: string
  price: number
  unit: string
}

interface LineItemSearchPopoverProps {
  onSelect: (result: LineItemSearchResult) => void
  disabled?: boolean
  className?: string
}

export function LineItemSearchPopover({
  onSelect,
  disabled = false,
  className,
}: LineItemSearchPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounce(query.trim(), 300)

  const [sourceFilter, setSourceFilter] = React.useState<"all" | "master" | "historical">("all")
  const [suggestions, setSuggestions] = React.useState<AutocompleteSuggestion[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setSuggestions([])
    }
  }, [open])

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
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            "h-9 w-9 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors",
            className
          )}
          title="Search past items & cost book"
        >
          <Search className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[360px] max-w-[calc(100vw-2rem)] p-0"
        align="start"
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <div className="border-b border-slate-100 p-2 space-y-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search past items & cost book..."
              className="h-9 text-sm"
              autoFocus
            />
            <div className="flex flex-wrap gap-1">
              {(["all", "master", "historical"] as const).map((s) => (
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
            {loading ? (
              <div className="py-6 text-center text-sm text-slate-500 flex justify-center items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
              </div>
            ) : suggestions.length === 0 && debouncedQuery.length >= 2 ? (
              <CommandEmpty>No items found.</CommandEmpty>
            ) : suggestions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                Type to search past items & cost book.
              </div>
            ) : (
              <CommandGroup heading="Suggestions">
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`${index}-${suggestion.description}`}
                    value={suggestion.description}
                    onSelect={() => {
                      onSelect({
                        title: suggestion.title || undefined,
                        description: suggestion.description,
                        price: suggestion.price,
                        unit: suggestion.unit,
                      })
                      setOpen(false)
                    }}
                    className="flex justify-between items-center rounded-md px-2 py-2 data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900"
                  >
                    <div className="flex flex-col max-w-[65%]">
                      {suggestion.title && (
                        <span className="truncate text-[11px] font-medium text-slate-600">
                          {suggestion.title}
                        </span>
                      )}
                      <span className="truncate font-medium">{suggestion.description}</span>
                      <span className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
                        {suggestion.source === "master" ? "Cost Book" : "Past Quote"}
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
