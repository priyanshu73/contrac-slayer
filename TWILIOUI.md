# Twilio UI Reference — `contrac-slayer` (Frontend)

> **Superseded for current state & plans:** See [`../Twilio Upgrade.md`](../Twilio%20Upgrade.md) (May 2026 — dashboard picker, no onboarding provision). This file remains a frontend file index.

> **Purpose**: Agent reference for all Twilio-related frontend code, UI components, hooks, API bindings, and data flows.

## Repo Paths

| Repo | Path | Stack |
|------|------|-------|
| **contrac-slayer** (this repo) | `/Users/priyanshupyakurel/Projects/contract/contrac-slayer` | Next.js / React |
| **ContractorBackend** | `/Users/priyanshupyakurel/Projects/contract/ContractorBackend` | FastAPI / Python |
| **ContractorAI** | `/Users/priyanshupyakurel/Projects/contractorAI` | Flask / Python |

---

## Architecture Overview

The frontend **never talks to Twilio directly**. All Twilio interaction is mediated through two backend APIs:

| Backend           | Role                                                                                   | API Base URL                             |
|-------------------|----------------------------------------------------------------------------------------|------------------------------------------|
| **ContractorBackend** (FastAPI) | Auth, profiles, contractor number lookup (proxies to ContractorAI)           | `NEXT_PUBLIC_BACKEND_URL` from `.env`     |
| **ContractorAI** (Flask)        | SMS/Voice webhooks, follow-up scheduling/sending, conversations, lead data  | `NEXT_PUBLIC_CONTRACTOR_AI_URL` from `.env` |

```
┌──────────────────────────────────────────┐
│           contrac-slayer (Next.js)        │
│                                          │
│  useContractorOpsNumber() hook           │
│       ↓                                  │
│  api.getContractorOpsAiNumber()          │
│       ↓ GET /contractors/profile/        │
│         contractor-ops-ai-number         │
└──────────────┬───────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  ContractorBackend  │
    │  (FastAPI)          │
    │  contractor_routes  │
    │  .py → proxies to:  │
    └──────────┬──────────┘
               │ GET /api/service-providers/{sp_id}
    ┌──────────▼──────────┐
    │  ContractorAI       │
    │  (Flask)            │
    │  contacts.twilio_no │
    └─────────────────────┘
```

---

## Key Files

### Hooks

#### `hooks/useContractorOpsNumber.ts`
- **What it does**: Fetches and caches the contractor's assigned Twilio number (the one customers call/text).
- **Cache**: `localStorage` keyed by `contractorOpsAiNumber_{profileId}`. Profile-specific to avoid cross-user contamination.
- **API call**: `api.getContractorOpsAiNumber()` → `GET /contractors/profile/contractor-ops-ai-number`
- **Returns**: `{ number: string | null, loading: boolean, error: Error | null, refresh: () => Promise<void> }`
- **Logout cleanup**: `clearContractorOpsNumber()` exported separately; removes all cache keys.

### Components Using Twilio Number

| Component | File | Usage |
|-----------|------|-------|
| **DashboardContractorOpsNumber** | `components/dashboard-contractor-ops-number.tsx` | Displays Twilio number in a card; copy-to-clipboard; "Set Up" link if not assigned |
| **StatsCardsReal** | `components/stats-cards-real.tsx` | Shows Twilio number in stats header; copy-to-clipboard |
| **Dashboard Page** | `app/[locale]/dashboard/page.tsx` | Uses `useContractorOpsNumber` to display number; copy functionality |

### API Bindings (`lib/api.ts`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `getContractorOpsAiNumber()` | `GET /contractors/profile/contractor-ops-ai-number` | Get the Twilio number for the logged-in contractor |
| Follow-up methods (see below) | Various `/followup/*` | Manage Twilio-sent follow-up SMS |

### Follow-Up System (Twilio SMS Delivery)

The frontend has a full follow-up management UI that triggers SMS sends via the ContractorAI backend:

```typescript
// All in lib/api.ts — these hit the ContractorAI Flask API:
getFollowupSettings(spId)         // GET /followup/settings/{spId}
updateFollowupSettings(spId, data) // PUT /followup/settings/{spId}
getScheduledFollowups(spId, params) // GET /followup/scheduled/{spId}
scheduleFollowup(data)            // POST /followup/schedule
scheduleQuoteFollowup(data)       // POST /followup/schedule-quote
cancelFollowup(followupId)        // DELETE /followup/{followupId}
getFollowupTemplates(spId)        // GET /followup/templates/{spId}
sendImmediateFollowup(data)       // POST /followup/send-immediate
```

**UI components**:
- `components/client-communications-card.tsx` — Shows recent follow-ups per client, schedule/cancel
- `components/client-schedule-followup-dialog.tsx` — Dialog to schedule a new follow-up SMS
- `components/client-send-sms-dialog.tsx` — Dialog to send immediate SMS
- `lib/types/followup.ts` — TypeScript types including `twilio_message_sid`

---

## Twilio Number Provisioning (Onboarding)

### Profile Setup Page: `app/[locale]/auth/profile-setup/page.tsx`

During **Step 2** of onboarding, the contractor selects:
1. **State** — determines which area codes are available
2. **Area codes** — preferred area code(s) for their Twilio number

After profile creation (Step 3), the UI opens an in-app **number picker**:
- `api.getAvailableTwilioNumbers(areaCode)` → ContractorBackend `GET /contractors/profile/twilio-available` → ContractorAI `GET /api/twilio/available`
- User picks a number → `api.provisionTwilioNumber(...)` → ContractorBackend `POST /contractors/profile/twilio-provision` → ContractorAI `POST /api/twilio/provision`

Dry-run by default unless `TWILIO_PROVISIONING_ENABLED=true` on ContractorAI.

> [!NOTE]
> **SheetDB is no longer used for Twilio onboarding.** Referral tracking on the signup page may still use `NEXT_PUBLIC_SHEETDB_API` — that is separate from number provisioning.

### Area Code Data: `lib/area-codes.ts`
- Maps US states to their area codes
- `getAllStates()`, `getAreaCodesForState(state)` helpers

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CONTRACTOR_AI_URL` | ContractorAI base URL (follow-ups; optional direct calls) |
| `NEXT_PUBLIC_BACKEND_URL` | ContractorBackend API base URL (for number lookup proxy) |
| `NEXT_PUBLIC_CONTRACTOR_AI_URL` | ContractorAI API base URL (for follow-ups, conversations) |

---

## Privacy / Legal References

- `app/[locale]/privacy/page.tsx` — Mentions Twilio as a third-party SMS provider in the privacy policy.

---

## Data Flow Summary

### Twilio Number Display
```
User opens Dashboard
  → useContractorOpsNumber() checks localStorage cache
  → Cache miss: GET /contractors/profile/contractor-ops-ai-number (ContractorBackend)
    → ContractorBackend looks up profile.contractor_ai_sp_id
    → Calls ContractorAI: GET /api/service-providers/{sp_id}
    → Returns contacts.twilio_no
  → Cached in localStorage, displayed in UI
```

### Follow-Up SMS (Twilio Send Path)
```
Contractor schedules follow-up via UI
  → POST /followup/schedule (ContractorAI)
  → ContractorAI stores ScheduledFollowUp in DB
  → Cron job (send_followups.py) picks up due follow-ups
  → FollowUpService.send_followup() → TwilioService.send_sms()
  → SMS delivered via Twilio API
```

### Immediate SMS (Send Now)
```
Contractor clicks "Send SMS" in client card
  → POST /followup/send-immediate (ContractorAI)
  → ContractorAI sends immediately via TwilioService.send_sms()
```

---

## Simplification Plan (Frontend Impact)

> [!NOTE]
> The frontend has **zero changes** required for the backend Twilio simplification. All refactoring happens in ContractorAI (`/Users/priyanshupyakurel/Projects/contractorAI`). The API contracts remain identical.

### Future Frontend Work (Post-Simplification)

| Feature | Priority | Files to Create/Modify |
|---------|----------|----------------------|
| **SMS delivery status UI** | Medium | New component — show ✅/❌ per sent message |
| **Pool dashboard in admin** | Low | New page at `app/[locale]/admin/twilio-pool/page.tsx` |
| **Automated number provisioning** | High | Replace SheetDB flow in `profile-setup/page.tsx` with direct Twilio API call via ContractorAI |
| **Cache invalidation** | Low | Add WebSocket/SSE push for Twilio number changes |

---

## TODO / Known Gaps

- [x] **Onboarding number picker** — profile-setup uses provisioning API (dry-run unless `TWILIO_PROVISIONING_ENABLED=true`)
- [ ] **Live purchase in production** — confirm `TWILIO_PROVISIONING_ENABLED` and Twilio console webhooks on deploy
- [ ] **No Twilio status callbacks in frontend**: Delivery status (delivered/failed) not shown in UI
- [ ] **No Twilio webhook configuration UI**: Admin must configure webhooks in Twilio console manually
- [ ] **Cache invalidation**: Twilio number cache only cleared on logout; no push-based invalidation if number changes
- [ ] **No number pooling UI**: Pool management (assign/release/cooldown) is backend-only, no admin UI in frontend
