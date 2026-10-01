# Goal 2: Guided setup, safe photos and a usable editor

Status: implementation spec, not implementation. Frontend: priyanshu73/contrac-slayer dev.
Backend upload/asset/revision contract: ../goal-1/goal.md in sphere-trade/ContractorBackend dev.

## Problem
The current editor starts with little more than company/email/phone and asks for image URLs. A contractor should build a complete, honest page from their profile and permitted work photos without learning hosting or repeating answers.

## Starting points
`components/websites/website-settings.tsx`, `contractor-website.tsx`, `lib/types/website.ts`, `lib/api.ts`, `app/sites/[slug]/page.tsx`. Existing profile setup already handles a logo and service-area data. `lib/api.ts` has logo upload and signed Cloudinary project media paths; reuse supported infrastructure after validating tenant/auth/privacy behavior, not by exposing private job media directly.
Existing shared renderer must continue to power draft preview and public page.

## Scope
### One guided workflow, with an expert editor
Implement the interview in goal 1 with progress, Back/Next, optional Skip, save-and-resume and clear error states. Allow "Edit all sections" without forcing users through a wizard repeatedly. Trade presets suggest editable questions/service names; they never create licences, reviews, insurance, years in business or response promises.
- Prefill only missing fields from authenticated profile: business name, confirmed public contacts, logo and service-area candidates. Show "From your profile". Never overwrite owner-edited content; offer a per-field update diff if profile changes later. Selecting phone explicitly distinguishes owner line from reception line if both exist.
- Ask for branding/services/hours/work/proof once. Blank optional sections are valid and hidden. Avoid long questionnaires before the contractor can see a useful preview.
- Review/publish checklist: identity/contact, selected template, permissions, credentials/expiry, timezone/hours, public-address visibility and empty-section warnings. No real-looking demo facts next to a real company name.

### Media experience and backend requirements
- Replace URL-entry controls with choose-file, drag/drop and phone-library upload; keep legacy URL display/replacement compatibility, no new unrestricted URL import.
- Proposed v1 limits: JPEG/PNG/WebP, maximum 10 MB and 25 megapixels/input; logo + hero + project photos. HEIC either server-converts safely or displays a clear supported-format error; no false "uploaded" state. Reject SVG/HTML, animated content, deceptive extensions and decoder bombs. Enforce quotas server-side; document final configured limits in UI.
- Check bytes/magic, MIME, decoded dimensions and authorizing site ownership; client validation is advisory. Use short-lived scoped upload signatures with narrowly constrained asset type/size and server confirmation after actual upload. Do not mark an arbitrary client-supplied URL ready.
- Decode/re-encode, normalize orientation, strip EXIF/GPS and other identifying metadata before producing public assets. Proposed responsive variants at 480/960/1600px, quality/compression tuned visually, no enlargement of small originals; allow transparent logo. Use CDN variants/srcset and explicit image dimensions.
- Crop hero/logo with accessible zoom, focal point, reset and preview across mobile/desktop ratios. Keep sanitized master so changing template can recrop without destructive quality loss. Crop updates create a new variant/reference, not a mutation of the published image.
- Show thumbnails, progress, retry/cancel/remove, captions/alt text, reorder and before/after pair selection. Interrupted upload is recoverable; autosave never publishes half-ready assets. On backend failure, distinguish uploaded bytes from confirmed usable asset.
- Existing job/project images are opt-in candidates, never auto-public. Ask rights permission and review faces, plates, house numbers, exact addresses and sensitive details; allow crop/replacement. Metadata stripping is not visual anonymization. Do not promise automatic redaction.
- Original/raw assets and credential documents remain private. Draft-only variants are not anonymously accessible via an API or reusable public URL. Promotion to public delivery occurs only with explicit publish. If current storage cannot enforce that boundary, document and fix it before gallery release.
- Delete draft assets after a documented grace period only if not referenced by current published snapshot or retained revisions. Unpublish/deletion must stop serving site assets through active public routes; do not claim previously downloaded images can be recalled.

### Editor parity in this goal
- Section enable/reorder with drag handle and keyboard Move up/down; constrained background tokens. Hidden content persists.
- Debounced draft autosave with Saving/Saved/Failed/Offline/Conflict states, unsaved-navigation guard, retry and server-confirmed revision. Autosave does not call publish. Leave explicit Publish changes and Unpublish.
- Undo/redo within session; revision list and restore confirmation using goal 1. Restore creates new draft. Resolve server conflict by showing latest vs local, not last-write-wins.
- Desktop/mobile preview has the real shared renderer at actual target widths; no scaled desktop mislabeled mobile. Safe preview disables live form/book/call actions.
- Inline text editing is an alternate view of the same validated fields, not contentEditable HTML storage. Keyboard navigation and error focus remain usable.

## Acceptance criteria
- New and existing contractor fixtures complete/skip/resume setup; existing profile logo/area appear as candidates, returning owner's edits are preserved. Draft reload/failed save/stale-tab conflict tested.
- Submit valid phone image, crop, caption and publish: sanitized responsive asset renders. EXIF/GPS inspection verifies removal; private original and draft asset fail anonymous access. Cross-tenant signature/key/reference attempts fail.
- Oversize/spoofed/unsupported image, failed provider upload, orientation, very small image, transparent logo, interrupted upload, referenced-asset deletion and before/after pairing all tested.
- Same content renders in editor and public after publish; edits/uploads alone do not affect current public site. Empty photo/review/credential sections are absent, no placeholder trust claims.
- Inspect actual desktop and 390px screenshots of each wizard step, gallery, crop, loading/error/conflict states and public output. No clipped actions/horizontal overflow. Keyboard operation, labeled inputs, focus/error behavior, tap targets and contrast pass accessibility checks.
- Record API contract tests and run typecheck/lint/tests/build plus affected backend upload tests. Full regression includes quote form and existing logo/project media workflows. Strict independent UI/UX and code/test review reaches 8/10 before merge proposal.

## Out of scope
AI rewrite/generation, web scraping, external image URL fetching, importing private CRM automatically, full image editor/redaction service, public response claims, new booking engine, embedded quote form, production release.

## Reference and improvement rule
TradeForge inspected editor inventory includes autosave, undo/redo, inline edits, gallery/before-after, hours/timezone/away, section ordering/backgrounds and theme controls. Borrow the workflow concepts, not their copyrighted code/assets/copy. Improve through profile reuse, one interview, honest empty states, visible save/publish boundary and privacy-first photos.
Sources: the privately reviewed reference inventory ; https://tradeforge.ca/templates . Current source paths above inspected September 30, 2026.
