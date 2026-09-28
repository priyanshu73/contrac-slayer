/**
 * Mapbox helpers shared by address inputs and forms.
 */
import { AddressData, MapboxFeature, mapboxFeatureToAddressData } from "@/lib/types/address";

/**
 * Forward-geocode a free-text address into structured AddressData via Mapbox.
 * Used when someone types an address without picking an autocomplete
 * suggestion. Returns null when there is no confident match
 * (relevance < 0.8) or on any failure, so callers can safely fall back to
 * submitting the raw string only.
 */
export async function geocodeAddress(query: string): Promise<AddressData | null> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const trimmed = query.trim();
  if (!accessToken || trimmed.length < 3) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        trimmed
      )}.json?access_token=${accessToken}&types=address&country=us&limit=1&autocomplete=false`
    );
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const feature: MapboxFeature | undefined = data.features?.[0];
    if (!feature || (typeof feature.relevance === "number" && feature.relevance < 0.8)) {
      return null;
    }
    return mapboxFeatureToAddressData(feature);
  } catch {
    return null;
  }
}
