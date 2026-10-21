# P0-9 · Real-data probe — evidence

Owner: Data Scientist. Date: 2026-10-20. Plan v4.0 §5 Ph0 step 9; acceptance "the real-data counts match the sources".
Code: `src/ebook_ab/realdata/check.py`. Unit test: `tests/realdata/test_check.py`.

## Command

```
uv run python -m ebook_ab.realdata.check
```

Data lives outside the repo (both files are large and gitignored: `tmp/data/`, or set `EBA_DATA_DIR`).

## Output

```
upworthy rows=22666 tests=4873 bytes=14260949 md5=ee2bcfd3855fd721cfcedbef006bf21f
gutenberg records=10
  10000       2335 en The Magna Carta
  10001       1319 en Apocolocyntosis
  10002      11261 en The House on the Borderland
  10003        509 en My First Years as a Frenchwoman, 1876-1879
  10004        571 en The Warriors
  10005        691 en A Voyage to the Moon
  10006        565 en La Fiammetta
  10007      15403 en Carmilla
  10008        879 en The Mystery
  10009        540 en Wild Northern Scenes; Or, Sporting Adventures with the Rifle
PASS
```

Unit test: `uv run python -m unittest tests.realdata.test_check` → `Ran 3 tests … OK`.

## Sources and hashes (checked 2026-10-20)

| File | Where | Bytes | md5 | sha256 |
|:--|:--|--:|:--|:--|
| `upworthy-archive-exploratory-packages-03.12.2020.csv` | OSF `jd64p`, `upworthy-archive-datasets/` (`https://osf.io/download/3vqmp/`) | 14,260,949 | `ee2bcfd3855fd721cfcedbef006bf21f` | `8368313b060f4015a0c6fb34e6d788163cee29554144aba9390b14922eb9d8ce` |
| `rdf-files.tar.bz2` (Gutenberg offline RDF catalog) | `https://www.gutenberg.org/cache/epub/feeds/rdf-files.tar.bz2` | 126,804,708 | — | — |

Both match Plan §3.12 and §5 Ph0 step 9: 14,260,949 bytes, 22,666 packages, 4,873 tests. License: Upworthy CC BY 4.0 (attribution required), Gutenberg RDF metadata CC0.

## What the check asserts

- exact byte size, md5, row count and distinct `clickability_test_id` count for the Upworthy CSV;
- 10 records parsed from the RDF tarball, each with id, title, downloads and language (streamed, so the 121 MB archive is never unpacked).

Sample record shape: `id` from `pgterms:ebook/@rdf:about`, `downloads` from `pgterms:downloads` (0 when absent), `language` from `dcterms:language/rdf:Description/rdf:value`.

## Data facts useful for Phase 3/6

- Columns: `created_at, updated_at, clickability_test_id, excerpt, headline, lede, slug, eyecatcher_id, impressions, clicks, significance, first_place, winner, share_text, square, test_week` (plus an unnamed index column — drop on ingest).
- No empty `clickability_test_id`; no zero-impression packages (the archive already removed them).
- 4,278 of 22,666 rows (18.9%) fall in the archive's discouraged window 2013-06-25 → 2014-01-10 (`problem = 1` is not shipped as a column in this release; derive it from `created_at`). Phase 6 excludes them, per §3.12.
- `created_at` is a `YYYY-MM-DD HH:MM:SS.mmm` string, timezone unknown (§3.12).
- Exploratory tarball listing order is by ebook id, not downloads; the catalog builder (§7) must sort by `downloads` after parsing.

## Not done / open

- Files are not committed: S0.1 (PIP-37) has not approved repo changes yet. The working tree has `src/ebook_ab/realdata/check.py`, `tests/realdata/test_check.py`, `pyproject.toml` ready to commit.
- The CSV is fetched from OSF by hand here; the Phase 3 path is `aws s3 cp … landing_real/<stage>/upworthy/`, which needs S0.2 (PIP-38).
