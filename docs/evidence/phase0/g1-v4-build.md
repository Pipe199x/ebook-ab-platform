# G1 · What the v4.0 source needs to build

**Owner:** Documenter · **Date:** 2026-10-20 · **Task:** PIP-14 (G1)
**Feeds:** PIP-47 (`make_plan_md.py` v4.0 mode, Backend engineer)
**Plan ref:** §0 steps 1 and 4.

## Bottom line

The v4.0 source *is* buildable: pandoc + the existing Typst template compile it to a
PDF with all 17 figures. What is missing is not content, it is the generator support
and five small template gaps. All five are listed below with the exact fix, so PIP-47
does not have to rediscover them.

## What I ran (reproduce)

A scratch copy, so the tracked tree was not touched (S0.1 / PIP-37 still open):

```bash
S=<scratch>/g1/plan
mkdir -p "$S/build" "$S/img"
cp docs/plan/PLAN-v4.0-source.md      "$S/plan-source.md"
cp -r docs/plan/render                "$S/render"
cp docs/evidence/phase0/plan-img/*.png "$S/img/"
cd "$S"

pandoc plan-source.md \
  -f markdown+lists_without_preceding_blankline-tex_math_dollars-subscript-superscript-smart-fancy_lists-citations \
  -t typst --standalone --shift-heading-level-by=-1 --toc --toc-depth=2 \
  --lua-filter=render/plan.lua -V template=/render/plan-conf.typ -V papersize=a4 \
  -o build/PLAN.typ
typst compile --root . build/PLAN.typ PLAN.pdf
```

Result after the five fixes below: **83 pages, 17 embedded images, PDF opens**
(`pdfimages -list` shows 17; `typst compile` exits 0).

Note: this bypassed `make_plan_md.py` on purpose. Its v3.0 steps are what break; the
pandoc + Typst half already handles v4.0.

## The five gaps, with the fix

| # | Where | Symptom | Fix |
|:-:|:--|:--|:--|
| 1 | `render/plan-conf.typ` | `error: unknown variable: muted` (then `navy`, `callout`, `qa`, `warnbox`) | The v4 source *is* Typst and calls these five. `muted` exists in the template but pandoc only imports `conf`, so none are in scope in the generated file. Export them: `#let navy = ...`, `#let callout(body) = ...`, `#let warnbox(body) = ...`, `#let qa(..cells) = ...` (variadic — the source calls `qa` with 4 arguments). |
| 2 | `render/plan.lua` | `file not found (searched at build/img/s-home.png)` | The six screen `image("img/...")` calls sit inside a `{=typst}` raw block, so `Image()` never sees them. Raw blocks pass through unchanged. Rewrite `"img/` → `"/img/` in v4 mode (the pipeline already runs with `--root docs/plan`), or move the screens out of raw Typst. |
| 3 | `render/plan-conf.typ:40` | Running header reads **Plan v3.0** on a v4.0 document | Make the version a template variable, or a v4 variant of the conf. |
| 4 | `render/plan-conf.typ` cover | Two covers: the template's hardcoded v3.0 cover (page 1), then the source's own Typst cover (page 2) | In v4 mode the source supplies the cover; the template must not draw one. Gate the `page(...)[` block on `title != none`. |
| 5 | `tools/make_plan_md.py` | Cannot reach the above: it asserts a v3.0 title line and exactly 11 Mermaid blocks | Version detection (Typst cover block ⇒ v4.0), then in v4 mode **skip** the Mermaid step, the `<!-- screens -->` assert, the landscape-marker step (its six headings no longer exist in v4) and the callout-prefix step. Keep the table-width step only if QA confirms it still helps. |

Gaps 3 and 4 are invisible to a build test that only checks the exit code — QA should
look at pages 1–2 and the running header, not just at whether Typst exited 0.

## Cross-check against the shipped PDF

`docs/plan/PLAN-v4.0.pdf` (already in the repo): **78 pages, 17 images**, all at or
above 360 ppi. So the released document and the source agree on the figures; nothing
in the source is missing. The 83 vs 78 page difference is the duplicated cover plus
the landscape/table-width behaviour, not lost content.

## Consequence for G1

G1 remains blocked on PIP-47, not on the images and not on a board decision (settled
above).

## Decision recorded (board, 2026-10-20): option B

**Decision.** G1 uses the 17 figures already extracted from `PLAN-v4.0.pdf` into
`docs/evidence/phase0/plan-img/`. No Mermaid or HTML source is recovered or
re-authored for the v4 figures.

**Reason.** The v4 source is image-only: `PLAN-v4.0-source.md` has no Mermaid blocks
at all (the word "mermaid" appears once, line 77, as prose about the toolchain). All
17 references are `![...](img/<name>.png)` (11) or `image("img/<name>.png")` inside
Typst blocks (6). Checked this window: the 17 names referenced and the 17 files
present match one for one, at print resolution. Option A had nothing extra to offer —
`f08-aws-map` replaces the v3.0 For nerds map and no `f08` Mermaid source exists
anywhere in the tree; the 10 v3.0 `.mmd` files stay for the figures that did not change.

**Plan ref.** §0 steps 1 and 4 (source → `docs/plan/render/plan-source.md` → `PLAN.md`);
§5 Phase 0. Board decision, not a D-decision change.

**Consequence.** G1 depends on PIP-47 only (`make_plan_md.py` v4.0 mode), which is
blocked by PIP-37 (S0.1). The A/B question posted on PIP-14 at 22:06Z is withdrawn as
superseded.

## Wiring check (2026-10-20 09:35Z): PIP-47 lost its blocker

PIP-47 is `backlog`, assignee Backend engineer, and its `blockedByIssueIds` is now
**empty** — the PIP-37 link I set at 01:09Z was cleared (PIP-47 `updatedAt` 09:14Z).
`tools/make_plan_md.py` and `docs/plan/render/` are unchanged in git, so nothing was
done on it. That is a real risk: with no blocker, PIP-47 looks ready to pick up, yet
every artefact it must write (`tools/make_plan_md.py`, `docs/plan/img/`,
`docs/plan/PLAN.md`) is a tracked-tree change held by S0.1 (PIP-37, board).

PIP-14 itself is still correctly blocked: its `unresolvedBlockerIssueIds` is PIP-47.

So the chain is:

```
PIP-14 (blocked, blocked-by PIP-47)
  └─ PIP-47 (backlog, unwired) — needs v4.0 mode in tools/make_plan_md.py
       └─ PIP-37 S0.1 (todo, board) — OK to change the tracked tree
```

Not re-wiring PIP-47's blocker a second time: the first attempt was reverted, and per
the team rules two agents do not fight over metadata — the Backend engineer or the VP
should re-block it if they agree. This is flagged in a comment on PIP-47.

## Moving the figures

The move of `plan-img/` → `docs/plan/img/` is still gated by S0.1 (PIP-37), and it is
one command:

```bash
mkdir -p docs/plan/img && git mv docs/evidence/phase0/plan-img/*.png docs/plan/img/
```
