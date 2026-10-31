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

Use two kinds of evidence. Do not let an older file outrank either one.

1. **Approved scope and decisions live in Notion.** Read [Audio Book OS](https://app.notion.com/p/401f569f891e8044b3b9e9b038fa82b8), the assigned Work item, confirmed decisions, and the [proposed operating plan v1, 2026-10-24](https://app.notion.com/p/403f569f891e81968813def2f47c3e2f). Numerical targets and dates on that plan stay proposed until Eason adopts them. Do not copy the plan into the brief.
2. **Implementation evidence is the code, tests, and runtime.** Prefer what the current tree and a real run show over any written status list.
3. **`audiobook-project-rules/` is history.** `project-rules.txt`, `project-checklist.md`, and `execution-priority-plan.md` stay in the repo so older intent can be cited. When one of them conflicts with Notion or with the code, label it historical and do not treat its Done / Partial / Not started marks, phase gates, or product name as current.

If the checklist’s “Last updated” line exists, mention that date as the checklist’s date, not as the date the app was last verified.

## Optional freshness signal

If the user wants “what we did lately” or the checklist looks stale, run **`git log -10 --oneline`** and add **one short bullet list** under *Current progress* labeled **Recent commits (optional)** — no more than 5 lines.

## Writing rules

- **Tone:** Neutral, factual; no marketing fluff.
- **Goal section:** Summarize *who* the product is for, *what* problem it solves, the current Phase 1 scope from Notion, and **1–3 explicit non-goals** from confirmed decisions or the operating plan. If Notion is unreachable, say so and do not promote the old checklist into that role.
- **Progress section:** Report what the code, tests, and runtime show, compressed. Name launch or privacy gaps that the current code actually has. A checklist tick is not runtime proof.
- **Length target:** ~400–900 words total unless the user asks for longer.
- **Honesty:** If an older checklist and the code disagree, report the code and say the checklist is historical. Do not prefer the checklist. Leave product-name, account, and phase-order disagreements unresolved unless a confirmed Notion decision settles them.

## Output format (mandatory)

Return **one fenced markdown block** the user can copy in one gesture. Use this skeleton:

```markdown
# Audio Book — brief for external assistants

*(Stack: one line taken from the current repo, such as the framework and database provider in `package.json` and `prisma/schema.prisma`. Do not copy an older stack from the checklist.)*

## 1. Goal of the App

[Product vision, audience, core loop, current scope from Notion, explicit out-of-scope]

## 2. Current progress of the App

[What code, tests, and runtime show — prioritized by user-visible impact and launch risk. Checklist status only when labeled as historical.]

### Known gaps / next priorities

[Short numbered or bulleted list from the current code and the assigned Notion work, not from an outdated checklist tick]

### Recent commits (optional)

[Only if git log was run]
```

After the fenced block, you may add **one sentence** telling the user to replace secrets/env details if they paste into an untrusted tool.

## When the user wants a shorter paste

If they ask for “minimal” or “tweet length,” collapse to:

- **Goal:** 3–5 bullets
- **Progress:** 5–8 bullets (must include top risks)

Same two section titles.
