# Service Area Fields — Frontend Implementation

## What this is

Contractors need to tell the system how far they travel for jobs and which specific areas they serve. This information feeds into the AI voice agent's prompt so it can correctly tell callers whether a job location is in range.

## What's already done (no backend work needed)

- `service_radius_miles` (Integer, nullable) and `service_area_notes` (Text, nullable) columns are live in the `contractor_profiles` table
- Both fields are in `ContractorProfileUpdate` and `ContractorProfileResponse` schemas
- `PATCH /api/contractors/profile` already saves and returns these fields — no new routes needed
- `GET /api/contractors/profile` already returns them

## What needs to be built (frontend only)

### 1. Onboarding — `app/[locale]/auth/profile-setup/page.tsx`

Add a new section after the address autocomplete step. Keep it lightweight — one question with a visual picker and one optional text box.

**"How far do you travel for jobs?"**
- Button group: `10 mi`, `25 mi`, `50 mi`, `100 mi`, `Custom`
- If Custom: show a number input (integer, miles)
- Maps to `service_radius_miles` (send as integer)

**"Any specific cities or areas? (optional)"**
- Single-line or short textarea
- Placeholder: `e.g. Denver metro, Aurora, Lakewood — not Colorado Springs`
- Maps to `service_area_notes` (send as string)

Include these in the profile PATCH payload on submit alongside the existing fields (`default_zip_code`, etc.).

### 2. Settings page — contractor profile settings form

Add the same two fields to the existing profile edit form so contractors can update them post-onboarding.

- `service_radius_miles` — number input or the same button group as onboarding
- `service_area_notes` — textarea

PATCH to `PATCH /api/contractors/profile` on save, same as all other profile fields.

Find the settings page — search for where `default_zip_code` or `company_name` are edited in the settings UI, that's where these go.

## API reference

```
PATCH /api/contractors/profile
Authorization: Bearer <token>

{
  "service_radius_miles": 25,
  "service_area_notes": "Denver metro, Aurora, Lakewood"
}
```

Response includes the full `ContractorProfileResponse` with both new fields.

## Git workflow

Before starting any work, sync your branch with `dev`:

```bash
git fetch origin
git rebase origin/dev
```

Do this again before pushing if you've been working for a while — `dev` moves fast.

When you push, use a commit message that makes it obvious what changed:

```
# Good
feat: add service radius and area notes to onboarding and settings

# Too vague
fix stuff
update fields
wip
```

Push your branch as-is — do not merge into `dev` yourself:

```bash
git push origin <your-branch-name>
```

Then open a PR against `dev` and tag it for review.

## Notes

- Both fields are optional — don't make them required in the form or validation
- `service_radius_miles` should be a positive integer; if the user clears it send `null`
- The AI voice prompt already uses these fields once they're saved — no further wiring needed
- No new backend routes, no migrations, no schema changes required
