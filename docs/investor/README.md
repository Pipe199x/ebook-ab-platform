# Investor demo · Before You Decide

A single self-contained page for showing the product to investors: a Moahu-style brand site
(full-height navy hero, alternating dark/light bands, one artifact per band) wrapped around the
nine working screens of the plan's product.

**Open** `index.html`. It is one file, works offline, and sends nothing anywhere.

## What works

| Screen | Route | Live computation |
|---|---|---|
| Landing pitch | `#/` | — |
| Duel | `#/duel` | Step through create → share → reader vote → result. The result runs a real two-proportion z-test plus an SRM check |
| Which would you read? | `#/play` | Vote and watch the credit counter move |
| Ad Doctor | `#/doctor` | Paste or drop your own Amazon Ads CSV; drop it and the verdicts are recomputed |
| Real or luck? | `#/luck` | Type two sales counts and two day counts; an exact binomial test answers |
| Library & Real lessons | `#/library` | — |
| The test store | `#/store` | — |
| For nerds | `#/nerds` | The plan's architecture map, reused unchanged |
| Where we are | `#/plan` | Zero, roadmap, and the ask |

Every number is computed from the sample data on the page, so an investor can edit an input and
watch the verdict move. The header always carries a `Demo · sample data` chip, and every number
block carries a source badge (`Shared by writers`, `Real public tests`, `Simulated`, `Target`).

## Honesty rules

- All demo data is invented or simulated. Nothing here is real traction.
- `#/plan` states **0 writers · 0 Duels · $0 revenue** and labels each roadmap line for what it is.
- The ask is left as `[amount]` / `[use of funds]` on purpose: no round size is invented.
- No testimonials, logos, press marks or star ratings.
- The Ad Doctor prints a **network receipt** — requests, blocked send attempts, cookies — because
  "the file never leaves your browser" should be checkable, not asserted.

## The statistics, and what they deliberately do not say

Audited against a skeptical due-diligence review. Notable choices:

- **Duel verdict.** A win needs the pooled z-test **and** the unpooled 95% interval to agree; they
  disagree in a thin band around α. "Too close to call" is an equivalence rule (the whole interval
  inside ±15 points), not a point estimate — 15 points is the only margin 330 readers can settle at
  80% power. "More readers" is powered against that fixed margin, never against the observed gap.
  The split check is not judged below 10 readers.
- **Every result states what it measured**: interest in the first page, not sales.
- **p-values are phrased as data frequencies**, bucketed so the wording never understates the chance:
  "If readers liked both versions equally, a gap at least this big would appear about 1 time in 900
  tests like this." (The prototype's flat ladder said "1 time in 20" for p = 0.001, off by 50×.)
- **Ad Doctor.** The prior is Laplace-smoothed and falls back to a neutral 8% below 30 orders, so a
  new book is never told to stop everything by its own prior. Each keyword carries its own minimum
  clicks before "Stop" is arithmetically possible. "Luck" is gated on the posterior. Orders are
  clamped to clicks, accounting negatives parse, and the header row is found by column matching, not
  by looking anywhere for the word "click". Savings are reported gross **and** net of the sales those
  keywords were credited with.
- **Real or luck?** Fractions are rejected rather than rounded; equal rates are compared by integer
  cross-multiplication; a real drop is styled as a drop, not as a win; "N more days" counts only the
  **extra** days, and the sentence carries its own assumption.
- The exact 9 → 30 example is p = 1.065e-3, so it is written as "less than 1 in 1,000" only from
  9 → 31 onward.

## Rebuild

Source lives in `src/`. Edit `src/`, never the built files.

```bash
# inside WSL, from the repo root
python3 -I tools/build_investor.py            # writes both built files
NODE_PATH=~/.local/opt/mmdc/node_modules node tools/check_investor.cjs
```

The build writes two files from the same source:

- `index.html` — complete and offline. Open it directly, or send the file.
- `build/INVESTOR.artifact.html` — the same page without the document wrapper, for an artifact
  host (which supplies its own skeleton).

## Publish

Live at **https://pipe199x.github.io/ebook-ab-platform/**

```bash
bash tools/publish_investor.sh      # rebuilds, then pushes the built page to GitHub Pages
```

`tools/publish_investor.sh` publishes **only the built page** — no `src/`, no `tools/`, nothing
from `docs/plan/` — to `github.com/Pipe199x/ebook-ab-platform`, whose root GitHub Pages serves. It
works in a scratch clone under `tmp/pages-repo/`; `D:\abtesting` itself is not a git repo. The repo
is public because GitHub Pages on the Free plan requires it: the page is unlisted (`robots.txt`),
not private.

The script also writes `d/7KQ2/index.html`, a redirect to `#/duel`, because the demo prints
`https://pipe199x.github.io/ebook-ab-platform/d/7KQ2` as the Duel's share link — that string is a
real URL now.

`tools/check_investor.cjs` clicks through all nine routes at desktop and phone width, fails on any
console error, any request that is not a local file, or sideways scrolling, and asserts the
statistics against fixtures (Ad Doctor 10/2/6/8 and USD 189/month; 9 → 14 not yet, 9 → 31 real; the
Duel win, close, unfair and early cases; the Duel never revealing a winner mid-test).

## Files

| Path | Role |
|---|---|
| `src/investor.html` | Shell; marked stylesheets and scripts |
| `src/body.html` | The landing bands |
| `src/styles.css` | The design system (tokens, bands, components) |
| `src/app.js` | Routes, views, and every statistic |
| `src/abstats.js` | Copied from `docs/plan/render/abstats.js` |
| `src/nerds.js` | Copied from `docs/plan/render/nerds.js` |
| `src/fonts/` | Poppins 400/500/600, EB Garamond, Geist Mono — SIL OFL 1.1 |
| `shots/` | Screens from the last check run |
| `build/INVESTOR.artifact.html` | Built, for an artifact host |
| `index.html` | Built, complete and offline; the file that gets published |
| `../../tools/publish_investor.sh` | Rebuilds and pushes the built page to GitHub Pages |

The design follows the *band system* of [moahu.com.ar](https://moahu.com.ar/) — rhythm, band
alternation, type scale, easing. None of its brand assets, images or copy are used.
