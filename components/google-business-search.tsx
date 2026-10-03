"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import {
  newPlacesSessionToken,
  type PlaceDetails,
  type PlacePrediction,
} from "@/lib/places"

interface Props {
  id?: string
  value: string
  onChange: (text: string) => void
  /** Called with Google's details after the user taps a result. */
  onPlaceSelected: (details: PlaceDetails) => void
  language: string
  disabled?: boolean
  placeholder?: string
  /** i18n strings */
  labels: {
    useTyped: (typed: string) => string
    searching: string
    loadingPlace: string
    closedWarning?: string
  }
}

const MIN_CHARS = 3
const DEBOUNCE_MS = 300

/**
 * Company-name input that doubles as a Google business search.
 * - Typing and moving on always works (the "use what I typed" row is always last).
 * - Any Google/proxy problem hides the dropdown for this visit; the field behaves like a plain input.
 * - Google Maps attribution is shown in the dropdown footer (required by Google's policies).
 */
export function GoogleBusinessSearch({
  id,
  value,
  onChange,
  onPlaceSelected,
  language,
  disabled,
  placeholder,
  labels,
}: Props) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [picking, setPicking] = useState<string | null>(null)
  const [searchDisabled, setSearchDisabled] = useState(false)
  const [active, setActive] = useState(-1)

  const tokenRef = useRef<string>(newPlacesSessionToken())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const skipNextSearchRef = useRef(false)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      abortRef.current?.abort()
    },
    [],
  )

  const runSearch = (text: string) => {
    if (searchDisabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
    if (text.trim().length < MIN_CHARS) {
      setPredictions([])
      setOpen(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const res = await api.placesAutocomplete(text.trim(), tokenRef.current, language, controller.signal)
        if (controller.signal.aborted) return
        if (!res.available) {
          setSearchDisabled(true) // key missing / Google down: act like a plain input
          setPredictions([])
          setOpen(false)
          return
        }
        setPredictions(res.predictions)
        setActive(-1)
        setOpen(true)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        // 429, network, anything else: never block onboarding
        setSearchDisabled(true)
        setPredictions([])
        setOpen(false)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)
  }

  const handleInput = (text: string) => {
    onChange(text)
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      return
    }
    runSearch(text)
  }

  const pick = async (p: PlacePrediction) => {
    setPicking(p.place_id)
    try {
      const details = await api.placesDetails(p.place_id, tokenRef.current, language)
      // Session is over after details: rotate the token for the next search.
      tokenRef.current = newPlacesSessionToken()
      if (details.available) {
        skipNextSearchRef.current = true
        onPlaceSelected(details)
        setOpen(false)
      } else {
        // Google failed at the last step: keep what they typed, treat as manual.
        setSearchDisabled(true)
        setOpen(false)
      }
    } catch {
      setSearchDisabled(true)
      setOpen(false)
    } finally {
      setPicking(null)
    }
  }

  const keepTyped = () => {
    setOpen(false)
  }

  const rows = predictions.length + 1 // + "use typed" row
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, rows - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault()
      if (active < predictions.length) void pick(predictions[active])
      else keepTyped()
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        disabled={disabled}
        autoComplete="organization"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
      />
      {loading && !open && (
        <span className="absolute right-3 top-3.5 text-xs text-gray-400">{labels.searching}</span>
      )}
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {predictions.map((p, i) => (
            <button
              type="button"
              key={p.place_id}
              role="option"
              aria-selected={active === i}
              onClick={() => void pick(p)}
              disabled={picking !== null}
              className={`block w-full border-b border-gray-100 px-3 py-2.5 text-left ${
                active === i ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="block text-sm font-semibold text-gray-800">{p.name}</span>
              <span className="block text-xs text-gray-500">
                {picking === p.place_id ? labels.loadingPlace : p.secondary_text}
              </span>
            </button>
          ))}
          <button
            type="button"
            role="option"
            aria-selected={active === predictions.length}
            onClick={keepTyped}
            className={`block w-full px-3 py-2.5 text-left text-sm font-semibold text-slate-800 ${
              active === predictions.length ? "bg-blue-50" : "bg-slate-50 hover:bg-slate-100"
            }`}
          >
            {labels.useTyped(value.trim())}
          </button>
          {/* Required Google Maps attribution (text form allowed when space is limited). */}
          <div className="px-3 py-1 text-right text-[10px] text-gray-500">Google Maps</div>
        </div>
      )}
    </div>
  )
}
