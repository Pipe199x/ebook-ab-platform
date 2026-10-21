# Operator evidence · demo click-through (PIP-41, re-run of PIP-15 / G3 follow-up)

Operator run, 2026-10-19. Read-only: no console change, nothing sent anywhere, no page in this check reaches the network.

## What was run

```
wsl -e bash -lc "cd /mnt/d/abtesting && NODE_PATH=~/.local/opt/mmdc/node_modules \
  node tools/check_demo.cjs docs/evidence/phase0/operator-demo/shots \
  docs/evidence/phase0/operator-demo/review"
```

- Demo under test: `docs/plan/DEMO.html`, 429,363 bytes,
  `sha256 97745723c7ed31b77ea2c7c2c871bdb1dc621fd4b793d5e60b0ca6b9510681d0`
  (committed, branch `main`, commit `cf2b8ad`; `git status` clean for this file).
- Harness: headless Chrome via puppeteer in WSL, node v24.22.0.
- The checker fails on any non-`file://` request, any console error, any page error and sideways scrolling.

## Result: PASS (exit 0)

Program output:

```
duel: Readers chose version B. (p = 6.20e-6)
duel scenarios: almost the same -> close; broken split -> unfair
ad doctor: {"stop":8,"keep":2,"luck":6,"wait":8,"save":142}
upload: a 1000x560 chart becomes a 9 KB cover
ok: screens in .../operator-demo/shots
```

This confirms, by clicking through the real demo:

| Screen / flow | What the run proved |
|:--|:--|
| Home (phone + desktop, EN + ES) | opens on `home`, paper background, hero painting inlined as data URI, no sideways scroll |
| Menu | opens, lists the tools, closes after a choice |
| Duel, start to verdict | target 330 readers; scenario "almost the same" → close; "broken split" → unfair; result `p = 6.20e-6` |
| Ad Doctor | example report → Stop 8 / Keep 2 / Luck 6 / Wait 8, saving 142 — the same numbers as the plan's example |
| Real or luck? | verdict screens captured |
| Upload flow | a 1000×560 chart shrunk in-page to a 9 KB cover |
| For nerds (EN/ES, phone/desktop, dark) | hybrid map drawn; §3.0 verdict table row for row; every card has its "Why" line |
| Network | zero requests outside `file://`, zero console/page errors |

## Screens saved (30 PNGs, 9.1 MB)

- `shots/` (19) — the screens `docs/plan/shots/` and `docs/plan/answers/figs/` expect:
  `ls-home`, `ls-desktop-home`, `ls-desktop`, `ls-create`, `ls-progress`, `ls-play`,
  `ls-reader`, `ls-es-home`, `ls-es-reader`, `ls-reveal`, `ls-verdict`, `ls-unfair`,
  `ls-thanks`, `ls-link`, `ls-luck`, `ls-card`, `ls-doctor`, `ls-doctor-stop`, `nerds-map`.
- `review/` (11) — extra screens no document uses, for a human look:
  full-page phone/desktop, dark mode, phone menu, nerds phone/desktop/ES/dark.

## Findings

1. (low, cosmetic, pre-existing) On desktop the "DynamoDB → daily export" line passes
   under the GITHUB and SOURCES zone labels in the nerds map — same as v3.0; visible in
   `review/nerds-desktop.png`. Not a regression.
2. (note) The check only runs in WSL: from Windows `node tools/check_demo.cjs` fails
   with `Cannot find module 'puppeteer'`. Already documented in the script header.

## Not done here

- All 30 screens were regenerated on 2026-10-19 from the committed `main` tree at
  `cf2b8ad`; the hash above matches the current file byte for byte.
- The `docs/evidence/` folder is still untracked in git (`?? docs/evidence/`). Committing
  it is a repo change (STOP S0.1) — the board decides; nothing was committed here.
- No console, app or site outside the local file was touched. No approval needed, none
  requested.
