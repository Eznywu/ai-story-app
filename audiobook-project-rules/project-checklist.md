# AI Family Storytelling App — project checklist

**Companion:** `project-rules.txt`, **`execution-priority-plan.md`** (phases 1–6 — UX lock before large UI/build). **Legend:** **Done** | **Partial** | **Not started**

**Last updated:** 2026-04-21 — synced with repo: `HomeApp` + Figma-style `HomeScreenPanel`, `LibraryPanel` filters, minimal `app/settings`, **PostgreSQL** + `vercel.json` / `build:vercel`, open APIs; reflects **known launch gaps** (brand, settings depth, library sections, subscriptions, legal).

**2026-10-24 note:** Proposed operating plan v1 (https://app.notion.com/p/403f569f891e81968813def2f47c3e2f) is not adopted by this checklist. Where this 2026-04-21 map disagrees with the code or with that plan (home rails, brand, auth, subscriptions, phase order), the disagreement stays recorded. Do not treat a checklist tick as runtime proof or as CEO approval of the plan's targets.

Use **`- [ ]` / `- [x]`** in *Action backlog* as you ship remaining work.

---

## Current progress

### Product experience

- **Done** — **App shell:** `HomeApp` with **tab bar** (`HomeTabBar`): **Home · Create · Library · Profile**; optional `uiMode` (`responsive` | `mobile` | `desktop`) from `app/page.tsx` / `/mobile` / `/desktop`
- **Partial** — **Entry flow:** `EntryScreen` — branded splash, timed transition; **only while `showEntry`** in `HomeApp` (resets on full reload; if splash does not appear, check bfcache, embedded shell, or client-only remount issues)
- **Done** — **Create flow:** `CreateHubPanel` + phases **hub → story**; `StoryForm` + `StoryOutput` + `TtsControls` + `PlaybackPanel`
- **Done** — **Story guidance:** `storyInput` + structured extras via `StorySetupExtras` / `HomeApp.buildGuidance` — theme, mood, **standalone vs “series” shape**, educational goal, moral lesson; capped by `STORY_INPUT_MAX_CHARS` (`lib/types.ts`); passed to `POST /api/story` as `storyInput`; wired in `lib/stories/storyGenerator.ts` (ZH/EN “caregiver guidance” blocks)
- **Partial** — **True series:** UI/prompt favors “episode that could continue”; **no** Prisma `seriesId` / episode index / cross-story linking yet
- **Done** — **Kid profiles:** `useKidProfiles` + `KidProfileFormModal` — **local storage** via `lib/profiles/localProfilesStorage.ts`
- **Done** — **Story character profiles:** `useStoryCharacters` + `CharacterFormModal` — local storage
- **Done** *(device-local)* — **Reading stats:** `useReadingStats` — `lib/profiles/localProfilesStorage.ts`
- **Done** — **Library / shelf:** `LibraryPanel` + **`BookShelfPanel`**; filters **All · Stories · Posters · Audio** (audio list not wired); refresh, poster links, delete/create-poster affordances as implemented
- **Not started** *(roadmap)* — **Library sections** per product spec: **All stories · Favorites · In progress** (needs UX + persistence: favorites flag / draft model)
- **Done** — **Poster UX:** `PosterFlashCard` + `HomeApp`; `lib/posters/poster.ts` / `posterImage.ts`; `POST /api/poster` uses `generatePosterPngBuffer`
- **Done** — **Home (Figma-style):** `HomeScreenPanel` — continue card, **Create New Story** CTA, stats, **New releases** (currently **stories that have `posterUrl`**), top + recent lists, aux row **Add Kid / Add Character / Quick Create**
- **Not started** *(roadmap)* — **Home aux row:** remove **Add Kid / Add Character / Quick Create** (per design); keep primary create path only
- **Partial** — **Home vs cron:** `Story.dailyAutomated` + cron still generate catalog stories, but **New releases** rail does **not** filter on `dailyAutomated` (uses poster presence) — align UX or data if “New Release” should mean daily jobs only
- **Done** — **Profile tab:** `ProfilePanel` (reading snapshot, profile lists)
- **Partial** — **`/settings` route:** standalone page with **Privacy** + **Terms** links only — no language, feedback, share, subscription, delete-account flows yet
- **Not started** *(roadmap)* — **Settings:** language, feedback, share app, manage subscription, delete account — **each with its own screen** (or modal flow)
- **Partial** — **Native:** `CapacitorNativeShell` — partial until store pipeline is real
- **Done** — **Core loop:** preferences → generate → TTS → save poster → library
- **Done** — Story generation API + retries + library excerpt anti-repeat (`lib/stories/storyLibraryContext.ts`; `STORY_LIBRARY_ANTIREPEAT=0` disables)
- **Partial** — Story freshness: prompt + excerpts; not embedding-level dedupe
- **Done** — **TTS:** `POST /api/eleven-tts` — **no membership gate**; cost / abuse risk on public deploy
- **Done** — Errors & retries: `AppBannerError` for story / save / tts / poster
- **Not started** — **Auth & accounts:** no session routes or row-level ownership — **mutating APIs are open** to callers who can reach the deployment
- **Partial** — **Data isolation:** **`GET /api/stories` returns all rows**; global library — privacy + cost exposure for strangers
- **Partial** — **Legal:** `/legal/privacy` + `/legal/terms` exist — **need counsel-grade copy** and alignment with data actually collected (AI, voice, minors)
- **Not started** — Store listing, screenshots, age rating, support URL
- **Not started** *(roadmap)* — **Brand:** replace logo / **“Emrys” → “DreamWEAVER”** (and related strings); **logo work pending in Figma**
- **Not started** *(roadmap)* — **Subscriptions:** plan design, **free taste / hook**, metered generation/TTS, **avoid losing money** on API spend (needs auth + entitlements + backend enforcement)
- **Done** — **Daily catalog stories:** `Story.dailyAutomated`, `lib/stories/dailyAutomatedStories.ts`, **`GET`/`POST /api/cron/daily-stories`** (`Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`)
- **Partial** — **Deploy:** `vercel.json` crons + **`npm run build:vercel`** (`prisma migrate deploy && next build`); see `README.md`

### Backend & data

- **Done** — Prisma + **PostgreSQL:** `Story` (incl. `dailyAutomated`, `childGender`), `Voice` — connection via `@prisma/adapter-pg` + `pg` (`lib/prisma.ts`)
- **Done** — Core libs: **`lib/stories/`**, **`lib/posters/`**, **`lib/tts/eleven.ts`**, **`lib/profiles/`**, **`lib/errors.ts`**, **`lib/types.ts`**, **`lib/providerHttp.ts`**
- **Partial** — **HTTP APIs:** see table; `captureException` on a subset of routes
- **Partial** — **PWA / installable:** `metadata.manifest` in `app/layout.tsx`; full offline / SW not assumed

### Vision fit (`project-rules.txt`)

- **Partial** — Stories: guidance + series flavor + anti-repeat + daily jobs (UI alignment TBD)
- **Partial** — Voice: ElevenLabs path; **clone** experimental (`/api/voice-clone`)
- **Partial** — Newborn poster: illustration + flash card; keepsake copy fields light
- **Ongoing** — Commercial goals: **subscription + safe unit economics** not implemented

---

## Action backlog

- [x] **1. Story guidance field** — shipped (`StorySetupExtras` + `buildGuidance`)
- [ ] **2. Story series (data model)** — `seriesId`, episode ordering, continuity from prior saves
- [ ] **3. Poster: more illustration-forward** — prompts + layout (`lib/posters/*`)
- [ ] **4. Per-user library + auth-gated mutations** — `userId` on `Story`, filter stories APIs, middleware on **`/api/story`**, **`/api/eleven-tts`**, **`/api/posters/save`** (Postgres already; no SQLite migration needed)
- [ ] **5. Mobile-first UI polish** — thumb zones, `EntryScreen`, tab/chrome; **settings icon / chrome** tweaks
- [ ] **6. Library: recordings + posters** — unify saved audio (`tts-save` / URLs) with shelf cards
- [ ] **7. Brand & naming** — **DreamWEAVER** (+ remove legacy “Emrys” / story branding strings); **new logo asset** when Figma is ready
- [ ] **8. Entry splash behavior** — product expectation: splash on **every** cold open (incl. refresh); audit `showEntry`, routes `/mobile`, bfcache, Capacitor
- [ ] **9. Home screen simplification** — drop aux **Add kid / character / quick create**; keep aligned with final Figma
- [ ] **10. Settings hub + sub-pages** — language, feedback, share app, manage subscription, delete account (+ wire or stub APIs as needed)
- [ ] **11. Library facets** — **All · Favorite · In progress** (+ server or local persistence for favorites; draft/in-progress definition)
- [ ] **12. Subscription MVP** — **free tier hook**, paid tier, metering, enforce limits server-side **before** scale marketing
- [ ] **13. Legal & compliance copy** — replace placeholders with counsel-reviewed Privacy + Terms (AI, voice, children, deletion)

**Suggested order:** **#4** + **#12** before wide public launch → **#10**–**#13** UX trust → **#7**–**#11** product polish → **#2** / **#6** / **#3** / **#5** in parallel.

---

## HTTP API (`app/api`) — quick map

| Route area | Role | Notes |
|------------|------|--------|
| `POST /api/story` | Generate story | `captureException` |
| `GET` / `POST /api/stories` | Library | **Open** — **GET lists all rows**; POST **`Untitled Story`** if title empty |
| `POST /api/poster`, `POST /api/posters/save`, `GET /api/posters/[filename]` | Posters | **Open**; validate IDs + PNG |
| `POST /api/eleven-tts` | TTS | **Open** |
| `GET /api/voices`, `POST /api/voice-sample`, `POST /api/voice-clone` | Voice | Clone = experimental |
| `GET` / `POST /api/cron/daily-stories` | Ops | **`CRON_SECRET`** |
| `GET /api/debug/poster-connectivity` | Debug | Lock down in prod |
| `POST /api/tts`, `POST /api/tts-save`, `GET /api/audio/[filename]` | Legacy / file TTS | |

---

## Launch & ops (manual)

- [ ] Counsel-reviewed Privacy & Terms (**#13**); describe AI, voice, child-related data
- [ ] Screenshots / metadata (**mobile-first**), support URL, age rating
- [ ] **Rate limits** + abuse monitoring — unauthenticated APIs burn paid keys
- [ ] Observability — PostHog / Sentry (or similar)
- [ ] **`CRON_SECRET`** + Vercel cron schedule review (UTC)
- [ ] **`DATABASE_URL`** (Postgres pooled URL on serverless), all provider keys in Vercel env
- [ ] TestFlight / Capacitor if shipping native app

---

## Engineering hygiene

- `captureException` today: `/api/story`, `/api/poster`, `/api/posters/save`, `/api/cron/daily-stories` (extend coverage as needed)
- Story timeout / `maxDuration` / `OPENAI_POSTER_TIMEOUT_MS`
- Poster keepsake copy fields (baby name, week, quote, fact)
- Optional embedding anti-repetition
- **Deploy:** no real secrets in git; **`/api/debug/*`** off or protected in prod

---

## Intentionally deferred (scope guardrails)

Ship-ready **voice cloning** · **advanced** poster editor · **China-specific** deploy · **full localization** · **deep** social

---

## Environment (don’t commit secrets)

- `OPENAI_API_KEY`, `OPENAI_STORY_*`, `OPENAI_POSTER_*`, `POSTER_IMAGE_PROVIDER`, `GEMINI_*` / `GOOGLE_*`
- `POSTER_CONNECTIVITY_TIMEOUT_MS` / `lib/providerHttp` vars if used
- ElevenLabs — **`lib/tts/eleven.ts`**
- **`CRON_SECRET`**
- `STORY_LIBRARY_ANTIREPEAT=0` to disable DB excerpts in prompts
- **`DATABASE_URL`** — PostgreSQL (e.g. Neon)

---

*Update **Current progress** and backlog checkboxes whenever behavior changes.*
