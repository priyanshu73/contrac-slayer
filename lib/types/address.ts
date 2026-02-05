/**
 * Address types for normalized address system
 */

export interface AddressData {
  street_line?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  lat?: number;
  lng?: number;
  formatted_address?: string;
  place_id: string;
}

export interface AddressResponse extends AddressData {
  id: number;
  created_at: string;
  updated_at: string;
}

/**
 * Mapbox Feature from autofill/geocoding API
 */
export interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  properties: {
    mapbox_id?: string;
    feature_type?: string;
    full_address?: string;
    name?: string;
    name_preferred?: string;
    place_formatted?: string;
    context?: {
      address?: { name?: string; address_number?: string; street_name?: string };
      place?: { name?: string };
      region?: { name?: string; region_code?: string };
      postcode?: { name?: string };
      country?: { name?: string; country_code?: string };
    };
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  text?: string;
  place_name?: string;
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

/**
 * Convert Mapbox feature to our AddressData format
 */
export function mapboxFeatureToAddressData(
  feature: MapboxFeature
): AddressData | null {
  if (!feature || !feature.geometry) {
    return null;
  }

  // CRITICAL: Use feature.center for coordinates (or geometry.coordinates)
  const coordinates = feature.geometry.coordinates; // [lng, lat]
  
  // Extract components from feature.context array (legacy Geocoding API format)
  const context = feature.context || [];
  
  let city = '';
  let state = '';
  let zip = '';
  let country = '';
  let street_line = feature.text || ''; // Main address text
  
  // Parse context array for address components
  context.forEach((item) => {
    if (item.id.startsWith('place.')) {
      city = item.text;
    } else if (item.id.startsWith('region.')) {
      state = item.short_code?.replace('US-', '') || item.text;
    } else if (item.id.startsWith('postcode.')) {
      zip = item.text;
    } else if (item.id.startsWith('country.')) {
      country = item.text;
    }
  });

  return {
    street_line: street_line || undefined,
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
    country: country || undefined,
    lat: coordinates[1], // Mapbox uses [lng, lat]
    lng: coordinates[0],
    formatted_address: feature.place_name || undefined, // Use place_name as formatted address
    place_id: feature.id, // Use feature.id as place_id
  };
}
