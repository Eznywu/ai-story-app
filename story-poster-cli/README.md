# Story → illustrated poster CLI

TypeScript CLI that reads a short story, runs a **creative director** pass (structured JSON via OpenAI), then generates **two** portrait posters:

1. **OpenAI** — [`images.generate`](https://platform.openai.com/docs/api-reference/images/create) with the **GPT Image** family (default `gpt-image-1.5`).
2. **Google** — **Gemini native image** by default (`gemini-2.5-flash-image`, “Nano Banana”), or optional **Imagen** via `models.generateImages` when `GEMINI_POSTER_BACKEND=imagen`.

Uses the official [`openai`](https://www.npmjs.com/package/openai) and [`@google/genai`](https://www.npmjs.com/package/@google/genai) SDKs.

## Setup

```bash
cd story-poster-cli
cp .env.example .env
# Edit .env: set OPENAI_API_KEY and GEMINI_API_KEY
npm install
```

## Usage

```bash
npm run poster -- --story "Your story text..." --title "Your Title"
```

Read from a file (`.txt` or `.md`; YAML front matter in markdown is stripped):

```bash
npm run poster -- --file ./my-story.txt --title "The Night Train"
```

Custom output root (each run creates a timestamped subfolder):

```bash
npm run poster -- --story "..." --title "..." --out ./outputs
```

## Outputs (per run)

Inside `outputs/<iso-timestamp>_<id>/`:

| File | Contents |
|------|----------|
| `story.txt` | Normalized story |
| `creative-brief.md` | Brief + visual concept |
| `prompts.json` | 3 variations + final OpenAI & Gemini prompts |
| `poster-openai.png` | OpenAI raster (if generation succeeded) |
| `poster-gemini.png` | Gemini raster (if generation succeeded) |
| `comparison.md` | Short OpenAI vs Gemini **prompt-level** comparison |
| `metadata.json` | Full run metadata + any errors |

## Environment variables

See `.env.example`. Highlights:

- **`OPENAI_CREATIVE_MODEL`** — planning / brief (default `gpt-4o`).
- **`OPENAI_POSTER_MODEL`** — default `gpt-image-1.5` (`gpt-image-1`, `gpt-image-1-mini` also valid in SDK types).
- **`GEMINI_POSTER_BACKEND`** — `native` (default) or `imagen`.
- **`GEMINI_NATIVE_IMAGE_MODEL`** — default `gemini-2.5-flash-image`.
- **`GEMINI_IMAGEN_MODEL`** — default `imagen-4.0-generate-001` (when backend is `imagen`).

## Requirements

- Node.js **20+** recommended (for `@google/genai`).
- Valid API keys and model access for your OpenAI / Google AI project.

## Error handling

If one provider fails, the run **still writes** briefs, prompts, metadata, and the other image when possible. Check `metadata.json` → `errors`.
