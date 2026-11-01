# Default narrators (AB-14)

Fetched 2026-11-01 from `GET /v1/shared-voices/{voice_id}` with no paid call and no API key. These are Voice Library voices, not the ElevenLabs Default premade voices that expire on 2026-12-31, and not the founder or family clones.

Listening audition for every row is **pending**. A listing and a preview URL are not a quality claim. `verified_languages` on these listings did not include `eleven_v3`. The app still uses the configured model.

Commercial note, same for every row: category and `free_users_allowed` are on the listing; `rate` is 1 and `fiat_rate` is null (no custom surcharge shown). ElevenLabs states Voice Library voices are cleared for broad commercial use on paid plans, subject to the Terms of Use (join.elevenlabs.io/voice-library, checked 2026-11-01). Adding a library voice does not use a custom voice slot. The workspace still has to be able to call the voice id.

| App id | Name | Archetype | Provider id | Source | en | zh-Hant | Audition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| story-spuds | Spuds | Gentle and reassuring | NOpBlnGInO9m6vDvFkFC | Voice Library, high_quality, narrative_story, American grandpa | yes | no | pending |
| story-mark | Mark | Warm and conversational | UgBBYS2sOqTuMpoF3BR0 | Voice Library, high_quality, conversational, American | yes | yes | pending |
| story-david | David | Calm with a lower voice | cCYjmrGZaI86GUJ7F2Nn | Voice Library, high_quality, narrative_story, deep American | yes | yes | pending |
| story-aaron | Aaron | Bright and expressive | PCa5QtqUKnVu4yH3HxLp | Voice Library, professional, narrative_story, Californian | yes | no | pending |
| story-pastie | Pastie | Classic storyteller | y47FZICqt6oFf4Z89DXT | Voice Library, professional, narrative_story, Nigerian | yes | no | pending |
| story-tuntun | Tun Tun | Gentle and reassuring | SIdddo4tIfBnOJY8JYjx | Voice Library, professional, narrative_story, Taiwan Mandarin | no | yes | pending |
| story-chun | Chun | Warm and conversational | ZhxuUPFU7Hvp3p8qIPQP | Voice Library, professional, narrative_story, Taiwan Mandarin | no | yes | pending |
| story-jason | Jason | Calm with a lower voice | DowyQ68vDpgFYdWVGjc3 | Voice Library, high_quality, Beijing Mandarin, deep and calm | no | yes | pending |
| story-anna | Anna | Bright and expressive | 9lHjugDhwqoxA5MhX0az | Voice Library, high_quality, Taiwan Mandarin | yes | yes | pending |
| story-james | James | Classic storyteller | 4VZIsMPtgggwNg7OXbPY | Voice Library, high_quality, narrative_story, Mandarin | yes | yes | pending |

English story voices in the picker: Spuds, Mark, David, Aaron, Pastie, Anna, James (7).
Traditional Chinese story voices in the picker: Mark, David, Tun Tun, Chun, Jason, Anna, James (7).

`Eason_EN`, `Eason_CN`, and `Neva_CN` stay in `LEGACY_VOICES` so older saved audio can still be identified. They are not listed and cannot be used to make a new recording. Saved files still play.

Rights details and preview URLs live in `lib/voices/libraryNarrators.json` and `lib/voices/registry.ts`.
