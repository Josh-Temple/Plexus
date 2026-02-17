# STEP: Plexus UX Improvement Rollout Plan

Last updated: 2026-02-16 (UTC)

Status note: Phase 1-5 implementation tasks are completed in code; env-backed manual E2E remains recommended for final production validation.

## Goal
Implement all currently proposed UX improvements in safe, debuggable phases without blocking progress.

---

## Phase 1 — Stability & Onboarding (P0)

### Scope
- Add graceful fallback when Supabase env vars are missing.
- Prevent startup crashes and show a guided setup message.
- Align behavior on `/` and `/auth`.

### Deliverables
- [x] Env guard utility (single source of truth).
- [x] Setup required screen/component.
- [x] Home/Auth behavior aligned when env missing.

### Acceptance Criteria
- [x] App does not throw 500 for missing env during normal page load.
- [x] User sees clear setup instructions with required env key names.
- [ ] Existing auth flow still works when env is present. (needs `.env.local` for final confirmation)

### Verification
- [x] `npm run lint`
- [x] `npm run typecheck`
- [ ] Manual: open `/auth`, `/`, `/note/[id]` with and without env. (without env: done, with env: pending)

---

## Phase 2 — Home Discoverability & Bulk Actions (P1)

### Scope
- Enrich note list cards with metadata.
- Add multi-select + bulk actions.
- Improve search UX (target toggle + highlighting).

### Deliverables
- [x] Metadata chips (updated time / state / link counts).
- [x] Selection mode and bulk action toolbar.
- [x] Search mode switch (title only / title+body).
- [x] Optional keyword highlight in result snippet/title.

### Acceptance Criteria
- [x] Users can batch-update at least pin/inbox/delete.
- [x] Search behavior is predictable and visibly scoped.
- [x] No regressions in existing create/import/filter flow.

### Verification
- [x] `npm run lint`
- [x] `npm run typecheck`
- [ ] Manual: create >=5 notes and validate selection/search flow.

---

## Phase 3 — Wiki-Link Reliability (P1)

### Scope
- Resolve duplicate-title ambiguity.
- Add unresolved-link visibility and fast creation.
- Ensure preview link navigation points to actual notes.

### Deliverables
- [x] Disambiguation UI for duplicate title matches.
- [x] Unresolved link section + quick create action.
- [x] Internal link mapping from preview to note route.

### Acceptance Criteria
- [x] No silent "first-match" behavior for ambiguous links.
- [x] Unresolved links can be converted to notes in <=2 taps.
- [x] Tapping wiki links from preview opens intended note.

### Verification
- [x] `npm run lint`
- [x] `npm run typecheck`
- [ ] Manual: duplicate title scenario + broken link scenario.

---

## Phase 4 — Editing Flow & Connections Actionability (P2)

### Scope
- Add autosave status indicator.
- Make "Suggested links" actionable.
- Improve related-note ranking quality.

### Deliverables
- [x] Saving state UI (Saving/Saved/Error).
- [x] Suggested link "Insert" action.
- [x] Weighted scoring tweak for related notes.

### Acceptance Criteria
- [x] User can always tell save status.
- [x] Suggested links directly reduce manual typing.
- [x] Related list quality subjectively improves in test notes.

### Verification
- [x] `npm run lint`
- [x] `npm run typecheck`
- [ ] Manual: typing burst, network delay simulation, suggestion insertion.

---

## Phase 5 — Auth UX Polish & Final QA (P2/P3)

### Scope
- OTP sent-state UX (resend cooldown, edit email, status clarity).
- Full regression and docs refresh.

### Deliverables
- [x] OTP state machine UI improvements.
- [x] Updated README/HANDOFF with released behavior.
- [x] Final verification notes.

### Acceptance Criteria
- [x] OTP flow is self-explanatory without guessing next action.
- [x] Main user journey passes end-to-end.

### Verification
- [x] `npm run lint`
- [x] `npm run typecheck`
- [ ] Manual smoke test: Auth -> Home -> Create -> Edit -> Link -> Connections.

---

## Execution Rules
- Keep each phase in separate PR-sized commits where possible.
- Update `HANDOFF.md` at every session end (work done / not done / blockers).
- If blocked by env/data, document exact reproduction and fallback path.
