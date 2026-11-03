# Phase A — integration and verification

Work: AB-20, https://app.notion.com/p/40df569f891e8103aa02e9a9b7613fc0

Started 2026-11-03. Planning target: 2026-11-10, dependent on preview access and review.
Execution: Codex cloud workspace, with a separate QA agent; no Cursor run dispatched.
The proposed operating plan v1, updated 2026-11-02, remains the source of goals;
this work tests integration and reliability, not adoption, revenue or live voice quality.

## Source selection

- Production source baseline: main at dd0624150a606858a195c29553e378f84b450a45.
- Integration parent: c0605bec5805fba1afb35b123020ea91741ce4d2 (#15).
  It already includes #11 redesign, #12 artwork, #13 voices, reviewed #14 language
  commit 9ebf358 and AB-16 audit commit 6ca3773. Do not merge those again individually.
- Bring across the changes of b609c71d29a0d8180ba04e561f7643fb29861976 (#17 / AB-18).
  Preserve the ten scripts, frozen take metadata and separate story language.
- Exclude its local-test-parent ancestor 9452b1a (#16 / AB-19), and exclude the
  drifted language tip 6391d56. No authentication bypass or test-parent identity is included.
- Conflict resolution: retain recordingLocale/scriptVersion in useTts, remove testVoice,
  omit the local-parent config/tests, and run recorder tests using normal hashed sessions
  in a disposable database. Remove the locale test event listener from app runtime.
- Keep recorder layout/navigation unchanged. One existing poster-rendering test exposed
  a clipped bold title with Linux fallback fonts; increase its Latin width estimate.
- Preserve the original cloud audit checkout, clean at 56f5b46. This does not establish
  the state of Eason's Mac; no Mac files, environment or local recordings were changed.

## Database and deployment gates

The full migration chain is:

1. 20260408120000_init_postgresql
2. 20261024120000_story_audio_filename
3. 20261024190000_parent_accounts
4. 20261025120000_story_media_urls
5. 20261027140000_narration_asset_metadata
6. 20261031180000_story_artwork
7. 20261101120000_parent_voices
8. 20261102140000_voice_recording_script — nullable recordingLocale/scriptVersion on Voice.

Run `prisma migrate deploy`, not db push/reset, against the reviewed environment.
Do not assume the hosted migration ledger matches source history.
No production or hosted preview migration has been run by this task.

`build:vercel` runs migrations before Next build. Because hosted preview/production
database separation is unverified, vercel.json disables automatic Git deployments
only for `codex/phase-a-release-candidate`. Other branches retain their existing behavior.
Before enabling this branch or manually deploying: verify distinct database endpoints
and database/branch IDs, separate storage, preview-scoped credentials, migration ledger
and a backup/restore plan. Never copy credential values into this receipt.

## Configuration inventory — names only

| Area | Names / acceptance requirement |
| --- | --- |
| Database | DATABASE_URL; optional PG_POOL_MAX. Distinct preview and production databases. |
| Login | AUTH_ENABLED, AUTH_SECRET, RESEND_API_KEY, AUTH_EMAIL_FROM. Verify delivery/domain/session behavior before beta. |
| Durable media | BLOB_READ_WRITE_TOKEN. Verify private voice samples and generated personal narration; local uploads are test fallback only. |
| Story generation | OPENAI_API_KEY; OPENAI_STORY_MODELS, OPENAI_STORY_TEMPERATURE, OPENAI_STORY_TIMEOUT_MS. |
| Artwork | POSTER_IMAGE_PROVIDER, OPENAI_POSTER_IMAGE_MODEL, OPENAI_POSTER_IMAGE_QUALITY, OPENAI_POSTER_TIMEOUT_MS, POSTER_MAX_ATTEMPTS, POSTER_DAILY_GENERATION_CAP, POSTER_DAILY_SPEND_CAP_USD, POSTER_CONNECTIVITY_TIMEOUT_MS; optional ARTWORK_LEGACY_BRIEF. |
| Optional alternate artwork | GEMINI_API_KEY (or GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY), GEMINI_IMAGE_MODEL, GEMINI_HTTP_TIMEOUT_MS, GEMINI_NATIVE_IMAGE_ASPECT_RATIO, GEMINI_NATIVE_IMAGE_SIZE, POSTER_BENCHMARK. |
| Voice | ELEVENLABS_API_KEY, ELEVENLABS_TTS_MODEL, PERSONAL_VOICE_LIMIT, VOICE_CLONE_ATTEMPTS_PER_HOUR. |
| Paid test/retry gates | VOICE_PREVIEW_LIVE + VOICE_PREVIEW_DAILY_CAP_USD; NARRATION_RETRY_APPROVED + NARRATION_RETRY_BUDGET_USD; NARRATION_STT_BUDGET_USD; RUN_LIVE_NARRATION + LIVE_NARRATION_MAX_USD. Leave paid gates off until Eason approves a cap. |
| Cron / catalog | CRON_SECRET, STORY_LIBRARY_ANTIREPEAT. Preview must not run production content jobs. |
| Test/platform | MOCK_PROVIDERS, MOCK_POSTER_MODE; VERCEL, VERCEL_ENV, NODE_ENV supplied by runtime. No LOCAL_TEST_PARENT support. |

Some optional configuration names are read through configuration functions rather
than process.env directly. This is a source inventory, not proof of hosted setup.

## Verification and next gate

- Unit suite: 102 passed after the poster clipping fix, via `node --import tsx --test tests/*.test.ts tests/narration/*.test.ts tests/voices/*.test.ts`.
  The equivalent tsx CLI cannot create its IPC socket in this environment.
- Typecheck, lint and production build passed. Build used a local placeholder database
  URL and did not migrate a database.
- Independent QA reviewed ancestry, auth/ownership, nullable migration, frozen metadata,
  recorder UI and test isolation; independently ran 28 poster/recording tests successfully.
- Browser tests use real application APIs, seeded normal sessions and mocked providers,
  with all remote media/provider credentials blank. They require a local *_test database.
  See the AB-20 receipt for the final runtime result and exact remote commit/tree.
- Preview is not published or accepted. Vercel project inspection returned team-scope 403.
- Family isolation, hosted persistence/private storage, account deletion, live voice
  similarity and fluent review of all scripts remain separate launch gates.
- Eason must accept a named preview and separately approve main/production changes.
  This PR is a review candidate, not a public-beta or App Store release.
