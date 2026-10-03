"use client"

import { useRef, useState } from "react"
import { AddressData, MapboxFeature, mapboxFeatureToAddressData } from "@/lib/types/address"
import type { PlaceDetails } from "@/lib/places"

type Field = "company_name" | "phone_number" | "website_url" | "default_zip_code" | "address" | "contractor_type"

interface Args {
  formData: any
  setFormData: (updater: (prev: any) => any) => void
  setAddressData: (a: AddressData | null) => void
  setManualAddress: (v: boolean) => void
}

/** Forward-geocode a confirmed address with the SAME Mapbox service the address box uses, so
 *  `addresses` rows stay Mapbox-keyed and no Google lat/lng is ever persisted. */
async function geocodeWithMapbox(text: string): Promise<AddressData | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (!token || !text) return null
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        text,
      )}.json?access_token=${token}&autocomplete=false&types=address&country=us&limit=1`,
    )
    if (!res.ok) return null
    const json = await res.json()
    const feature: MapboxFeature | undefined = json?.features?.[0]
    if (!feature || (feature.relevance ?? 0) < 0.8) return null
    return mapboxFeatureToAddressData(feature)
  } catch {
    return null
  }
}

/**
 * Owns the Google-prefill rules for onboarding step 1:
 *  - fill EMPTY fields only (never overwrite what the user typed), except company name which the pick replaces
 *  - remember which fields came from Google (for the chip) and drop the chip once the user edits the field
 *  - SAB: no address; zip becomes required
 *  - only google_place_id is kept as Google-derived data
 */
export function useGoogleBusinessFill({ formData, setFormData, setAddressData, setManualAddress }: Args) {
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null)
  const [fromGoogle, setFromGoogle] = useState<Partial<Record<Field, true>>>({})
  const [isServiceArea, setIsServiceArea] = useState(false)
  const [closedWarning, setClosedWarning] = useState(false)
  const [addressKey, setAddressKey] = useState(0) // remount MapboxAddressInput so defaultValue re-applies
  const latest = useRef(formData)
  latest.current = formData

  const applyPlace = async (d: PlaceDetails) => {
    const cur = latest.current
    const filled: Partial<Record<Field, true>> = {}
    const next: Record<string, any> = {}

    if (d.name) { next.company_name = d.name; filled.company_name = true }
    if (d.phone && !cur.phone_number?.trim()) { next.phone_number = d.phone; filled.phone_number = true }
    if (d.website && !cur.website_url?.trim()) { next.website_url = d.website; filled.website_url = true }
    if (d.zip && !cur.default_zip_code?.trim()) {
      next.default_zip_code = d.zip
      filled.default_zip_code = true
      try { localStorage.setItem("contractorops_pending_zip", d.zip) } catch { /* ignore */ }
    }
    if (d.suggested_contractor_type && !cur.contractor_type) {
      next.contractor_type = d.suggested_contractor_type
      filled.contractor_type = true
    }

    let nextAddressData: AddressData | null | undefined
    if (!d.is_service_area && d.address && !cur.address?.trim()) {
      next.address = d.address
      filled.address = true
      nextAddressData = await geocodeWithMapbox(d.address)
    }

    setFormData((prev: any) => ({ ...prev, ...next }))
    if (nextAddressData !== undefined) {
      setAddressData(nextAddressData)
      setManualAddress(nextAddressData === null) // no Mapbox match: show plain text box with the text
      setAddressKey((k) => k + 1)
    }
    setGooglePlaceId(d.place_id ?? null)
    setFromGoogle(filled)
    setIsServiceArea(!!d.is_service_area)
    setClosedWarning(d.business_status === "CLOSED_PERMANENTLY" || d.business_status === "CLOSED_TEMPORARILY")
  }

  /** Call from onChange of a Google-fillable field so the chip disappears once the user edits it. */
  const userEdited = (field: Field) =>
    setFromGoogle((prev) => {
      if (!prev[field]) return prev
      const { [field]: _drop, ...rest } = prev
      return rest
    })

  /** "Not your business? Search again": clear only the Google-filled fields. */
  const clearGoogleFill = () => {
    setFormData((prev: any) => {
      const copy = { ...prev }
      for (const f of Object.keys(fromGoogle) as Field[]) copy[f] = ""
      return copy
    })
    if (fromGoogle.address) {
      setAddressData(null)
      setManualAddress(false)
      setAddressKey((k) => k + 1)
    }
    setGooglePlaceId(null)
    setFromGoogle({})
    setIsServiceArea(false)
    setClosedWarning(false)
  }

  return {
    googlePlaceId,
    fromGoogle,
    isServiceArea,
    closedWarning,
    addressKey,
    applyPlace,
    userEdited,
    clearGoogleFill,
    businessSource: (googlePlaceId ? "google_places" : "manual") as "google_places" | "manual",
  }
}
