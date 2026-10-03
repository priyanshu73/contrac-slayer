# Google Places business lookup (onboarding step 1)

While a contractor types their company name, we suggest matching businesses from Google Places. Picking one pre-fills name, phone, website, address, zip and trade. Everything stays editable and the lookup is optional.

## Behavior
- Empty fields only are filled; anything the user already typed is kept. The company name is replaced by the picked name.
- Filled fields show a "from Google" chip, which disappears when the user edits that field.
- Service-area businesses have no public address: the address stays empty and zip becomes required.
- "Not your business? Search again" clears only the Google-filled fields.
- If the lookup is unavailable (no key, network error, rate limit), the field behaves as a plain input and onboarding completes manually.

## Data
- Only `google_place_id` and `business_source` (`google_places` or `manual`) are stored on the contractor profile.
- The address is geocoded again with Mapbox, so stored coordinates never come from Google.
- Requests go through the backend (`POST /onboarding/places/autocomplete` and `/details`); the API key lives only in the backend environment.
