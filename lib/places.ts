/** Types for the onboarding Google Places lookup (served by ContractorBackend /onboarding/places/*). */
export interface PlacePrediction {
  place_id: string
  name: string
  secondary_text: string
}

export interface PlacesAutocompleteResult {
  available: boolean
  predictions: PlacePrediction[]
}

export interface PlaceDetails {
  available: boolean
  place_id?: string | null
  name?: string | null
  address?: string | null
  street?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  phone?: string | null
  website?: string | null
  suggested_contractor_type?: string | null
  is_service_area?: boolean
  business_status?: string | null
}

/** Google session token: one per search visit, a new one after each pick. 16-64 chars [A-Za-z0-9_-]. */
export function newPlacesSessionToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}
