# Goal 0: Honest inquiry copy and measured first response

Status: implementation specification, not implemented. Target: dev only.
Frontend: priyanshu73/contrac-slayer. Backend dependency: sphere-trade/ContractorBackend.
Read ../goal-1/goal.md for migration/storage rules. No automatic migration or merge.

## Problem
The quote-request form promises a response it has not measured. Current dev source in `components/customer-request-form.tsx` has both:
- Header: "Typically responds in 2-4 hours".
- Submitted state: "You'll receive a detailed quote via email within the next 2-4 hours" during business hours.
Removing only the header leaves the same unsupported promise after submission. the owner asked to remove the response-time claim now and collect the data for an honest claim later.

## Scope
1. Remove both fixed time promises. Success copy: "Your request has been received. The contractor can review your details and contact you about next steps." Do not promise email delivery, a detailed quote or a deadline. Preserve contact and booking links.
2. Trace inquiry creation from `api.submitQuoteRequest` to `POST /contractors/{contractor_uuid}/quote-request` and the actual persisted request/lead relationship. Keep the existing workflow. Do not create a second lead pipeline.
3. Capture the accepted inquiry's server UTC timestamp in the same transaction as creation. Count only successfully persisted submissions. Tag known origin as `quote_form` or, once phase 2 exists, `website`; preserve tenant ID and request/lead IDs. Unknown origin remains unknown.
4. Capture the first attributable human contractor response to that inquiry: server-recorded outbound message successfully accepted by the existing messaging provider, or a connected outbound call with a reliably linked request. Do not count a form acknowledgement, automated follow-up, AI reply, notification to owner, failed send, page view, lead-status change or draft. Track automation separately.
5. If a channel cannot be observed reliably, record that coverage gap. Offer a clearly labeled owner-reported response event with declared occurrence time, actor and audit timestamp; never blend it into verified provider events. Do not pretend an unobserved phone call never happened.
6. Use idempotent event IDs/provider IDs, tenant-scoped links and the earliest valid qualifying response at/after submission. Keep raw event provenance; late/out-of-order callbacks may correct the derived first response. Event content/customer PII is unnecessary for the metric.
7. Elapsed response time is wall-clock seconds, not business-hours seconds. Store unanswered requests as unanswered, not zero or missing-from-denominator. Do not fabricate historical response times. Existing requests get historical submission times only if a reliable record exists, and remain a distinct backfill cohort.

## Proposed storage contract (backend portion)
Extend/reuse the canonical inquiry record after inspecting actual models. If no suitable schema exists, add a response-event table and measurement row in a new migration, not the old website migration:
- Measurement: tenant ID, inquiry ID FK/unique, submitted_at TIMESTAMPTZ, source, first_human_response_at nullable, qualifying_event_id nullable, coverage enum (`observed`, `partial`, `unknown`), created_at/updated_at.
- Event: ID, tenant/inquiry linkage, actor kind/ID, channel, event_type, occurred_at, recorded_at, provider_event_id or client idempotency key, evidence_kind (`provider`, `owner_reported`), delivery/connection status. Unique scoped provider/event key. No raw email/text body.
- Enforce FK/tenant consistency, timestamp order and first-response selection. Audit owner corrections instead of overwriting evidence silently. Add indexes for tenant + submitted_at and inquiry + occurred_at.
- Internal aggregate only: count accepted requests, responded/unanswered, channel coverage, sample size, period, median and p90 elapsed times for qualifying provider events. Keep owner-reported cohort separate. No public API exposure in this goal. Define retention using existing privacy policy before release.
These are proposed names/contracts. Map to the real request/lead and response sources before coding; a TODO hook without an event source does not satisfy data collection.

## Acceptance criteria
- Neither visible state contains the unsupported 2-4 hour response/quote promise. Tests cover both states and locale copy where present.
- Tenant A cannot write/read tenant B's measurements. Accepted request produces exactly one measurement; rejected submission produces none.
- Fixture accepted 10:00 UTC and qualifying response 10:15 UTC yields 900 seconds. Duplicate callbacks do not double count. Failed/automated events do not qualify. Earlier-than-submission events are rejected/flagged. Late callback chooses the earliest valid response.
- Requests without a qualifying event remain unanswered and are included in cohort counts. Coverage gaps and owner-reported times are visible internally.
- One isolated end-to-end fixture exercises a real implemented response source, not just a mocked metric function. If no channel has reliable response events, document the blocker and deliver honest copy first; do not mark collection complete.
- Form field validation, attachment submission and correct-tenant lead creation still work. Review non-2xx submission handling: current `submitQuoteRequest` parses JSON without an explicit HTTP success guard; a failure must not display success or create a false metric.
- Typecheck, lint, frontend tests/build and affected backend tests run; record failures rather than omit them. Screenshot initial and success states at mobile and desktop.

## Separate trust decision
The same component displays an unconditional "Verified" badge. This is not proof of identity, licence or insurance. the owner's latest instruction specifically removes the response claim, not the badge. Flag this in the implementation review; do not invent a verification system or silently interpret profile completion as verification. Ask whether to remove the badge or bind it to an existing evidenced verification status. No new templates may introduce this badge by default.

## Out of scope
New public response-time copy, SLA claims, auto-messaging, business-hours metrics, new communications providers, changing booking policy, phase-2 embedded form, deployment/merge or running the owner's migration.

## Sources
Current dev source inspected September 30, 2026: `components/customer-request-form.tsx`, `lib/api.ts`. Baseline report: the privately reviewed reference inventory (reference inventory, not current code proof).
