# web — the writer site

Vite + React + TypeScript. Phase 1 scaffold: the Home page (three doors, L5) and
the Duel (create, share, vote, reveal — L1).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

## Verify (the three things "done" means)

```bash
npm run verify     # typecheck -> tests -> build -> no-third-party check -> size check
```

Individually:

| Command | Checks |
|:--|:--|
| `npm run typecheck` | TypeScript, strict |
| `npm test` | Vitest + Testing Library |
| `npm run build` | Vite build to `dist/` |
| `npm run check:third-party` | no request leaves our origin |
| `npm run check:size` | build under 5 MB |

## What is here

| Path | |
|:--|:--|
| `src/pages/Home.tsx` | three doors + the public counter (C11) |
| `src/pages/DuelCreate.tsx` | create + share |
| `src/pages/DuelVote.tsx` | the reader's one question |
| `src/pages/DuelOwner.tsx` | progress without peeking, then the reveal |
| `src/api.ts` | `/v1` routes, same origin |
| `src/shrink.ts` | cover shrunk on the device to 300 KB (D35) |
| `src/visitor.ts` | the version picked on the device; the owner key |
| `src/i18n.ts` | Spanish + English |
| `public/data/library.json` | frozen snapshot, so the site always builds |

## Rules this code keeps

- No analytics, no trackers, no third-party scripts. No request leaves our origin.
- The Ad Doctor's file is never sent anywhere.
- No AWS credential in the browser (D12).
- Spanish and English, light and dark, keyboard and reduced-motion aware (L11).

## Not built yet

The Ad Doctor (L3), Real or luck? (L4), the game (L2) and the library (L6) are
later phases. `/ad-doctor` and `/real-or-luck` say so instead of dead-ending.
