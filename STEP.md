# STEP: Plexus UX Improvement Rollout Plan

Last updated: 2026-02-16 (UTC)

## Goal
Implement all currently proposed UX improvements in safe, debuggable phases without blocking progress.

---

## Phase 1 — Stability & Onboarding (P0)

### Scope
- Add graceful fallback when Supabase env vars are missing.
- Prevent startup crashes and show a guided setup message.
- Align behavior on `/` and `/auth`.

### Deliverables
- [ ] Env guard utility (single source of truth).
- [ ] Setup required screen/component.
- [ ] Home/Auth behavior aligned when env missing.

### Acceptance Criteria
- [ ] App does not throw 500 for missing env during normal page load.
- [ ] User sees clear setup instructions with required env key names.
- [ ] Existing auth flow still works when env is present.

### Verification
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] Manual: open `/auth`, `/`, `/note/[id]` with and without env.

---

## Phase 2 — Home Discoverability & Bulk Actions (P1)

### Scope
- Enrich note list cards with metadata.
- Add multi-select + bulk actions.
- Improve search UX (target toggle + highlighting).

### Deliverables
- [ ] Metadata chips (updated time / state / link counts).
- [ ] Selection mode and bulk action toolbar.
- [ ] Search mode switch (title only / title+body).
- [ ] Optional keyword highlight in result snippet/title.

### Acceptance Criteria
- [ ] Users can batch-update at least pin/inbox/delete.
- [ ] Search behavior is predictable and visibly scoped.
- [ ] No regressions in existing create/import/filter flow.

### Verification
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] Manual: create >=5 notes and validate selection/search flow.

---

## Phase 3 — Wiki-Link Reliability (P1)

### Scope
- Resolve duplicate-title ambiguity.
- Add unresolved-link visibility and fast creation.
- Ensure preview link navigation points to actual notes.

### Deliverables
- [ ] Disambiguation UI for duplicate title matches.
- [ ] Unresolved link section + quick create action.
- [ ] Internal link mapping from preview to note route.

### Acceptance Criteria
- [ ] No silent "first-match" behavior for ambiguous links.
- [ ] Unresolved links can be converted to notes in <=2 taps.
- [ ] Tapping wiki links from preview opens intended note.

### Verification
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] Manual: duplicate title scenario + broken link scenario.

---

## Phase 4 — Editing Flow & Connections Actionability (P2)

### Scope
- Add autosave status indicator.
- Make "Suggested links" actionable.
- Improve related-note ranking quality.

### Deliverables
- [ ] Saving state UI (Saving/Saved/Error).
- [ ] Suggested link "Insert" action.
- [ ] Weighted scoring tweak for related notes.

### Acceptance Criteria
- [ ] User can always tell save status.
- [ ] Suggested links directly reduce manual typing.
- [ ] Related list quality subjectively improves in test notes.

### Verification
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] Manual: typing burst, network delay simulation, suggestion insertion.

---

## Phase 5 — Auth UX Polish & Final QA (P2/P3)

### Scope
- OTP sent-state UX (resend cooldown, edit email, status clarity).
- Full regression and docs refresh.

### Deliverables
- [ ] OTP state machine UI improvements.
- [ ] Updated README/HANDOFF with released behavior.
- [ ] Final verification notes.

### Acceptance Criteria
- [ ] OTP flow is self-explanatory without guessing next action.
- [ ] Main user journey passes end-to-end.

### Verification
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] Manual smoke test: Auth -> Home -> Create -> Edit -> Link -> Connections.

---

## Execution Rules
- Keep each phase in separate PR-sized commits where possible.
- Update `HANDOFF.md` at every session end (work done / not done / blockers).
- If blocked by env/data, document exact reproduction and fallback path.
