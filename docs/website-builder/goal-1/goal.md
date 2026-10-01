# Goal 1: Versioned website content and the setup interview

Status: proposed implementation spec. Backend: sphere-trade/ContractorBackend, dev only.
Frontend counterpart: priyanshu73/contrac-slayer, dev only. No mobile-app changes.
Dependencies: goal 0 telemetry; goal 2 assets; goal 3 template registry. Implement matched contracts per slice.

## Problem
Current content cannot describe a complete trade business. It is a small JSON snapshot with string services, one service-area string and URL image fields. Adding many templates before fixing the model would multiply empty layouts and repeat setup questions.

## Verified baseline
`app/models/contractor_website.py`: one `contractor_websites` row per contractor, unique 63-character slug, JSON draft/published, is_published, published_at and updated_at. `app/schemas/contractor_website.py` explicitly validates public content. `app/api/website_routes.py` uses the existing tenant-scoped service with GET/PUT `/website`, POST `/website/publish`, POST `/website/unpublish` and anonymous GET `/websites/{slug}` (API prefix is deployment configuration).
`alembic/versions/contractor_websites.py` created the table and merged heads `a4c8e2f6b1d3` and `7c9a2e4d6f81`. Do not edit this migration. Published slug stays locked. Dev public renderer is `/sites/[slug]`; editor is Settings > Your website.

## Scope and design
Keep draft and published snapshots as the rendering source of truth. Do not read live profile/private CRM records into a published page. Use a validated schema-v2 JSON document for nested public content, plus relational rows for lifecycle, private provenance and assets. This is a proper database migration even though public nested fields remain JSON: version/revision bookkeeping, asset ownership, setup progress and response events require constraints and indexes.

### Public content v2 (proposed contract)
All arrays have stable IDs and explicit order; IDs survive template switches. Optional/empty sections hide without fake fixtures. No arbitrary HTML, scripts or CSS.

| Group | Fields and validation |
| --- | --- |
| identity | company_name (existing max 255), trade_code and optional custom trade label, headline (120), description (400), about (2500), established_year nullable with plausible date validation |
| public_contact | owner-approved phone, email, optional social HTTPS links, `address_visibility: hidden/town_only/public_business`, separate explicitly approved display address. Never infer home address publication from service area |
| branding | owned logo/hero asset IDs, hero focal point, alt text; template_id and template_version; theme tokens: palette, approved font-pair ID, logo size, density and button style |
| availability | IANA timezone, weekly day intervals or closed, optional holiday/date overrides, away range and notice. Store local times plus timezone, handle overnight intervals explicitly. Emergency availability is an owner-supplied claim, not an inferred response promise. These display hours do not change scheduler rules |
| services | ID, name (80), description (600), optional owned image ID, optional explicit owner-approved price label. Max 30; no default "free estimate" |
| service_areas | ID, display label, kind (`town`, `postal_region`, `radius`), country/region and optional validated geometry. Max 50; public display can be a town list without exposing private base coordinates. Public coverage and actual quote eligibility remain separate |
| projects | ID, title (160), service IDs, description (2000), approximate town/date (optional), ordered images with alt/caption, optional before/after pair IDs. Max 50 projects, 20 images/project. No exact customer address by default |
| credentials | ID, kind, title, issuer, jurisdiction, public number (optional), expiry date, display policy. Evidence/verification is private and server-controlled. Expired claims must be flagged before publish; do not say "verified" because owner entered a number |
| testimonials | ID, text (1500), approved display name, date optional, rating optional 1-5, source label/permalink optional. No aggregate stars/counts inferred from free text. Publish only owner-approved content with permission status recorded privately |
| faqs | ID, question (200), answer (2000), order. Max 30; trade prompts are editable suggestions, never auto-filled factual promises |
| sections | ordered registry keys for hero/services/projects/about/credentials/testimonials/faq/hours/areas/contact; enabled flag, constrained background token. Mandatory identity/contact affordance stays reachable; content remains stored when hidden |
| seo (foundation) | optional owner title (70), description (170), share-image asset ID. Phase 2 uses these; no automatic indexing of draft |

Proposed limits are engineering defaults, not existing facts. Apply byte/array/nesting limits server-side; return field errors instead of truncating content. Retain v1 compatibility during rollout.

### Private data and migration
Create a new Alembic revision based on the actual current dev head, determined at implementation time. The historical `contractor_websites` revision is not guaranteed to remain today's tip. If multiple heads exist, stop and resolve deliberately; do not guess or rewrite migration history.
1. Add `schema_version` (initial compatibility default 1), `draft_revision` (integer, initial 1) and nullable `published_revision` to contractor_websites. Each document also identifies its own version; avoid assuming draft and published versions match during transition.
2. Add `contractor_website_revisions`: site FK, tenant ownership through site, revision number unique per site, version, immutable content snapshot, editor actor ID, created_at, reason. Restore creates a new draft revision; never mutates a historic revision. Record legacy snapshot as migration/import history without presenting it as newly approved content. Retention policy must avoid unbounded storage and preserve currently published references.
3. Add `contractor_website_setup`: site FK unique, completed_step IDs, skipped fields, last step, updated_at. For an unsaved suggested site, progress can be local until first authenticated draft creation. No fake database site on a read.
4. Add `contractor_website_assets`: site FK, immutable provider asset key (not a URL-only string), MIME, bytes, dimensions, sanitized variants, hash, status, created_by/at, private original reference, rights_attestation version/actor/time, crop/focal metadata. Owner can access own drafts; public projection exposes only approved variants referenced by published snapshots. Old asset revisions remain available while published/revision references exist.
5. Store private field evidence/approval records keyed by site + stable content item ID: owner/import source, optional private evidence reference, permission/verification status and actor/time. Never serialize these rows into anonymous content. There is no licence-verification service in this phase.
6. Add/reuse response measurement/event schema from ../goal-0/goal.md against the actual canonical inquiry model, with scoped uniqueness and tenant checks. Avoid a second inquiry table.
7. Preserve unique contractor_id/slug and publication timestamps. Add required FK/unique/index constraints. Use existing SQLAlchemy JSON strategy; changing JSON to JSONB requires an explicit tested migration, not an accidental autogenerate change.

### Compatibility and backfill
- Map each v1 service string to a stable service object; keep legacy service_area as owner-provided display text until owner confirms structured coverage. Preserve company/about/contact/headline and template IDs modern/craftsman/bold.
- Existing external logo/hero URLs remain legacy references. Do not silently download or confer rights. Offer replacement/review in setup; rendering compatibility must not break existing published pages.
- Do not auto-publish new defaults, credentials or template previews. Prefer additive DB migration + version-aware reader, then owner-triggered v2 draft conversion; old published snapshot continues to render until explicit republish.
- Version-aware API adapter accepts v1 during transition and returns the client's supported shape. If a v1 client would overwrite richer v2 data, reject with upgrade-required rather than discard fields. Unknown future versions fail safely.
- PUT/save/publish uses expected draft_revision (optimistic concurrency), 409 conflict on stale edit and latest safe draft response. Publish atomically validates + stores exactly the reviewed snapshot and revision. Unpublish and public reads preserve today's semantics.

### Setup interview (frontend counterpart)
Ask once, in plain language; prefill known fields with their source and offer Edit/Skip. Never ask the user to type business identity again after profile setup.
1. Business: "What trade do you do? What name should customers see? What is the main thing you want them to know?" Confirm logo, public phone/email and address visibility.
2. Work: "Which services do you offer? Which towns or postal areas do you cover?" Suggest trade-specific service names only, requiring selection. Do not assume every service in a trade preset is offered.
3. Availability: "What are your normal hours and timezone? Any upcoming time away? Do you offer emergency service?" Display-hours disclaimer prevents changing calendar capacity.
4. Proof: "Which projects can you show? Do you have permission to publish these photos? What credentials can you accurately display? Any testimonials you're allowed to use?" Separate private evidence from public numbers; all optional.
5. Questions/brand: "What do customers usually ask? Which look, colours and fonts fit you?" Suggestions remain draft.
6. Review: summarize missing/optional answers, contact destination, hours, image rights and unsupported claims; preview and explicit Publish. Save draft anytime and resume without re-asking completed questions.

## Acceptance criteria
- Upgrade tested on empty database and realistic v1 published/draft fixture; row counts, locked slugs and public text survive. Published pages do not change because migration ran. Downgrade tested in disposable DB with an explicit data-loss warning/backup plan; no production downgrade.
- Pydantic/backend/TypeScript contracts agree, reject unexpected fields and control nested limits. Two-tenant tests cover manage/revisions/assets/public projection, not only parent site read.
- Credentials/private evidence, private original photos, job addresses, customer IDs and raw metric events absent from anonymous API HTML/JSON.
- Save/edit/publish/edit/republish/unpublish lifecycle, stale revision conflict, restore-as-new-draft and old-client protection tested. No accidental public autosave.
- Owner skips optional sections and still publishes a credible minimal page. Existing v1 pages still render; template switch retains all IDs/content and approvals.
- Deliver migration filename, revision/down_revision, backup/check commands and paste-ready dev migration prompt for the owner. He runs it. No migration execution in an implementation agent's environment against shared dev/prod.
- Run full backend suite and frontend `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; record pre-existing failures separately. Review UI at 390px/desktop. Require independent strict code/tests and UI/UX reviews scoring at least 8/10, fixing findings before proposing a merge; never self-certify a missing review.

## Out of scope
Automatic publishing/import/KB writes, scraping, review aggregation, domain activation, payments, new CRM, changing booking confirmation, mobile app, production deployment or auto-merge.

## Sources
Current dev source paths above inspected September 30, 2026; attached current gap report. Reference inventory: the privately reviewed reference inventory . Pattern source: https://tradeforge.ca/templates . Structured fields/migration here are proposed ContractorOps design, not a claim about TradeForge's database.
