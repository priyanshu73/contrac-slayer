# Service Area Onboarding — Implementation Guide

## Background

Contractors serve a specific geographic area. Currently, `service_area` in the AI voice prompt is derived from the contractor's business address (`city, state, zip`). That tells callers where the business is located — not how far they travel. This change adds a proper service area step to onboarding.

## DB columns (already migrated — no action needed)

Both columns are already on `contractor_profiles`:

| Column | Type | Notes |
|---|---|---|
| `service_radius_miles` | `INTEGER` nullable | How far they travel from their base location |
| `service_area_notes` | `TEXT` nullable | Free-text override — specific cities, suburbs, exclusions |

Both are exposed on `ContractorProfileUpdate` and `ContractorProfileResponse` schemas, so the backend PATCH `/contractors/profile` endpoint already accepts and returns them.

## What to build

Add a new section to the profile setup page (`app/[locale]/auth/profile-setup/page.tsx`) — after the business address autocomplete step, before the phone number / area code step.

### Section: "How far do you travel for jobs?"

**Radius picker** — pill/button group, single select:

```
[ 10 mi ]  [ 25 mi ]  [ 50 mi ]  [ 100 mi ]  [ Custom ]
```

When "Custom" is selected, show a small number input (miles, integer, 1–500).

Store selection in `formData.service_radius_miles` (integer or null).

**Optional cities/notes field** below the radius picker:

```
Specific cities or areas? (optional)
[ _________________________________________________ ]
  e.g. Denver metro, Aurora, Lakewood — not Colorado Springs
```

Store in `formData.service_area_notes` (string or null).

### Wire to profile update

Include both fields in the final PATCH payload sent at the end of onboarding:

```ts
service_radius_miles: formData.service_radius_miles || null,
service_area_notes: formData.service_area_notes?.trim() || null,
```

## How the backend uses these fields

`crm_context()` in `contractor_routes.py` already builds a `service_area` string for Nova's prompt. Once these columns are populated the logic there will be updated to:

1. If `service_area_notes` → use it verbatim
2. Else if `service_radius_miles` + city → `"within {N} miles of {city}, {state}"`
3. Else → current fallback: `"city, state, zip"`

No frontend work needed for that part.

## Settings page

Also expose both fields on the Settings → Profile page so contractors can update them post-onboarding. The existing profile form already maps `ContractorProfileResponse` fields — just add the same radius picker + notes input there.

## Acceptance criteria

- [ ] Onboarding profile-setup page shows the radius picker + optional notes field after address step
- [ ] Selecting a radius and/or typing notes saves correctly to the profile (visible in Settings → Profile)
- [ ] "Custom" radius shows a number input and saves the entered value
- [ ] Both fields are optional — existing onboarding flow still completes without them
- [ ] Settings page also lets the contractor update these fields post-onboarding
