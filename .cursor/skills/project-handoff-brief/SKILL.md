---
name: project-handoff-brief
description: Produces a concise two-section project brief (app goal + current progress) formatted for copy-pasting into other AI assistants. Use when the user asks for a project summary, handoff context, onboarding packet for ChatGPT or another model, or "paste this into another AI."
---

# Project handoff brief (external AI)

## Purpose

Generate a **single, copy-paste-ready** markdown document so the user can drop it into another AI tool. The brief must have **exactly two top-level sections** (in this order):

1. **Goal of the App**
2. **Current progress of the App**

Do not add extra top-level sections (no README-style setup unless the user asks). Optional subsections *inside* those two are fine.

## Sources (read before writing)

Use the repo as ground truth, in this order:

1. **`audiobook-project-rules/project-rules.txt`** — product vision, Phase 1 MVP scope, explicit out-of-scope items, principles.
2. **`audiobook-project-rules/project-checklist.md`** — **authoritative** Done / Partial / Not started; action backlog; known gaps (e.g. multi-tenant library).
3. Only if something is unclear: skim **`README.md`**, **`package.json`**, or a few key files under `app/` — do not dump file trees.

If the checklist’s “Last updated” line exists, **mention the date** in the progress section (or note “checklist date: …”) so the external AI knows freshness.

## Optional freshness signal

If the user wants “what we did lately” or the checklist looks stale, run **`git log -10 --oneline`** and add **one short bullet list** under *Current progress* labeled **Recent commits (optional)** — no more than 5 lines.

## Writing rules

- **Tone:** Neutral, factual; no marketing fluff.
- **Goal section:** Summarize *who* the product is for, *what* problem it solves, the **Phase 1 MVP** checklist in brief bullets, and **1–3 explicit non-goals** from the rules (to prevent scope creep in the other tool).
- **Progress section:** Mirror the checklist’s structure (product experience, backend/data, launch/ops) but **compressed**. For every **Partial** or **Not started** item that blocks launch or privacy, call it out plainly (e.g. library row isolation).
- **Length target:** ~400–900 words total unless the user asks for longer.
- **Honesty:** If the codebase and checklist disagree, **prefer the checklist** and add a one-line note: “Verify in code: …”

## Output format (mandatory)

Return **one fenced markdown block** the user can copy in one gesture. Use this skeleton:

```markdown
# AI Family Storytelling App — brief for external assistants

*(Stack: one line, e.g. Next.js + Prisma + SQLite — only if known from repo files.)*

## 1. Goal of the App

[Product vision, audience, core loop, Phase 1 MVP bullets, explicit out-of-scope]

## 2. Current progress of the App

[Done vs partial vs not started — prioritized by user-visible impact and launch risk]

### Known gaps / next priorities

[Short numbered or bulleted list from checklist backlog + launch items]

### Recent commits (optional)

[Only if git log was run]
```

After the fenced block, you may add **one sentence** telling the user to replace secrets/env details if they paste into an untrusted tool.

## When the user wants a shorter paste

If they ask for “minimal” or “tweet length,” collapse to:

- **Goal:** 3–5 bullets
- **Progress:** 5–8 bullets (must include top risks)

Same two section titles.
