# Website builder: phase 1 goals and roadmap

Issue: [#146](https://github.com/priyanshu73/contrac-slayer/issues/146)

This document defines the first usable version of ContractorOps websites and the
smallest roadmap that can take it from an internal feature to a reliable product
surface for contractors.

## Product goal

Let a contractor publish a credible, mobile-friendly one-page website from
information they already have in ContractorOps, without needing a designer,
developer, or separate hosting workflow.

The phase-1 promise is deliberately narrow: a contractor can choose a visual
direction, provide essential business content, preview it at desktop and mobile
widths, publish a stable URL, and send visitors into an existing quote-request or
booking flow.

## Current baseline

The phase-1 foundation is present in the frontend:

- Three selectable templates: Modern, Craftsman, and Bold.
- An authenticated settings editor for the public slug and website content.
- Draft saving and explicit publishing, including unpublished-change state.
- Publish/unpublish controls and a copyable public URL.
- Desktop and mobile previews using the same renderer as the public site.
- Public server-rendered pages at `/sites/[slug]` with not-found and error states.
- Existing quote-request and booking flows exposed as calls to action.
- Editable company name, headline, description, services, about copy, service
  area, phone, email, logo URL, and hero image URL.
- English and Spanish editor translations, with stable English public-site copy.

The editor should remain the source of truth for content and template selection;
the public renderer should not grow a second, divergent presentation path.

## Goals and success criteria

### G1. Publish a useful site quickly

Given a contractor with a configured profile, the contractor can reach the editor,
select a template, complete the required fields, and publish a site in under ten
minutes.

Acceptance criteria:

1. The editor loads the existing draft or a safe default state.
2. Required fields are clear and invalid content is rejected before a write.
3. Saving a draft never makes it publicly visible.
4. Publishing returns a stable public URL and the editor shows live status.
5. Refreshing the editor preserves the saved content and selected template.

### G2. Make the public page trustworthy on mobile

Acceptance criteria:

1. Every template has a readable single-column layout at narrow widths.
2. Navigation, phone, email, booking, and quote links have usable touch targets.
3. Missing optional content removes the corresponding section cleanly instead of
   leaving empty labels or broken links.
4. A public page has a meaningful title and description for sharing and search.
5. Invalid or unavailable slugs return the designed not-found state.

### G3. Protect contractor intent and data

Acceptance criteria:

1. Unpublished edits never replace the currently live version.
2. A published slug cannot be changed accidentally after publication.
3. Unpublish removes public availability while retaining the contractor's draft.
4. User-entered URLs are limited to supported HTTP(S) image URLs.
5. Public pages do not expose authenticated API responses or session data.

### G4. Connect the site to existing conversion paths

Acceptance criteria:

1. The primary CTA reaches the contractor's existing quote-request flow.
2. A configured booking slug produces a booking CTA; no booking CTA is shown when
   no booking flow is configured.
3. Phone and email actions use the appropriate `tel:` and `mailto:` schemes.
4. Preview mode does not accidentally submit or navigate a contractor's live
   customer flows.

## Explicit non-goals for phase 1

The first release is not a general-purpose page builder. It does not include:

- Arbitrary drag-and-drop sections or per-element positioning.
- Multiple pages, blogs, portfolios, galleries, or custom navigation trees.
- Custom CSS, JavaScript, embedded code, or third-party widgets.
- Domain purchasing, DNS management, or email hosting.
- A full media library or image upload pipeline.
- Automated copy generation, SEO audits, analytics dashboards, or A/B testing.
- Per-template component overrides beyond the shared content model.

These exclusions keep the initial experience fast, safe, and supportable.

## Content model contract

The public site should continue to consume the shared `WebsiteContent` model:

| Field | Required | Phase-1 behavior |
| --- | --- | --- |
| `template` | yes | Selects one of the supported visual systems |
| `company_name` | yes | Brand name in the header and footer |
| `headline` | yes | Main hero promise; keep within the editor length limit |
| `description` | no | Supporting hero copy |
| `about` | no | About section; section is omitted when empty |
| `services` | no | Ordered service list; section is omitted when empty |
| `service_area` | no | Hero eyebrow and contact location |
| `phone` | no | Phone CTA and contact detail |
| `email` | no | Email contact detail |
| `logo_url` | no | Header mark, with a fallback icon |
| `hero_image_url` | no | Hero visual, with a template fallback |

The backend remains authoritative for persistence, slug ownership, publication
state, and public visibility. The frontend should validate for fast feedback but
must not be treated as the security boundary.

## Roadmap

### Phase 1A — harden the shipped foundation

Priority: now. This phase closes reliability gaps without expanding the product.

- Add focused tests for content validation, draft/publish state transitions, and
  public CTA visibility.
- Verify all three templates at narrow, medium, and wide breakpoints.
- Add explicit loading, retry, and publish failure states to the acceptance test
  checklist.
- Confirm backend validation mirrors frontend limits and URL rules.
- Confirm public metadata and canonical URL behavior for published slugs.
- Add a short in-product explanation of draft versus live content.

Definition of done: a contractor can publish, edit, unpublish, and republish
without losing content or exposing a draft, and the public page works on a phone.

### Phase 1B — improve conversion and onboarding

Priority: next. This phase improves the first-run experience using the existing
content model.

- Prefill safe fields from the contractor profile and service-area settings.
- Add a guided completion checklist with required and recommended fields.
- Add a lightweight preview/share flow before publication.
- Add template thumbnails that reflect the contractor's own draft content.
- Add clear empty states when booking or quote-request setup is incomplete.

Definition of done: a newly onboarded contractor can understand what remains,
publish with minimal typing, and see which customer action each CTA performs.

### Phase 1C — measure the funnel

Priority: after the publish flow is stable. Measure before adding builder power.

- Track editor opened, draft saved, publish attempted, publish succeeded, public
  CTA clicked, and booking/quote flow entered.
- Track template selection and publish completion by template.
- Add privacy-conscious aggregate counts for public CTA conversion.
- Define baseline targets after two weeks of real usage rather than guessing them
  in the UI.

Definition of done: product decisions can be made from publish and conversion
data, not only anecdotal feedback.

### Phase 2 — controlled expansion

Only start this phase after Phase 1 has reliable usage and support data.

Candidate work:

- Reusable sections for testimonials, project highlights, and service-area FAQs.
- Managed image uploads and a small media library.
- Custom domains and domain verification.
- Basic SEO controls and social preview images.
- Per-site analytics and conversion summaries.

Each addition should preserve the one-page, guided-authoring model unless user
research demonstrates a need for a more general builder.

## Technical guardrails

- Keep one renderer for editor preview and public output.
- Keep all backend requests inside `lib/api.ts`.
- Keep public routes independent of the authenticated app shell.
- Keep user-facing editor strings in both locale message files.
- Validate and sanitize again on the backend; frontend checks are UX only.
- Do not introduce arbitrary HTML, CSS, or script input in phase 1.
- Prefer additive schema changes with safe defaults so existing drafts continue to
  render.

## Open decisions before Phase 1B

1. Which profile fields are trustworthy enough to prefill automatically?
2. Should the public quote CTA require a configured quote-request destination, or
   should the editor block publication until one exists?
3. Which aggregate events are acceptable under the product's privacy policy?
4. Is the current three-template set sufficient for the first usage cohort, or is
   one contractor trade-specific template more valuable than another generic one?

These decisions should be answered with product/user feedback before expanding the
content schema.
