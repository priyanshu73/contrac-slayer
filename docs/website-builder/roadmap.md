# Website builder goals and handoff

Specifications only, prepared September 30, 2026. No implementation, migrations, deployment or merge performed. Dev only; no main/prod or mobile app changes.

## End state
A contractor completes one guided interview, uploads permitted work photos, picks from twenty distinct layouts and explicitly publishes a credible website. Profile reuse prevents repeated questions. Drafts remain private; existing quote/booking workflows remain in use.

## Baseline and phase 1
Current live audit verifies Settings > Your website at https://dev.frontend.contractorops.ai/en/settings and published https://dev.frontend.contractorops.ai/sites/bob-the-builder . Public HTML/JSON and quote/booking destinations load; real submissions and complete write lifecycle were not tested. Current dev source was separately inspected: one site per contractor, locked published slug, JSON draft/published snapshots, explicit public schema, three styles/shared renderer. Existing migration execution is owner-reported, not an independent revision check.

- goal-0/goal.md: remove both unsupported response-time promises; collect first-human-response evidence, keep automated responses separate. Verified badge remains a separate decision.
- goal-1/goal.md: structured content, interview, version-safe snapshots, asset/provenance/revision schema and additive Alembic migration.
- goal-2/goal.md: profile prefill candidates, guided setup, safe upload/crop, editor autosave/undo/revisions/section controls.
- goal-3/goal.md: twenty total distinct layouts, theme controls, content-preserving switches and staged reviews.

Copy fix can land first. Establish the common schema/API before setup/upload/template batches. Match UI/backend each slice, run full suites and use independent strict code/test and UI/UX review to 8/10 before proposing merge. The owner runs migrations himself; provide tested file/revision and paste-ready prompt when implementation exists. These files do not imply implementation is approved without the accompanying owner direction.

## Phase 2 outline (not detailed implementation scope)
### 4. Quote-request form inside the contractor website
Reuse the existing detailed form inside the branded public site, not an external CTA or a separate lightweight inquiry funnel. Same supported name/email/phone/address/structured-address/project-type/description/measurements/attachment fields, validation and canonical submission workflow. Requests land in that contractor's existing Leads. Later spec correct tenant resolution, idempotency, spam/rate limits, notifications/consent, source attribution and honest submission success. Booking-rule redesign is not part of the owner's clarification of item 4.

### 5. Subdomains later, architecture now
Keep `/sites/<slug>` in phase 1. Stable site/tenant IDs, reserved infrastructure slugs, centralized origin/path builders and host-independent form/asset/calendar URLs keep domain routing possible. Slug/host is never edit authorization; app cookies stay host-scoped. Later: verified host mapping, unknown-host rejection, wildcard DNS/SSL, canonical address, then custom-domain lifecycle. No DNS change, domain purchase or activation in phase 1. Preserve the current locked published slug.

### 6. SEO and sharing
Current public page already includes basic metadata/OG; extend it. Later: canonical strategy, publish-aware sitemap/robots, owner SEO overrides, safe factual structured data, optimized OG images, link/QR, speed/accessibility checks. Phase-1 SEO fields/assets supply inputs. Drafts are noindex and excluded from sitemap. No fake ratings or private home address published for schema eligibility.


## Paired repository contracts
Frontend: priyanshu73/contrac-slayer, dev. Backend: sphere-trade/ContractorBackend, dev. Backend goal 1 is the canonical data/API contract. Frontend goals 2-3 depend on it. Goal 0 crosses both repos. Link the approved paired PR/commit once available. Phase-2 entries above are outline only.
