# MY-APP

Kid-focused story app built with Next.js + Capacitor:
- Generates stories
- Creates posters
- Produces TTS audio
- Supports web and iOS workflows

## Quick Start

1. Copy `.env.example` to `.env.local` and set **`DATABASE_URL`** to a **PostgreSQL** connection string ([Neon](https://neon.tech) free tier works well).
2. Apply the schema to that database:

```bash
npx prisma migrate deploy
```

3. Run the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To exercise story, narration, and poster **without provider keys**, set `MOCK_PROVIDERS=1` in `.env` (see `.env.example`). That path is for local testing and is ignored when `VERCEL_ENV=production`. Real narration still needs `ELEVENLABS_API_KEY`; real story text needs `OPENAI_API_KEY`; real posters need `OPENAI_API_KEY` or `GEMINI_API_KEY`.

## Deploy on Vercel

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com).
2. In the Vercel project, add the same env vars as `.env.example` (at minimum **`DATABASE_URL`**, **`OPENAI_API_KEY`**, and any TTS/poster keys you use).
3. Set **`CRON_SECRET`** to a long random string. Vercel Cron will call `/api/cron/daily-stories` with `Authorization: Bearer <CRON_SECRET>` when that variable is defined.
4. **`vercel.json`** sets **`buildCommand`** to `npm run build:vercel` (`prisma migrate deploy` then `next build`) and schedules the daily stories route (UTC — adjust in `vercel.json` if needed).
5. After the first deploy, confirm the Neon (or other) database received tables; fix connection string (`sslmode=require` for Neon) if the build fails at the migrate step.

## Project Organization by Feature

### Story Creation and Library
- `app/components/HomeApp.tsx` - main orchestration UI
- `app/components/StoryForm.tsx` - story input form
- `app/components/StoryOutput.tsx` - rendered generated story
- `app/hooks/useStoryGeneration.ts` - story generation flow
- `app/hooks/useStoryLibrary.ts` - library loading and state
- `app/api/story/route.ts` - single story generation API
- `app/api/stories/route.ts` - stories listing/storage API
- `lib/stories/storyGenerator.ts` - story generation logic
- `lib/stories/dailyAutomatedStories.ts` - scheduled daily story generation
- `lib/stories/storyAgeOptions.ts` - age range options

### Poster Generation
- `app/components/PosterFlashCard.tsx` - poster preview card
- `app/api/poster/route.ts` - poster generation endpoint
- `app/api/posters/save/route.ts` - persist generated posters
- `app/api/posters/[filename]/route.ts` - poster file serving
- `lib/posters/poster.ts` - poster pipeline entry point
- `lib/posters/openaiPoster.ts` - OpenAI poster provider
- `lib/posters/geminiPoster.ts` - Gemini poster provider
- `lib/posters/posterImage.ts` - poster image handling
- `lib/posters/posterDiagnostics.ts` - poster diagnostics helpers
- `lib/posters/posterGenreArt.ts` - fallback genre artwork
- `lib/posters/posterPromptConfig.ts` - poster prompt config

### Voice and Audio (TTS + Cloned Voices)
- `app/components/TtsControls.tsx` - TTS controls in UI
- `app/components/VoiceRecorder.tsx` - voice sample recorder
- `app/components/VoiceRecordingFlashCard.tsx` - voice capture card
- `app/components/PlaybackPanel.tsx` - audio playback UI
- `app/api/tts/route.ts` - TTS endpoint
- `app/api/tts-save/route.ts` - save TTS output
- `app/api/eleven-tts/route.ts` - ElevenLabs TTS route
- `app/api/voice-sample/route.ts` - upload/list voice samples
- `app/api/voice-clone/route.ts` - voice cloning operations
- `app/api/voices/route.ts` - available voices route
- `app/api/audio/[filename]/route.ts` - audio file serving
- `app/hooks/useTts.ts` - TTS client-side flow
- `lib/tts/openai.ts` - OpenAI TTS adapter
- `lib/tts/eleven.ts` - ElevenLabs TTS adapter
- `lib/voices/voices.ts` - voice metadata and resolution
- `lib/voices/clonedVoiceStorage.ts` - cloned voice persistence

### Profiles, Kids, and Characters
- `app/components/KidProfileFormModal.tsx` - kid profile creation/edit
- `app/components/CharacterFormModal.tsx` - custom character setup
- `app/hooks/useKidProfiles.ts` - kid profile state management
- `app/hooks/useStoryCharacters.ts` - character state management
- `lib/profiles/localProfilesStorage.ts` - profile local storage layer
- `lib/profiles/profilesTypes.ts` - profile data types
- `lib/profiles/childGender.ts` - child gender helpers

### UI Shell and Navigation
- `app/layout.tsx` - root app layout
- `app/page.tsx` - main entry route
- `app/mobile/page.tsx` - mobile variant entry
- `app/desktop/page.tsx` - desktop variant entry
- `app/play/page.tsx` - play route
- `app/settings/page.tsx` - settings route
- `app/components/EntryScreen.tsx` - landing/entry screen
- `app/components/HomeTabBar.tsx` - tab navigation
- `app/components/AppChromeBar.tsx` - top app chrome
- `app/components/BackButton.tsx` - reusable navigation button

### Monitoring, Diagnostics, and Scheduled Jobs
- `app/api/debug/poster-connectivity/route.ts` - poster connectivity checks
- `app/api/cron/daily-stories/route.ts` - daily stories cron route
- `lib/analytics.ts` - analytics helpers
- `lib/monitoring.ts` - monitoring and telemetry helpers
- `lib/errors.ts` - shared error utilities
- `lib/providerHttp.ts` - provider HTTP abstraction
- `lib/posters/posterProviderErrors.ts` - poster provider error mapping

### Legal and Platform Integration
- `app/legal/privacy/page.tsx` - privacy page
- `app/legal/terms/page.tsx` - terms page
- `docs/CAPACITOR_IOS_DEV.md` - iOS/Capacitor local dev guide
- `ios/` - native iOS project
- `capacitor.config.ts` - Capacitor runtime configuration

## Project Organization by File Type

### UI Components (`app/components/*.tsx`)
Main React UI building blocks for screens, forms, controls, and cards.

### Hooks (`app/hooks/*.ts`)
Client-side state and orchestration logic for stories, profiles, and TTS.

### API Routes (`app/api/**/route.ts`)
Server-side endpoints for generation, storage, debugging, cron, and media serving.

### Core Domain Libraries (`lib/**/*.ts`)
Reusable business logic, provider adapters, diagnostics, shared types, and utilities.

### Pages and Layout (`app/**/page.tsx`, `app/layout.tsx`)
Route definitions and page-level composition.

### Styling (`app/*.css`, `app/components/*.css`)
Global and component-level styles.

### Data and Persistence
- `prisma/` + PostgreSQL (`DATABASE_URL`) via Prisma; see `.env.example`
- `uploads/` for generated media when `BLOB_READ_WRITE_TOKEN` is unset (local dev)
- Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set (required for posters and audio to survive on Vercel)

### Platform and Tooling
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- `package.json`, `package-lock.json`

## AI Connectivity Troubleshooting

If poster generation falls back to simple genre artwork, run:

```bash
curl http://localhost:3000/api/debug/poster-connectivity
```

Optional network/proxy environment variables:

```bash
OPENAI_BASE_URL=...
GEMINI_BASE_URL=...
POSTER_HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
HTTP_PROXY=http://127.0.0.1:7890
ALL_PROXY=socks5://127.0.0.1:7890
```

Restart `npm run dev` after changing env vars.

## iOS / Capacitor Notes

To make `/api/*` work in the native app, point Capacitor to your running Next.js origin.
See [`docs/CAPACITOR_IOS_DEV.md`](docs/CAPACITOR_IOS_DEV.md) for `CAP_SERVER_URL`, sync, and rebuild steps.
