# Capped live test plan (AB-14)

Not approved. This run made no clone and no paid text-to-speech call. `VOICE_PREVIEW_LIVE` stays unset, so preview generation stays off. Replaying a library sample or a stored preview does not call the speech API.

Model stays `eleven_v3` at the public list price checked 2026-11-01: **$0.08 per 1,000 characters**. Flash is $0.04 and is not used here. `eleven_v4` is not switched on.

## What to run, once Eason sets a cap

1. Add the ten library voices to the workspace (Voice Library add, not a custom slot, no character charge expected).
2. One `language_code` probe on `eleven_v3` with the English preview line plus `language_code: "en"`. If the API rejects the field, leave the app as it is (it does not send `language_code` to v3). Count the characters only if the request is accepted.
3. Generate each cached preview once: 5 English lines and 5 Traditional Chinese lines, one per archetype, then replay each from cache.
4. Create one instant clone from a 60–120 second recording, preview one short line with it, narrate one short story, then delete the provider voice and the sample.

## Character counts

Preview lines (from `lib/voices/passages.ts`):

- English: `The little horse whispered good night, and the stars leaned in to listen.` = 73 characters.
- Traditional Chinese: `小馬輕聲說晚安，星星都靠過來聽。` = 16 characters.

Five voices × two languages = 5 × 73 + 5 × 16 = **445 characters**.

`language_code` probe, only if accepted: 73 characters.

Short story narration with the clone: cap the script at **500 characters**.

Clone create and delete: no character price on the public pricing page. They do use one custom slot until delete.

## Dollars

At $0.08 / 1,000 characters:

| Step | Characters | Estimate |
| --- | ---: | ---: |
| Previews, 5 × en + 5 × zh | 445 | $0.0356 |
| Optional v3 language_code probe | 73 | $0.0058 |
| One short story with the clone | 500 | $0.0400 |
| Clone create + delete | 0 | $0.00 |
| **Total** | **1,018** | **$0.0814** |

Suggested cap: **$0.15**. That covers the table and a little rounding. It is not approval to spend it.

Do not turn on `NARRATION_RETRY_APPROVED`. A failed section must not retry on its own during this test.
