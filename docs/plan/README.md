# docs/plan · start here

**Current version: plan v3.0 (2026-10-17).** Everything else in this folder is history or tooling.

## Read

| File | What it is |
|---|---|
| [PLAN.pdf](PLAN.pdf) | **The plan v3.0, the only current version.** Part 1 tells the story in pictures (about 10 minutes). Part 2 is the technical plan. |
| [PLAN.md](PLAN.md) | The same plan as Markdown. It is generated, so don't edit it. |

## Try

| What | Where |
|---|---|
| The demo of the final product: the Duel, *Which would you read?*, the Ad Doctor, *Real or luck?*, the library, and the *For nerds* map | Online (private): <https://claude.ai/artifact/8hkSVj3hPdpQwf8kveSaT4> · Offline: [DEMO.html](DEMO.html) |

## Your questions and my answers (history)

| File | Round |
|---|---|
| [answers/ANSWERS-v2.2.pdf](answers/ANSWERS-v2.2.pdf) | Round 5: nine questions about v2.2, answered with changes C1–C12 (in v2.3 and v3.0). |
| [answers/LIFESAVER.pdf](answers/LIFESAVER.pdf) | Round 6: "how could this be a lifesaver?", answered with changes L1–L11 (in v3.0). Its prototype is now the demo; `answers/LIFESAVER.html` only points to [DEMO.html](DEMO.html). |

## Old (kept, not current)

| Folder | What |
|---|---|
| [old/v1](old/v1), [v2.0](old/v2.0), [v2.1](old/v2.1), [v2.2](old/v2.2), [v2.3](old/v2.3) | Earlier plans (PLAN.md + PLAN.pdf). |
| [old/demo-xp](old/demo-xp) | The first demo, in a Windows XP style, with its source and its test. Online copy: <https://claude.ai/artifact/CZykjeJEPEUAf13FhAbUVX> |
| [old/plan-companion-v2.2](old/plan-companion-v2.2) | The v2.2 interactive plan page. Online copy: <https://claude.ai/artifact/49xyZz5g8S6J4QtvAtoMVr> |
| [old/mockups-v2.3](old/mockups-v2.3) | The v2.3 mockups. v3.0 shows screens from the demo instead. |

## How it's built (for editing)

| Path | Role |
|---|---|
| `render/plan-source.md` | The plan's source. Edit this, never PLAN.md. |
| `render/demo.html`, `render/nerds.js` | The demo's source. `nerds.js` is the *For nerds* map, shared with the future site. |
| `render/plan.lua`, `render/plan-conf.typ` | The PDF layout: a pandoc filter and a Typst template. |
| `diagrams/`, `charts/`, `shots/` | Generated pictures: Mermaid diagrams, charts, and the demo's screens. |
| `build/` | Intermediate files, including `DEMO.artifact.html` for the online demo. |
| `answers/*.html`, `answers/figs/` | The sources of the answer PDFs. |

Rebuild inside WSL, from the repo root:

```bash
python3 -I tools/make_plan_md.py docs/plan/render/plan-source.md docs/plan/PLAN.md
tools/render_docs.sh   # diagrams, charts, the demo and its click-through test, then PLAN.pdf
```
