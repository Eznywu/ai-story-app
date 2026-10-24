# AI Family Storytelling App — project checklist

**Companion:** `project-rules.txt`, **`execution-priority-plan.md`** (phases 1–6 — UX lock before large UI/build). **Legend:** **Done** | **Partial** | **Not started**

**Last updated:** 2026-10-24 — runtime pass on story save, ElevenLabs narration, and posters (local PostgreSQL; provider calls mocked where keys were absent). Priority fixes **#14–#19** remain in the Action backlog. *Current progress* below was last fully synced 2026-04-21 and is partly out of date; the 2026-10-23 Notion implementation baseline lists the corrections.

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
- **Partial** — **Library / shelf:** `LibraryPanel` + **`BookShelfPanel`**; filters **All · Stories · Posters · Audio** (Audio = stories with saved `audioUrl`); refresh, poster links, create-poster on the open card and in story detail, delete
- **Not started** *(roadmap)* — **Library sections** per product spec: **All stories · Favorites · In progress** (needs UX + persistence: favorites flag / draft model)
- **Done** — **Poster UX:** `PosterFlashCard` + `HomeApp`; `lib/posters/poster.ts` / `posterImage.ts`; `POST /api/poster` uses `generatePosterPngBuffer`
- **Done** — **Home (Figma-style):** `HomeScreenPanel` — continue card, **Create New Story** CTA, stats, **New releases** (currently **stories that have `posterUrl`**), top + recent lists, aux row **Add Kid / Add Character / Quick Create**
- **Not started** *(roadmap)* — **Home aux row:** remove **Add Kid / Add Character / Quick Create** (per design); keep primary create path only
- **Partial** — **Home vs cron:** `Story.dailyAutomated` + cron still generate catalog stories, but **New releases** rail does **not** filter on `dailyAutomated` (uses poster presence) — align UX or data if “New Release” should mean daily jobs only
- **Done** — **Profile tab:** `ProfilePanel` (reading snapshot, profile lists)
- **Partial** — **`/settings` route:** standalone page with **Privacy** + **Terms** links only — no language, feedback, share, subscription, delete-account flows yet
- **Not started** *(roadmap)* — **Settings:** language, feedback, share app, manage subscription, delete account — **each with its own screen** (or modal flow)
- **Partial** — **Native:** `CapacitorNativeShell` — partial until store pipeline is real
- **Partial** — **Core loop (runtime 2026-10-24):** Create → generate → **auto-save** → story text on screen → **Play** narrates and stores MP3 on the story → **Create Poster** saves a PNG on the same row → Library filters and `/play` can reopen them. Verified locally with `MOCK_PROVIDERS=1` against PostgreSQL. Real OpenAI / ElevenLabs / Gemini responses are **not** yet proven (see **#17** and **#18**).
- **Done** — Story generation API + retries + library excerpt anti-repeat (`lib/stories/storyLibraryContext.ts`; `STORY_LIBRARY_ANTIREPEAT=0` disables)
- **Partial** — Story freshness: prompt + excerpts; not embedding-level dedupe
- **Partial** — **TTS:** `POST /api/eleven-tts` builds an ElevenLabs request (`ELEVENLABS_API_KEY`, `ELEVENLABS_TTS_MODEL`, catalog voice or `clone:` id) and, when `storyId` is a saved story, writes `uploads/audio/audio_<id>.mp3` plus `Story.audioFilename`. Playback uses a visible player (`PlaybackPanel`). **No membership gate**; cost / abuse risk on public deploy. Missing key returns a readable error. Mock MP3 when `MOCK_PROVIDERS=1` (ignored if `VERCEL_ENV=production`).
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
- **Partial** — Voice: ElevenLabs path speaks catalog voices and any `clone:<elevenVoiceId>` id. **Clone is not ship-ready** — see Voice clone below. `/api/voice-sample` only stores a file; it does not create a voice. The Prisma `Voice` model is unused.
- **Partial** — Newborn poster: illustration + flash card; keepsake copy fields light
- **Ongoing** — Commercial goals: **subscription + safe unit economics** not implemented

---

## Action backlog

### Priority fixes (added 2026-10-24)

Local PostgreSQL is required (`DATABASE_URL`). A SQLite file will not serve this schema. `GET /api/stories` returns a readable 500 when the database is down.

- [ ] **14. Mobile UI pass: text size, fonts, colours, page width** — review every screen at ~390px first; readable body text, one font pairing, one colour palette, no horizontal scroll, tap targets usable with one thumb (`app/globals.css`, `app/page.css`, fonts in `app/layout.tsx`). Final colours and logo depend on the name decision in **#7**.
- [ ] **15. Replace the settings icon** — the hand-drawn SVG `IconSettings` in `app/components/AppChromeBar.tsx` does not read as a gear; swap in a standard gear icon and check it at chrome size.
- [ ] **16. DeepSeek for story generation (China launch)** — add a provider switch in `lib/stories/storyGenerator.ts` (OpenAI only today: `OPENAI_STORY_MODELS`, default `gpt-4o-mini`). DeepSeek's API follows the OpenAI format, so this is mostly config plus story-quality testing in Chinese and English. A China launch also needs China-reachable TTS and poster providers, mainland hosting with ICP filing, and a China login method (see #19). **Scope conflict:** `project-rules.txt` lists China-specific deployment as out of Phase 1; needs Eason's decision before build.
- [ ] **17. Test voice / TTS** — **Local mock, 2026-10-24:** request builder clamps speed to 0.70–1.20 (same range as the stepper), emotion still maps into stability/style, missing `ELEVENLABS_API_KEY` returns a readable error, a short MP3 plays, and `storyId` saves `audioUrl` on the story (Library → Audio, `/play`). Voices exercised in the builder: Eason_EN, Eason_CN, Neva_CN, plus a `clone:` id. **Still needs a real-key test:** each of those voices in English and Chinese, short / medium / long stories, heard speed and emotion, wait time, and cost per story. Do not treat the mock MP3 as proof of ElevenLabs.
- [ ] **18. Test posters** — **Local mock, 2026-10-24:** `MOCK_PROVIDERS=1` returns a PNG, the client composites a cover, `POST /api/posters/save` links it, and reload shows it in Library → Posters. `MOCK_POSTER_MODE=fallback` (or a provider 503) shows the text-only genre card and still saves that PNG. Missing `OPENAI_API_KEY` / `GEMINI_API_KEY` (mock off) is a readable error, not a silent fallback. **Still needs a real-key test:** one OpenAI poster and one Gemini poster (`POSTER_IMAGE_PROVIDER=openai` and `=gemini`), plus `/api/debug/poster-connectivity` from a network that can reach the providers.
- [ ] **19. Login** *(replaces #4)* — sign-in, `userId` on `Story`, each user sees only their own library, and story / TTS / poster-save routes require sign-in with a usage limit. Membership login code exists on `origin/main` (deleted in the current branch) and can be a starting point. Choose sign-in methods first: China users need phone or WeChat; iOS requires Sign in with Apple if other social logins are offered. Keep it minimal — `project-rules.txt` excludes a deep account system from Phase 1.

**Suggested order:** **#17** + **#18** real-key pass → **#15** → **#14** → **#19** → **#16** once the China scope is decided.

### Voice clone (not built further on 2026-10-24)

What exists today:

- `VoiceRecorder` records in the browser and `POST /api/voice-clone` calls ElevenLabs instant voice cloning (`client.voices.ivc.create`) with `ELEVENLABS_API_KEY`.
- The returned id is stored only in this browser (`localStorage`, `lib/voices/clonedVoiceStorage.ts`) and shown in the Voice list as `clone:<elevenVoiceId>`.
- `resolveVoiceById` passes that ElevenLabs id into TTS, so a clone can narrate **on the same device** after a successful clone.
- Missing key, short audio, and ElevenLabs permission errors return readable JSON errors.
- `POST /api/voice-sample` writes an upload and nothing reads it back.
- Prisma `Voice` is unused. Onboarding used to store `consentedToVoice: true` without a real consent step; that flag is now left false.

Small plan when this is in scope (do not start until story / TTS / poster real-key tests pass):

1. Consent checkbox on the recorder (required before upload). Keep the sample only for the clone request.
2. `POST /api/voice-clone` already creates the IVC voice; also insert a `Voice` row (`displayName`, `voiceId`) and return it.
3. `GET /api/voices` merges those rows (still no accounts, so this stays a single shared library until **#19**).
4. Optional file upload next to the mic, reusing the same route.
5. Real-key test: record ~30s, confirm the new id, play one short story, then delete the voice in ElevenLabs if it was only a test.

### Earlier backlog

- [x] **1. Story guidance field** — shipped (`StorySetupExtras` + `buildGuidance`)
- [ ] **2. Story series (data model)** — `seriesId`, episode ordering, continuity from prior saves
- [ ] **3. Poster: more illustration-forward** — prompts + layout (`lib/posters/*`)
- [ ] **4. Per-user library + auth-gated mutations** — merged into **#19**
- [ ] **5. Mobile-first UI polish** — merged into **#14** and **#15**
- [ ] **6. Library: recordings + posters** — saved narration now shows under the Audio filter and posters under Posters; shelf cards in `BookShelfPanel` still do not play audio
- [ ] **7. Brand & naming** — **DreamWEAVER** (+ remove legacy “Emrys” / story branding strings); **new logo asset** when Figma is ready
- [ ] **8. Entry splash behavior** — product expectation: splash on **every** cold open (incl. refresh); audit `showEntry`, routes `/mobile`, bfcache, Capacitor
- [ ] **9. Home screen simplification** — drop aux **Add kid / character / quick create**; keep aligned with final Figma
- [ ] **10. Settings hub + sub-pages** — language, feedback, share app, manage subscription, delete account (+ wire or stub APIs as needed)
- [ ] **11. Library facets** — **All · Favorite · In progress** (+ server or local persistence for favorites; draft/in-progress definition)
- [ ] **12. Subscription MVP** — **free tier hook**, paid tier, metering, enforce limits server-side **before** scale marketing
- [ ] **13. Legal & compliance copy** — replace placeholders with counsel-reviewed Privacy + Terms (AI, voice, children, deletion)

**Suggested order (earlier items):** **#19** + **#12** before wide public launch → **#10**–**#13** UX trust → **#7**–**#11** product polish → **#2** / **#6** / **#3** in parallel.

---

## HTTP API (`app/api`) — quick map

| Route area | Role | Notes |
|------------|------|--------|
| `POST /api/story` | Generate story | `captureException` |
| `GET` / `POST /api/stories` | Library | **Open** — **GET lists all rows**; POST **`Untitled Story`** if title empty |
| `POST /api/poster`, `POST /api/posters/save`, `GET /api/posters/[filename]` | Posters | **Open**; validate IDs + PNG |
| `POST /api/eleven-tts` | TTS | **Open**; optional `storyId` saves MP3 on the story |
| `GET /api/voices`, `POST /api/voice-sample`, `POST /api/voice-clone` | Voice | Clone calls ElevenLabs IVC; sample upload is not wired to cloning; `Voice` table unused |
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

Ship-ready **voice cloning** · **advanced** poster editor · **China-specific** deploy *(under review — see #16)* · **full localization** · **deep** social

---

## Environment (don’t commit secrets)

- `OPENAI_API_KEY`, `OPENAI_STORY_*`, `OPENAI_POSTER_*`, `POSTER_IMAGE_PROVIDER`, `GEMINI_*` / `GOOGLE_*`
- `POSTER_CONNECTIVITY_TIMEOUT_MS` / `lib/providerHttp` vars if used
- ElevenLabs — **`ELEVENLABS_API_KEY`**, optional **`ELEVENLABS_VOICE_ID`**, **`ELEVENLABS_TTS_MODEL`** (`lib/tts/eleven.ts`)
- **`CRON_SECRET`**
- `STORY_LIBRARY_ANTIREPEAT=0` to disable DB excerpts in prompts
- **`DATABASE_URL`** — PostgreSQL (e.g. Neon)
- **`MOCK_PROVIDERS=1`** — local canned story / MP3 / poster (ignored when `VERCEL_ENV=production`)
- **`MOCK_POSTER_MODE=fallback`** — local only; forces the text-only poster path

---

*Update **Current progress** and backlog checkboxes whenever behavior changes.*
