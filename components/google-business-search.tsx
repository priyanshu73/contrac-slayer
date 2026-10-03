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
  /** Called when the user picks the "use what I typed" row. */
  onUseTyped?: () => void
  /** Parent-owned operation generation (see useGoogleBusinessFill). */
  op: {
    begin: () => { gen: number; signal: AbortSignal }
    isCurrent: (gen: number) => boolean
    invalidate: () => void
  }
  /** Changes when the parent wants predictions dropped (Search again, step change). */
  resetKey?: number
  /** Show the Google Maps attribution under the field while a Google pick is applied. */
  showAttribution?: boolean
  language: string
  disabled?: boolean
  placeholder?: string
  /** i18n strings */
  labels: {
    useTyped: (typed: string) => string
    searching: string
    loadingPlace: string
    serviceAreaBusiness?: string
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
  onUseTyped,
  op,
  resetKey,
  showAttribution,
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
  const needsNewTokenRef = useRef(false) // a Details call ended the last billing session
  const pickingRef = useRef(false)
  const listId = `${id ?? "company"}-listbox`

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

  useEffect(() => {
    // Parent asked to drop everything (Search again, step change): no stale predictions, no pending debounce.
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
    setPredictions([])
    setActive(-1)
    setOpen(false)
    setLoading(false)
  }, [resetKey])

  const runSearch = (text: string) => {
    if (searchDisabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
    // The query changed: results for the previous text must not stay clickable.
    setPredictions([])
    setActive(-1)
    setOpen(false)
    if (text.trim().length < MIN_CHARS) {
      setLoading(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      if (needsNewTokenRef.current) {
        // New search lifecycle: rotate the Places session token here, never on request completion.
        tokenRef.current = newPlacesSessionToken()
        needsNewTokenRef.current = false
      }
      const token = tokenRef.current // this request's session, captured once
      const controller = new AbortController()
      abortRef.current = controller
      let timedOut = false
      const timeout = setTimeout(() => { timedOut = true; controller.abort() }, 3000)
      setLoading(true)
      try {
        const res = await api.placesAutocomplete(text.trim(), token, language, controller.signal)
        if (controller.signal.aborted || abortRef.current !== controller) return // stale response
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
        if (timedOut) { setPredictions([]); setOpen(false); return } // slow lookup: stay a plain input
        if (controller.signal.aborted || err?.name === "AbortError") return // superseded by newer typing
        // 429, network, anything else: never block onboarding
        setSearchDisabled(true)
        setPredictions([])
        setOpen(false)
      } finally {
        clearTimeout(timeout)
        if (!controller.signal.aborted || timedOut) setLoading(false)
      }
    }, DEBOUNCE_MS)
  }

  const handleInput = (text: string) => {
    op.invalidate() // typing supersedes any pending pick or prefill
    onChange(text)
    runSearch(text)
  }

  const pick = async (p: PlacePrediction) => {
    if (pickingRef.current) return // ignore duplicate Enter/click while Details is in flight
    pickingRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
    const { gen, signal } = op.begin()
    // Details ends the Google billing session the moment it is dispatched, even if it is later aborted.
    const token = tokenRef.current
    needsNewTokenRef.current = true
    setPicking(p.place_id)
    setOpen(false)
    // The billing session ends at dispatch: the old result set must not reopen on focus or be picked again.
    setPredictions([])
    setActive(-1)
    const timeout = setTimeout(() => detailsCtrl.abort(), 3000)
    const detailsCtrl = new AbortController()
    const onAbort = () => detailsCtrl.abort()
    signal.addEventListener("abort", onAbort)
    try {
      const details = await api.placesDetails(p.place_id, token, language, detailsCtrl.signal)
      if (!op.isCurrent(gen)) return // typing, manual, Search again, step change or a newer pick won
      if (details.available) {
        onPlaceSelected(details)
      } else {
        setSearchDisabled(true) // Google failed at the last step: keep what they typed
      }
    } catch {
      if (op.isCurrent(gen)) setSearchDisabled(true)
    } finally {
      clearTimeout(timeout)
      signal.removeEventListener("abort", onAbort)
      pickingRef.current = false
      setPicking(null)
    }
  }

  const keepTyped = () => {
    op.invalidate()
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
    setPredictions([])
    setActive(-1)
    setOpen(false)
    onUseTyped?.()
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
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-opt-${active}` : undefined}
        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
      />
      {showAttribution && !open && (
        <div translate="no" className="mt-1 text-right text-xs text-gray-500">Google Maps</div>
      )}
      {loading && !open && (
        <span role="status" aria-live="polite" className="absolute right-3 top-3.5 text-xs text-gray-400">{labels.searching}</span>
      )}
      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {predictions.map((p, i) => (
            <button
              type="button"
              key={p.place_id}
              id={`${listId}-opt-${i}`}
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
                {picking === p.place_id ? labels.loadingPlace : p.secondary_text || labels.serviceAreaBusiness || ""}
              </span>
            </button>
          ))}
          <button
            type="button"
            id={`${listId}-opt-${predictions.length}`}
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
          <div translate="no" className="px-3 py-1 text-right text-xs text-gray-500">Google Maps</div>
        </div>
      )}
    </div>
  )
}
