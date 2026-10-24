# Audio Book App — Execution Priority Plan

**Companion:** `project-rules.txt`, `project-checklist.md`.  
**Rule:** Do not work on lower-priority items until the current phase is clearly defined or stable.

**2026-10-24 note:** The proposed Notion operating plan (v1, https://app.notion.com/p/403f569f891e81968813def2f47c3e2f) says preserve source, verify the first-story journey, then repair the first reproduced blocker. It does not adopt this file's UX-lock gate, and this file does not adopt that plan's dates or metric targets. Both remain until Eason decides. Do not check these phases off to match the plan.

---

## PHASE 1 — Lock MVP UX architecture

**Goal:** Stop rework by defining all screens, functions, and links before deeper UI build.

- [ ] Create final MVP screen map
- [ ] Define purpose of each screen
- [ ] Define user flow from entry to playback
- [ ] Define onboarding flow
- [ ] Define Home screen modules and navigation logic
- [ ] Define Create flow (kid profile / character profile / story setup)
- [ ] Define Story Output flow
- [ ] Define Poster flow
- [ ] Define Library flow
- [ ] Define Profile / Settings flow
- [ ] Remove non-MVP or duplicate screens
- [ ] Create one source-of-truth UX architecture doc

### Output of Phase 1

- [ ] MVP UX structure locked
- [ ] No more major screen/function ambiguity

---

## PHASE 2 — UI system + Figma replication

**Goal:** Build only after UX flow is locked.

- [ ] Finalize visual direction for app
- [ ] Define color system
- [ ] Define typography system
- [ ] Define spacing / card / button / tab system
- [ ] Define reusable mobile components
- [ ] Audit all Figma screens and match them to MVP flow
- [ ] Remove screens in Figma that are not needed for MVP
- [ ] Build screen-by-screen Figma replication checklist
- [ ] Replicate Entry / Splash screen
- [ ] Replicate Home screen
- [ ] Replicate Create flow screens
- [ ] Replicate Story Output screen
- [ ] Replicate Poster-related screen(s)
- [ ] Replicate Library screen
- [ ] Replicate Profile / Settings screen
- [ ] Do mobile QA pass for all replicated screens

### Output of Phase 2

- [ ] MVP UI visually consistent
- [ ] Figma-to-code replication aligned with final UX

---

## PHASE 3 — Fix story generation

**Goal:** Make core story generation stable and launch-usable.

- [ ] Audit current story generation bugs
- [ ] Fix broken generation flow
- [ ] Improve prompt structure
- [ ] Test multiple genres
- [ ] Test multiple age groups
- [ ] Test kid-profile-based generation
- [ ] Test character-based generation
- [ ] Improve anti-repetition logic
- [ ] Define series generation logic
- [ ] Test continuity across series episodes
- [ ] Validate story quality for launch baseline

### Output of Phase 3

- [ ] Story generation stable
- [ ] Series story logic usable
- [ ] Output quality acceptable for MVP

---

## PHASE 4 — Fix poster generation

**Goal:** Make poster generation reliable and connected to story flow.

- [ ] Audit current poster generation issues
- [ ] Fix provider/API instability
- [ ] Improve poster prompt quality
- [ ] Improve fallback behavior
- [ ] Validate poster generation after story generation
- [ ] Validate poster save flow
- [ ] Validate poster display in library
- [ ] Validate poster display on Home/New Release if needed
- [ ] Confirm poster quality is launch acceptable

### Output of Phase 4

- [ ] Poster generation works reliably
- [ ] Poster saved/displayed correctly in product flow

---

## PHASE 5 — Build launch content library

**Goal:** Make sure app has content on day 1.

- [ ] Define content categories for launch
- [ ] Generate 20–30 standalone stories
- [ ] Generate 3–5 story series
- [ ] Generate 3–5 episodes per series
- [ ] QA all launch stories for quality
- [ ] QA all launch series for continuity
- [ ] Generate posters for selected launch stories
- [ ] Tag stories for Home / New Release / Featured use
- [ ] Prepare starter library content set

### Output of Phase 5

- [ ] App has enough day-1 content
- [ ] Home and Library do not feel empty

---

## PHASE 6 — Final polish and launch prep

**Goal:** Final cleanup after core product loop works.

- [ ] Review app branding / logo update
- [ ] Clean settings structure
- [ ] Review privacy / terms / consent alignment
- [ ] QA core user flows end-to-end
- [ ] QA mobile responsiveness
- [ ] QA empty/error/loading states
- [ ] Create launch bug list
- [ ] Fix critical pre-launch bugs
- [ ] Prepare deployment checklist
- [ ] Prepare App Store checklist

### Output of Phase 6

- [ ] MVP ready for launch testing

---

*Update phase checkboxes as you complete them. Prefer completing Phase 1 outputs before heavy Phase 2 implementation.*
