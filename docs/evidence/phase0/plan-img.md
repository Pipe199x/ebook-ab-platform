# G1 · The 17 v4.0 figures, extracted from the PDF

**Owner:** VP of Engineering · **Date:** 2026-10-20 · **Unblocks:** PIP-14 (G1), PIP-18 (G4)
**Plan ref:** §0 steps 1 and 4; §5 Phase 0.

## What was missing

`docs/plan/PLAN-v4.0-source.md` points at 17 files under `img/`, and none of them
existed in the repo or anywhere on disk. The only copy was inside
`docs/plan/PLAN-v4.0.pdf`.

## What was done

The figures were copied out of the PDF as the **original embedded rasters**, not
re-rendered from page scans, so nothing was resampled or upscaled:

```bash
pdfimages -png docs/plan/PLAN-v4.0.pdf docs/evidence/phase0/plan-img/raw
```

`pdfimages -list` shows 17 images, all at print resolution for the size the plan
prints them:

| # | PDF page | Pixels | ppi in the PDF | File here |
|---|----------|--------|----------------|-----------|
| 1 | 9  | 2619×3180 | 624 | `f01-big-picture.png` |
| 2 | 11 | 780×1688  | 360 | `s-home.png` |
| 3 | 11 | 780×1688  | 360 | `s-duel.png` |
| 4 | 11 | 780×1688  | 360 | `s-reveal.png` |
| 5 | 12 | 780×1688  | 360 | `s-game.png` |
| 6 | 12 | 780×1688  | 360 | `s-doctor.png` |
| 7 | 12 | 780×1688  | 360 | `s-luck.png` |
| 8 | 13 | 4116×4818 | 691 | `f08-aws-map.png` |
| 9 | 15 | 759×3537  | 580 | `f09-purchase.png` |
| 10 | 15 | 666×3672 | 602 | `f10-vote.png` |
| 11 | 16 | 2700×1200 | 433 | `chart-traffic.png` |
| 12 | 17 | 4152×1380 | 613 | `f12-gantt.png` |
| 13 | 41 | 3678×3531 | 734 | `f13-ingestion.png` |
| 14 | 42 | 4152×813  | 613 | `f15-lakehouse.png` |
| 15 | 43 | 4152×2022 | 666 | `f14-commit.png` |
| 16 | 49 | 4152×1431 | 639 | `f17-edge.png` |
| 17 | 52 | 4152×2340 | 639 | `f16-daily.png` |

The mapping was not guessed from file order alone: every name was checked against
the figure caption on its page. For example page 42 is §3.2's lakehouse table
(`f15-lakehouse`, 4152×813 — a wide short band, which matches), and page 49 is
§3.13's CloudFront/edge diagram (`f17-edge`).

## What is still lost

The **editable sources**: the Mermaid `.mmd` files and the chart HTML that drew
figures 8–12. Without them these five diagrams can only be replaced, not edited.

So this is option **B** of PIP-14, and it is now the **recorded board decision**
(2026-10-20, comment on PIP-14). Option **A** — also committing diagram sources — was
declined: the v4 source has no Mermaid blocks to commit. See `g1-v4-build.md`.

## How to use it

```bash
# when S0.1 (PIP-37) lets us write to the tracked tree:
mkdir -p docs/plan/img
git mv docs/evidence/phase0/plan-img/*.png docs/plan/img/   # or: cp
```

Then `tools/make_plan_md.py` needs a v4.0 mode (accept the Typst cover block,
skip the Mermaid step). That is a `tools/` code change and is a separate task,
blocked by PIP-37.

## Reproduce

```bash
pdfimages -list docs/plan/PLAN-v4.0.pdf     # 17 images, pages/ppi as the table
pdfimages -png docs/plan/PLAN-v4.0.pdf <empty-dir>/raw
```

Exit code 0 on both; the 17 files above are byte-for-byte what it writes.
