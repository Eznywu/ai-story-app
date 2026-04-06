# AI Family Storytelling App — project checklist

**Companion:** `project-rules.txt` in this folder. **Last updated:** 2026-04-01.

**Progress legend**

- **Done** — shipped and usable in the prototype today  
- **Partial** — works but incomplete vs ideal or product copy  
- **Not started** — not built yet  

Use **`- [ ]` / `- [x]`** under *Action backlog* to track delivery. Refresh *Current progress* when behavior changes.

---

## Current progress

### Product experience

- **Done** — Mobile-first shell: `app/page.tsx`, `app/page.css`, `app/layout.tsx`, `app/components/*`, `app/hooks/*` (further polish listed in backlog **#5**)
- **Done** — Core loop: preferences → generate story → TTS → save → poster download → library
- **Done** — Story generation: `POST /api/story`, `lib/storyGenerator.ts` (retries, temperature, freshness seed + nudges, `loadAntiRepeatLibraryContext`; disable excerpts with `STORY_LIBRARY_ANTIREPEAT=0`)
- **Partial** — Story freshness: prompt + saved-story excerpts; not embedding / plot-level dedupe
- **Done** — TTS: `useTts`, `POST /api/eleven-tts`, `lib/tts/eleven.ts`, `lib/voices.ts`, `GET /api/voices`
- **Done** — Errors & retries: `AppBannerError` (story / save / tts / poster), voice + library error UI
- **Done** — Save & library: `POST/GET /api/stories`, Prisma `Story`, optional `posterFilename`, `posterUrl` on list; `POST /api/posters/save`, `GET /api/posters/[filename]`
- **Done** — Preferences on form: age, language, child gender, genre, length, main character, optional title, voice
- **Partial** — Posters: `lib/posterImage.ts` (OpenAI default, Gemini optional), `lib/poster.ts` composite + text-only fallback, `trackEvent(..., { layout })`; keepsake fields (baby name, week, quote, fact) not in UI yet
- **Partial** — Analytics: `lib/analytics.ts`, `trackEvent` — dev-oriented until a real vendor
- **Partial** — Monitoring: `captureException` on `/api/story`, `/api/poster`, `/api/posters/save` only
- **Done** *(placeholders)* — Legal: `app/legal/privacy`, `app/legal/terms`, footer links
- **Not started** — Commercial launch: store listing, prod hardening, counsel-reviewed policies (see *Launch* below)

### Backend & data

- **Done** — Prisma + SQLite: models `Story`, `Voice`; `DATABASE_URL`
- **Done** — Story/poster libs: `storyGenerator`, `storyLibraryContext`, `poster`, `posterImage`, `openaiPoster`, `geminiPoster`, `lib/errors.ts`, `lib/types.ts`
- **Partial** — HTTP APIs: routes under `app/api` (story, stories, poster, posters/save, posters/[filename], eleven-tts, voices, voice-sample, tts, tts-save, audio/[filename], voice-clone scaffold); most routes **without** `captureException` yet
- **Partial** — PWA / installable app: icon routes may exist; full manifest not assumed

### Vision fit (`project-rules.txt`)

- **Partial** — Stories: varied per request; library-aware anti-repeat; stronger dedupe optional later
- **Partial** — Voice: ElevenLabs now; cloning explicitly deferred (experimental `voice-clone` route)
- **Partial** — Newborn-style poster: illustration + text band; full “keepsake copy” fields still missing
- **Ongoing** — Commercial / narrative goals: process + launch tasks

---

## Action backlog (prioritized initiatives)

Check off when shipped; details = whole-project tracking.

- [ ] **1. Story guidance field** — free-text hints for generation (tone, themes, avoidances) → `StoryForm`, API, `lib/storyGenerator.ts` `buildPrompt`
- [ ] **2. Story series** — linked episodes → schema (`seriesId`, episode index, …), prompts, UI
- [ ] **3. Poster: more illustration-forward** — stronger art prompts & layout (`openaiPoster` / `geminiPoster` / `poster.ts`)
- [ ] **4. Login + per-user library & saved voices** — auth, `userId` on data, filter stories/APIs, voice prefs per user
- [ ] **5. Mobile-first UI polish** — tap targets, thumb zones, less scroll fatigue, typography pass (`page.css` + components)
- [ ] **6. Library redesign: recordings + posters** — unified UI for story text, saved audio, poster links (`LibraryPanel`, storage/metadata)

**Suggested order:** **#1** + **#5** in parallel → **#4** before **#6** if privacy matters → **#2** after prompts stable → **#3** anytime.

---

## Launch & ops (manual)

- [ ] Counsel-reviewed Privacy Policy & Terms (replace placeholders)
- [ ] Distribution metadata, screenshots, support URL, age rating
- [ ] Production host, secrets, rate limits, `maxDuration` if serverless
- [ ] Wire PostHog (or similar) + Sentry (or similar)
- [ ] App Privacy disclosure: OpenAI (story + image), ElevenLabs, optional Gemini; retention
- [ ] TestFlight / beta; native shell if not pure web

---

## Engineering hygiene

- Tune story timeout / hosting limits; `OPENAI_POSTER_TIMEOUT_MS` for posters
- Add `captureException` to `/api/eleven-tts`, `/api/stories`, `/api/posters/[filename]`, …
- Poster copy fields (name, week, quote, fact) — aligns with backlog **#3**
- If posters stay text-only — debug `/api/poster` (keys, billing, models)
- Optional: embedding-based anti-repetition
- When **#4** ships: plan DB migration if SQLite is insufficient

---

## Intentionally deferred (scope guardrails)

- Ship-ready **voice cloning**
- **Advanced** poster editor
- **China-specific** deployment
- **Full** product **localization**
- **Complex** subscriptions
- **Deep** social / community (beyond login + library in **#4**)

---

## Environment (do not commit secrets)

- `OPENAI_API_KEY` — stories + default posters
- `OPENAI_STORY_MODELS`, `OPENAI_STORY_TEMPERATURE`
- `OPENAI_POSTER_*`, `POSTER_IMAGE_PROVIDER`, `GEMINI_*`
- ElevenLabs credentials (see `lib/tts/eleven.ts`)
- `STORY_LIBRARY_ANTIREPEAT=0` to disable library excerpts in prompts
- `DATABASE_URL`

---

*Single source of truth for project status: edit this file as you ship; keep **Current progress** honest.*
