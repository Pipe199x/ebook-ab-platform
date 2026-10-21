# ADR-002 · Where Kafka runs

- **Status:** Draft (Phase 0, P0-11). Becomes *Accepted* when probes P4, P8 and P12 pass and the VP of Engineering merges it.
- **Date:** 2026-10-19 · **Author:** Architect (draft), Documenter (edit)
- **Plan refs:** Q18, Q22, D4, D9, D19, D52, D62; §3.1, §3.3, §3.7, §4.1; risk R31

## What this decides

Kafka carries the simulated store's events only. It runs as a throwaway container: Docker on the laptop for development, and an `apache/kafka:4.2.2` service container inside GitHub Actions for CI, the backfill and the daily run. Nothing about Kafka runs on AWS or any hosted Kafka service.

```
GitHub Actions run (≈20 min/day)
 ┌────────────────────────────────────────────┐
 │ kafka:4.2.2 ─► simulator ─► bridge ────────┼──► S3 landing/ ──► sync ──► UC volume
 │                       └──► guardrail-monitor (alerts ─► market.ops.v1)   │
 └────────────────────────────────────────────┘  (container is thrown away; offsets live in S3 keys)
```

## Why

| Need | How this design meets it |
|:--|:--|
| \$0 | GitHub Actions is free for a public repo. MSK Serverless ≈ \$548/month; MSK and Kinesis aren't on the Free plan; Kafka on Fargate ≈ \$0.03/day with no free allowance. |
| Per-shopper order | 5 topics × 2 partitions, keyed by `user_id` (§3.5). |
| Several independent readers | Two consumer groups: `lakehouse-bridge` and `guardrail-monitor` (§3.7). |
| Nothing lost or repeated across restarts | The bridge commits offsets only after a durable S3 upload, and names each object by (topic, epoch, partition, first–last offset). See the idempotency rule below. |

## The idempotency rule this ADR owns

1. **One epoch per Kafka life.** Each run sets `epoch = gha-<run_id>` (laptop: `dev-<utc-timestamp>`). Offsets restart at 0 with every new container, so the epoch is part of every key. Two runs can never collide.
2. **Key = coordinates.** `landing/<stage>/<topic>/<epoch>/<partition>/<first>-<last>.jsonl.gz`. Ranges in one epoch and partition never overlap.
3. **Same input → same bytes.** gzip with a fixed mtime (0) and no file name in the header, records in offset order, one trailing newline. A re-upload writes an identical object.
4. **Commit after upload; reconcile on assign.** On partition assignment the bridge lists that partition's prefix in S3 and seeks past the highest uploaded offset (§3.3).
5. **Downstream never overwrites.** The sync uploads with `overwrite=false`, and Auto Loader runs with `allowOverwrites=false` (D41, D62).

## Options considered

| Option | Verdict |
|:--|:--|
| **GitHub Actions service container + laptop Docker** | **Chosen** (Q18). |
| Kafka on ECS Fargate per run | Rejected for cost; it is the exit plan (below). |
| Amazon MSK / MSK Serverless | Rejected: not on the Free plan; ≈ \$548/month. |
| Aiven free tier (v3.0) | Removed with Path A (D52). |
| Kinesis or DynamoDB Streams instead of Kafka | Rejected (Q22): loses the Kafka learning goal; not free in the way we need. |
| Kafka for Duel votes | Rejected (Q22, D30): would need an always-on broker for a few hundred votes a day. |

## Consequences

- Kafka is never durable beyond one run. **S3 is the replay log** (D62); a lost container loses nothing that was uploaded.
- Topic retention (72 h) is irrelevant in CI, since the broker lives under an hour; it matters only on the laptop.
- The daily run must drain the topics and exit; the bridge stops at the end offsets (§3.7).
- Risk R31: if GitHub's terms or limits get in the way, **exit plan** = the same image on ECS Fargate, started by the workflow per run. It costs money, so it needs a board decision before use.

## Evidence to attach in Phase 0

| Probe | What to paste here |
|:--|:--|
| P4 | Files API: 100 uploaded, then 0 on the second run; Auto Loader reads 100, then 0. |
| P8 | The workflow assumes `gha-pipeline`, writes under `landing/`, and is refused outside it. |
| P12 | S3 requests per run and month-to-date cost (O31). |
| (Phase 3) | The kill test `--crash-after-upload 3`: 0 duplicate coordinates, 0 offset gaps. Linked here when it runs. |
