# Fonts for the lifesaver prototype

Latin subsets of three variable fonts, downloaded from Google Fonts on 2026-10-16.
All three use the SIL Open Font License 1.1; each `.woff2` keeps its copyright and license in its metadata.

| File | Family | Role in the page |
|---|---|---|
| `instrument-sans.woff2` | Instrument Sans (weights 400–600) | All interface text |
| `eb-garamond.woff2`, `eb-garamond-italic.woff2` | EB Garamond | Book text: hooks, first pages, the share card |
| `geist-mono.woff2` | Geist Mono (weights 400–500) | Numbers, links and "behind the screen" notes |

`fonts.css` declares them. `tools/build_companion.py` inlines that file, with each font as a data URI, wherever a page has
`<link rel="stylesheet" href="fonts/fonts.css" data-inline>`.
