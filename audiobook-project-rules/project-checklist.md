# AI Family Storytelling App — project checklist

**Companion:** `project-rules.txt`, **`execution-priority-plan.md`** (phases 1–6 — UX lock before large UI/build). **Legend:** **Done** | **Partial** | **Not started**

**Last updated:** 2026-10-25 — email sign-in is paused (`AUTH_ENABLED` defaults off; guest library). Posters and narration persist via Vercel Blob (local `uploads/` fallback), create is a one-screen picker, and each story opens on `/story/[id]`. Priority fixes **#14–#18** remain in the Action backlog. *Current progress* below was last fully synced 2026-04-21 and is partly out of date; the 2026-10-23 Notion implementation baseline lists the corrections.

**2026-10-24 note:** Proposed operating plan v1 (https://app.notion.com/p/403f569f891e81968813def2f47c3e2f) is not adopted by this checklist. Where this 2026-04-21 map disagrees with the code or with that plan (home rails, brand, auth, subscriptions, phase order), the disagreement stays recorded. Do not treat a checklist tick as runtime proof or as CEO approval of the plan's targets.

Use **`- [ ]` / `- [x]`** in *Action backlog* as you ship remaining work.

---

## Current progress

### Product experience

- **Done** — **App shell:** `HomeApp` with **tab bar** (`HomeTabBar`): **Home · Create · Library · Profile**; optional `uiMode` (`responsive` | `mobile` | `desktop`) from `app/page.tsx` / `/mobile` / `/desktop`
- **Partial** — **Entry flow:** `EntryScreen` — branded splash, timed transition; **only while `showEntry`** in `HomeApp` (resets on full reload; if splash does not appear, check bfcache, embedded shell, or client-only remount issues)
- **Done** — **Create flow (2026-10-25):** Create tab is `CreateStoryPicker` — Who / Theme / Length / Voice on one phone screen, optional note, sticky **Create story**. It does not use the old long `StoryForm` setup. `CreateHubPanel` remains in the repo and is not mounted.
- **Done** — **Story guidance:** `storyInput` + structured extras via `StorySetupExtras` / `HomeApp.buildGuidance` — theme, mood, **standalone vs “series” shape**, educational goal, moral lesson; capped by `STORY_INPUT_MAX_CHARS` (`lib/types.ts`); passed to `POST /api/story` as `storyInput`; wired in `lib/stories/storyGenerator.ts` (ZH/EN “caregiver guidance” blocks)
- **Partial** — **True series:** UI/prompt favors “episode that could continue”; **no** Prisma `seriesId` / episode index / cross-story linking yet
- **Done** — **Kid profiles:** `useKidProfiles` + `KidProfileFormModal` — **local storage** via `lib/profiles/localProfilesStorage.ts`
- **Done** — **Story character profiles:** `useStoryCharacters` + `CharacterFormModal` — local storage
- **Done** *(device-local)* — **Reading stats:** `useReadingStats` — `lib/profiles/localProfilesStorage.ts`
- **Partial** — **Library / shelf:** `LibraryPanel` + **`BookShelfPanel`**; filters **All · Stories · Posters · Audio** (Audio = stories with saved `audioUrl`); refresh, poster links, create-poster on the open card and in story detail, delete
- **Not started** *(roadmap)* — **Library sections** per product spec: **All stories · Favorites · In progress** (needs UX + persistence: favorites flag / draft model)
- **Done** — **Poster UX (2026-10-25):** `/story/[id]` shows a generating placeholder, then the saved cover, with retry. `POST /api/poster` still uses `generatePosterPngBuffer`. Default image model is `gpt-image-1.5` (portrait `1024x1536`, no `response_format`). `dall-e-3` remains available when `OPENAI_POSTER_IMAGE_MODEL` names it, and a missing DALL·E model retries `gpt-image-1.5`. The composite PNG is stored with the story (`Story.posterUrl`). Blob when `BLOB_READ_WRITE_TOKEN` is set; otherwise `uploads/posters/`.
- **Done** — **Home (Figma-style):** `HomeScreenPanel` — continue card, **Create New Story** CTA, stats, **New releases** (currently **stories that have `posterUrl`**), top + recent lists, aux row **Add Kid / Add Character / Quick Create**
- **Not started** *(roadmap)* — **Home aux row:** remove **Add Kid / Add Character / Quick Create** (per design); keep primary create path only
- **Partial** — **Home vs cron:** `Story.dailyAutomated` + cron still generate catalog stories, but **New releases** rail does **not** filter on `dailyAutomated` (uses poster presence) — align UX or data if “New Release” should mean daily jobs only
- **Done** — **Profile tab:** `ProfilePanel` (reading snapshot, profile lists)
- **Partial** — **`/settings` route:** standalone page with **Privacy** + **Terms** links only — no language, feedback, share, subscription, delete-account flows yet
- **Not started** *(roadmap)* — **Settings:** language, feedback, share app, manage subscription, delete account — **each with its own screen** (or modal flow)
- **Partial** — **Native:** `CapacitorNativeShell` — partial until store pipeline is real
- **Partial** — **Core loop (runtime 2026-10-25):** Create → generate → **auto-save** → `/story/[id]` (poster, player, narration controls, full script). Library **Open** and **Play** return to that route. The story page’s back link (`/?tab=library`) stays on My Stories; a saved onboarding intent no longer overrides that tab. Playback speeds **0.75x, 1x, 1.25x, 1.5x** are the audio element rate. **Regenerate audio** calls ElevenLabs again. Poster generation starts when the story has no cover. Verified locally with `MOCK_PROVIDERS=1` against PostgreSQL, including the text-poster fallback. Real OpenAI / ElevenLabs / Gemini responses are **not** yet proven (see **#17** and **#18**).
- **Done** — Story generation API + retries + library excerpt anti-repeat (`lib/stories/storyLibraryContext.ts`; `STORY_LIBRARY_ANTIREPEAT=0` disables)
- **Partial** — Story freshness: prompt + excerpts; not embedding-level dedupe
- **Partial** — **TTS:** `POST /api/eleven-tts` requires a signed-in parent, builds an ElevenLabs request (`ELEVENLABS_API_KEY`, `ELEVENLABS_TTS_MODEL`, catalog voice or an account `clone:` id), and, when `storyId` is that account's story, stores the MP3 (Vercel Blob URL in `Story.audioUrl`, or `uploads/audio/` plus `/api/audio/…` when `BLOB_READ_WRITE_TOKEN` is unset). The story page plays it. **No usage quota yet** (see **#12**). Missing key returns a readable error. Mock MP3 when `MOCK_PROVIDERS=1` (ignored if `VERCEL_ENV=production`). `maxDuration` is the literal `300` on story, poster, and narration routes (Next.js 16 rejects an imported segment-config value). Provider timeouts are capped at 240s on Vercel so the function can still return an error.
- **Done** — Errors & retries: `AppBannerError` for story / save / tts / poster
- **Paused** *(2026-10-25)* — **Auth & accounts:** email one-time code is still implemented (`POST /api/auth/email`, `POST /api/auth/verify`, httpOnly session cookie, sign-in screen, sign-out) and is **not** deleted. **`AUTH_ENABLED` defaults to off** (unset, `false`, or `0`). While it is off there is no sign-in screen, data routes do not return 401, sign-out is hidden, and every request uses one built-in user `guest@local.invalid` (created on first use). The daily cron is unchanged. **To turn login back on:** set `AUTH_ENABLED=true`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM` (and `AUTH_SECRET` on Vercel), then restart `next dev` or redeploy. The first parent account that signs in with an empty library receives that guest’s stories, kids, characters, voices, and reading stats. Rows are reassigned, not deleted. A later account does not receive them. After that handoff, turning the flag off again shows the guest library, which is empty; the parent’s stories stay on their account. Codes stay scrypt-hashed, 10 minutes, single use, 5 attempts, with send limits. Resend sends the mail when `RESEND_API_KEY` is set; local `next dev` without that key prints the code and never does so on Vercel.
- **Done** — **Data isolation:** stories, kid profiles, story characters, reading stats, posters, audio files, and cloned voices belong to the signed-in account. `GET /api/stories` returns only that account. Story, TTS, poster, voice, and profile routes return **401** when signed out and `AUTH_ENABLED` is on. While login is paused they use the guest user instead. The daily cron still uses `CRON_SECRET` only. **Rows that already had no owner stay `userId` null and are hidden** (not given to the first account), including cron stories. A browser's old localStorage kids, characters, reading stats, and voice clones are copied onto the first account that signs in on that browser, and only when that account does not already have that kind of data.
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
- **Partial** — Voice: ElevenLabs path speaks catalog voices and `clone:` ids stored on the signed-in account (`Voice.userId`). **Clone is not ship-ready** — see Voice clone below. `/api/voice-sample` only stores a file; it does not create a voice. TTS refuses a `clone:` id that is not on the account.
- **Partial** — Newborn poster: illustration + flash card; keepsake copy fields light
- **Ongoing** — Commercial goals: **subscription + safe unit economics** not implemented

---

## Action backlog

### Priority fixes (added 2026-10-24)

Local PostgreSQL is required (`DATABASE_URL`). A SQLite file will not serve this schema. `GET /api/stories` returns a readable 500 when the database is down.

- [ ] **14. Mobile UI pass: text size, fonts, colours, page width** — review every screen at ~390px first; readable body text, one font pairing, one colour palette, no horizontal scroll, tap targets usable with one thumb (`app/globals.css`, `app/page.css`, fonts in `app/layout.tsx`). Final colours and logo depend on the name decision in **#7**. **2026-10-25:** the Create tab was rebuilt as a one-screen picker (checked at 390×844 and 375×667). Draft PR #3 (`cursor/mobile-ui-finish-0cf6`) still has a separate type/tap-target pass on the old story-setup screen and will conflict in `app/page.css` if both land. Full-bleed under 480px and the settings gear are already on this stack from `e7f3c20`.
- [ ] **15. Replace the settings icon** — the hand-drawn SVG `IconSettings` in `app/components/AppChromeBar.tsx` does not read as a gear; swap in a standard gear icon and check it at chrome size.
- [ ] **16. DeepSeek for story generation (China launch)** — add a provider switch in `lib/stories/storyGenerator.ts` (OpenAI only today: `OPENAI_STORY_MODELS`, default `gpt-4o-mini`). DeepSeek's API follows the OpenAI format, so this is mostly config plus story-quality testing in Chinese and English. A China launch also needs China-reachable TTS and poster providers, mainland hosting with ICP filing, and a China login method (see #19). **Scope conflict:** `project-rules.txt` lists China-specific deployment as out of Phase 1; needs Eason's decision before build.
- [ ] **17. Test voice / TTS** — **Local mock, 2026-10-24:** request builder clamps speed to 0.70–1.20 (same range as the stepper), emotion still maps into stability/style, missing `ELEVENLABS_API_KEY` returns a readable error, a short MP3 plays, and `storyId` saves `audioUrl` on the story (Library → Audio, `/play`). Voices exercised in the builder: Eason_EN, Eason_CN, Neva_CN, plus a `clone:` id. **Still needs a real-key test:** each of those voices in English and Chinese, short / medium / long stories, heard speed and emotion, wait time, and cost per story. Do not treat the mock MP3 as proof of ElevenLabs.
- [ ] **18. Test posters** — **Local mock, 2026-10-25:** `MOCK_PROVIDERS=1` returns a PNG, the story page composites a cover, and the PNG is stored on the story (local `uploads/posters/` when Blob is unset; `Story.posterUrl` either way). Reopening the story shows that URL. `MOCK_POSTER_MODE=fallback` (or a provider 503) shows the text-only genre card and still saves that PNG. **Root cause of “poster not working” on Vercel:** the save wrote `uploads/posters/` inside the function, so the next request could not read the file. A second cause for real keys: the default model was `dall-e-3` with `response_format` and `1024x1792`, which GPT image models reject. **Still needs a real-key test:** one `gpt-image-1.5` poster and one Gemini poster (`POSTER_IMAGE_PROVIDER=openai` and `=gemini`) on a preview that has `BLOB_READ_WRITE_TOKEN`, plus `/api/debug/poster-connectivity` from a network that can reach the providers. Missing `OPENAI_API_KEY` / `GEMINI_API_KEY` (mock off) is still a readable error.
- [x] **19. Login** *(replaces #4)* — **Paused, 2026-10-25:** email one-time code stays in the app (not a magic link). **`AUTH_ENABLED` defaults off**, so the sign-in screen is hidden and the app uses `guest@local.invalid`. Set `AUTH_ENABLED=true` plus `RESEND_API_KEY` and `AUTH_EMAIL_FROM` (and `AUTH_SECRET` on Vercel) to turn it back on; the first empty parent account then receives the guest library. With the flag on, each account sees only its own library and story / TTS / poster / voice / profile routes return 401 when signed out. Cron stays on `CRON_SECRET`. **Usage limits are not in this item** — they stay with subscriptions (**#12**). China phone / WeChat and Sign in with Apple are not built (see **#16**). **Still needs a real-email test** once login is on: confirm a code arrives. Local `next dev` without `RESEND_API_KEY` only prints the code in the server console.

**Suggested order:** **#17** + **#18** real-key pass → **#15** → **#14** → **#16** once the China scope is decided. **#19** is in (real Resend delivery still open).

### Voice clone (not built further on 2026-10-24)

What exists today:

- `VoiceRecorder` records in the browser and `POST /api/voice-clone` calls ElevenLabs instant voice cloning (`client.voices.ivc.create`) with `ELEVENLABS_API_KEY`.
- A successful clone is stored on the signed-in account (`Voice`) and shown as `clone:<elevenVoiceId>`. Older browser-only clones in `localStorage` are claimed by the first empty account that signs in on that device.
- `resolveVoiceById` passes that ElevenLabs id into TTS only after the route checks the `Voice` row belongs to the account.
- Missing key, short audio, and ElevenLabs permission errors return readable JSON errors.
- `POST /api/voice-sample` writes an upload and nothing reads it back.
- Onboarding used to store `consentedToVoice: true` without a real consent step; that flag is now left false.

Small plan when this is in scope (do not start until story / TTS / poster real-key tests pass):

1. Consent checkbox on the recorder (required before upload). Keep the sample only for the clone request.
2. `POST /api/voice-clone` already creates the IVC voice and a `Voice` row for the signed-in account.
3. `GET /api/voices` returns catalog voices plus `Voice` rows for the signed-in account.
4. Optional file upload next to the mic, reusing the same route.
5. Real-key test: record ~30s, confirm the new id, play one short story, then delete the voice in ElevenLabs if it was only a test.

### Earlier backlog

- [x] **1. Story guidance field** — shipped (`StorySetupExtras` + `buildGuidance`)
- [ ] **2. Story series (data model)** — `seriesId`, episode ordering, continuity from prior saves
- [ ] **3. Poster: more illustration-forward** — prompts + layout (`lib/posters/*`)
- [x] **4. Per-user library + auth-gated mutations** — shipped with **#19**
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
| `POST /api/auth/email`, `POST /api/auth/verify`, `POST /api/auth/sign-out`, `GET /api/auth/session` | Parent email code + session | No user session required to request a code |
| `POST /api/story` | Generate story | **Sign-in**; `captureException`; anti-repeat uses this account's stories |
| `GET` / `POST` / `DELETE /api/stories`, `GET /api/stories/[id]` | Library | **Sign-in**; GET lists **this account only**; one story is `/story/[id]` |
| `GET` / `PUT /api/kids`, `/api/characters`, `/api/reading-stats` | Family profiles | **Sign-in** |
| `POST /api/poster`, `POST /api/posters/save`, `GET /api/posters/[filename]` | Posters | **Sign-in**; save stores Blob or local disk; file read requires the story's owner and redirects to Blob when the disk file is gone |
| `POST /api/eleven-tts` | TTS | **Sign-in**; `storyId` must belong to the account; `clone:` voices must too |
| `GET` / `POST` / `DELETE /api/voices`, `POST /api/voice-sample`, `POST /api/voice-clone` | Voice | **Sign-in**; clones are `Voice` rows for the account |
| `GET` / `POST /api/cron/daily-stories` | Ops | **`CRON_SECRET` only** (no user session). Created rows have no owner and stay hidden. |
| `GET /api/debug/poster-connectivity` | Debug | **Sign-in** |
| `POST /api/tts`, `POST /api/tts-save`, `GET /api/audio/[filename]` | Legacy / file TTS | **Sign-in**; audio files are served only when a story on the account points at them |

---

## Launch & ops (manual)

- [ ] Counsel-reviewed Privacy & Terms (**#13**); describe AI, voice, child-related data
- [ ] Screenshots / metadata (**mobile-first**), support URL, age rating
- [ ] **Rate limits** + abuse monitoring — sign-in code sends are limited per email and IP. Story, TTS, and poster calls still have no usage quota (**#12**) and can burn paid keys for any signed-in account.
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
- **`AUTH_ENABLED`** — default **off**. Email sign-in is paused until this is `true` (also `1`, `on`, `yes`, or `email`). Re-enable with `AUTH_ENABLED=true`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM`, then restart or redeploy. While off, data is stored on `guest@local.invalid`.
- **`AUTH_SECRET`** — pepper for email codes; required on Vercel when login is on
- **`RESEND_API_KEY`** — transactional email for sign-in codes. Unset locally logs the code in the dev server console. Unset on Vercel returns an error.
- **`AUTH_EMAIL_FROM`** — From address Resend is allowed to use
- `STORY_LIBRARY_ANTIREPEAT=0` to disable DB excerpts in prompts
- **`DATABASE_URL`** — PostgreSQL (e.g. Neon)
- **`BLOB_READ_WRITE_TOKEN`** — Vercel Blob read/write token. Create a **public** Blob store in the Vercel project (Storage → Blob), connect it, and the token is added for Production, Preview, and Development. Unset locally uses `uploads/`.
- **`MOCK_PROVIDERS=1`** — local canned story / MP3 / poster (ignored when `VERCEL_ENV=production`)
- **`MOCK_POSTER_MODE=fallback`** — local only; forces the text-only poster path

---

*Update **Current progress** and backlog checkboxes whenever behavior changes.*
