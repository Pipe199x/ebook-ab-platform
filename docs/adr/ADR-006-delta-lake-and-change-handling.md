# ADR-006 · Delta Lake for every table, and how changes are handled

- **Status:** Draft (Phase 0, P0-11). Becomes *Accepted* when probes P2 and P5 pass and the VP of Engineering merges it. The AUTO CDC and mask details are confirmed in Phase 4 (O7, O8).
- **Date:** 2026-10-19 · **Author:** Architect (draft), Documenter (edit)
- **Plan refs:** decision 4 of Round 7, D10, D39, D40, D43, D57, D58; §3.2, §3.6, §3.9, §3.11; O3, O8, O35

## What this decides

Every Bronze, Silver and Gold table is a Delta table, managed by Unity Catalog in Databricks Free Edition, built by one triggered Lakeflow pipeline. Each kind of change gets one native mechanism:

| Change | Mechanism | Table |
|:--|:--|:--|
| New raw files | Auto Loader → append-only streaming table | `bronze.*_raw` |
| Duplicate events | `withWatermark("event_ts","1 hour")` + `dropDuplicatesWithinWatermark(["event_id"])` (D10) | `silver.*_events` |
| A shopper's attributes change | AUTO CDC, SCD type 2, `sequence_by=struct(observed_at, topic, offset)` | `silver.users_scd2` |
| A Duel's status changes | AUTO CDC, SCD type 1 | `silver.duels` |
| A writer withdraws a result | AUTO CDC with `apply_as_deletes` | `silver.community_results` |
| A new analysis result | `MERGE` on (experiment_id, metric, analysis_run_id) | `gold.experiment_results` |
| Aggregates | Materialized views from `config/gold_views.yml` (D57) | `gold.*` (20 views) |

## Why

- **Reproducible decisions.** Each memo records `source_snapshot_id` (table versions); time travel reproduces its numbers.
- **Auditable changes.** Change Data Feed on `experiment_results` shows which decisions changed between runs.
- **Incremental by default.** Each layer reads the one before as a stream; a run handles only what's new.
- **Native and \$0.** On Free Edition serverless, Delta, AUTO CDC and expectations need no setup and no extra service.

## Options considered

| Option | Verdict |
|:--|:--|
| **Delta Lake, UC managed tables** | **Chosen** (decision 4, D39). |
| Apache Iceberg on S3 + Glue catalog | Superseded with Q17 → Q23; Glue/Athena have no free allowance. |
| Plain Parquet | Rejected: no safe updates, deletes or time travel. |
| Custom storage location on our S3 | Not possible on Free Edition; S3 keeps the raw files instead (D62, R20). |

## Rules for engineers

1. Bronze is append-only and **never fully refreshed in prod** (R11). Rebuild in dev from S3.
2. Every risky cast uses `try_` forms (ANSI on).
3. `OPTIMIZE` / `VACUUM` are Lab demos only, on `experiment_results`; materialized views reject them (D58).
4. dev and prod are separate catalogs (`ebook_ab_dev`, `ebook_ab`) with separate pipelines; nothing writes across (A7, D14).
5. Memos must store table versions, not timestamps.

## Consequences

- Workspace loss = rebuild from S3 with the backfill (R20). Time travel history is lost in that case; memos keep their numbers in Git.
- The daily run must fit Free Edition's unpublished daily quota (A6, O35); heavy proofs may move to a weekly run (R2).

## Evidence to attach in Phase 0

| Probe | What to paste here |
|:--|:--|
| P2 | Catalog, schemas and volume created; a bundle deploys a pipeline that writes one Delta table; `DESCRIBE HISTORY` output. |
| P5 | A second (dev) pipeline beside prod under the one-active-pipeline limit (O3); run durations (O35). |
| (Phase 4) | AUTO CDC SCD2 test (one current row per user, contiguous intervals); masks on AUTO CDC targets (O8). |
