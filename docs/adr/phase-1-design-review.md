# Phase 1 design review: every design question, with a proposed decision

- **Task:** P0-12 (PIP-22) · **Status:** Draft for VP review · **Date:** 2026-10-19 · **Author:** Architect
- **Scope:** Phase 1 "Lifesaver launch" (§5), the Duel service and site (§3.13), D34–D37, D49, D50, D53, D56, D59, D60.
- **Rule:** each question ends as an ADR (007 or 009) or a decision-log line before coding starts. Proposals that would change a D-decision are marked **BOARD** and need the board's call.

## At a glance

| # | Question | Proposed decision | Lands in | Needs |
|:--|:--|:--|:--|:--|
| Q1 | DynamoDB free capacity is 25 WCU/RCU **per account and region**, and D49 gives prod alone 25 (20 + 5). Where does dev go? | Split it: prod table 16/16 + index 4/4; dev table 4/4 + index 1/1 = 25. Day-to-day tests use DynamoDB Local. | D49 amendment | **BOARD** |
| Q2 | AWS docs: "new accounts have reduced concurrency and memory quotas" for Lambda (the exact number isn't published; users report 10). Reserved concurrency 10 on `duel-api` may then be impossible. | Read `aws lambda get-account-settings` in P1. If `ConcurrentExecutions` < 100, request the free raise; until then, no reserved concurrency, and the WAF rate rule plus DynamoDB throttling are the brakes. | P1 evidence; ADR-009 | VP |
| Q3 | WAF costs money outside the flat-rate plan; dev can't use flat-rate before S1.1. | WAF only on the prod flat-rate distribution (Free tier includes 5 WAF rules). Dev distribution is pay-as-you-go inside CloudFront's perpetual free tier, no WAF. Allow-list: `WAFv2::WebACL` only in prod. | ADR-010 + ADR-007 | VP |
| Q4 | Lambda behind CloudFront sees CloudFront's IP, not the reader's. How does the vote hash get the IP? | Origin request policy forwards `CloudFront-Viewer-Address`; the Lambda uses only its IP part, hashes it, and never logs it. | ADR-009 | Security |
| Q5 | OAC signs requests to the function URL with SigV4 in `Authorization`, overwriting it. Where does the owner key travel? | Custom header `x-owner-key`. The private link carries the key in the URL **fragment** (`#k=…`), so it never reaches CloudFront logs or the server's URL. | ADR-009 + contract | Security |
| Q6 | Vote = dedup marker + vote item + counter. They're separate writes; a transaction would double the WCU (6 per vote). | No transaction. Order: (1) conditional `PutItem DEDUP#…`; (2) `PutItem VOTE#<ulid>`; (3) `UpdateItem` `ADD` on META counter. **VOTE items are the source of truth**; META counters are a cache that `close_duel` recomputes. If (2) fails, delete the DEDUP marker and return 503. | ADR-009 | VP |
| Q7 | §3.13 says `VOTE#<seq>`. A sequence needs one more write per vote. | Use `VOTE#<ulid>` (time-ordered, generated in Lambda). No extra write. | Decision line | VP |
| Q8 | Race at the 330th reader. | Counter update returns `UPDATED_NEW`; the call that sees ≥ 330 sets `status=CLOSED, ended_at=now` with condition `status = OPEN`. Every vote's step (1) also checks `status = OPEN` by reading META first. Overshoot ≤ in-flight requests is accepted; the result uses all votes with `ts ≤ ended_at`. | ADR-009 | VP |
| Q9 | Creating a Duel writes DynamoDB and starts a Step Functions execution: what if the second fails? | Execution name = `duel_id` (names are unique for 90 days, so a retry can't start two). Put META, then `StartExecution`; on failure delete META and return 503. | ADR-009 | VP |
| Q10 | Who computes the ending (D34): server or browser? | Server, once, at close: `close_duel` computes the ending with the shared TS stats module and stores `ending`, counts, CI and SRM p on META. The result route serves it; the browser only renders. One answer, exported as-is to the lakehouse later. | ADR-009 | VP |
| Q11 | Export index (5 WCU): every write to an indexed item also writes the index. Counter updates would eat it. | GSI on `export_day`, **KEYS_ONLY**. Counter updates don't touch it. Set `export_day` on items from day one, so Phase 3's first export can backfill everything since launch. | ADR-009 | VP |
| Q12 | Salt rotation at 00:00: votes at 23:59:59 vs 00:00:01. | Parameters keyed by date: `/ebook/<stage>/salt/<YYYY-MM-DD>`. At 00:00 UTC the rotation creates **tomorrow's** salt and deletes **yesterday's**, so today's always exists. Lambda caches a salt ≤ 5 min, keyed by date. | ADR-009 | Security |
| Q13 | Daily caps (5 Duels, 5 shares per visitor). | `DEDUP#HMAC(salt, date + IP + "create")` with `ADD n 1` and condition `n < 5`; TTL 24 h. Same pattern for shares. | Decision line | VP |
| Q14 | Covers: upload checks and deletion visibility. | Presigned POST, 10-min expiry, key `covers/<duel>/<arm>`, `content-length-range 1..307200`, `Content-Type` starts-with `image/`. CloudFront TTL on `/covers/*` = 1 day; `delete_covers` also invalidates `/covers/<duel>/*` (1,000 free paths a month). | ADR-009 | VP |
| Q15 | Request contracts (my area: JSON contracts). | `contracts/duels/`: `duel_create.request`, `duel_create.response`, `duel.response`, `vote.request`, `progress.response`, `result.response`, `library_optin.request`, `report.request`; draft 2020-12; each has `schema_version`. Validated with Ajv in `edge/` and `web/` from the same files. `contracts/site/`: `library.json`, `freshness.json` for the frozen snapshot. | ADR-004 (early line) | VP |
| Q16 | Stored items will be exported in Phase 3. Do they need a version now? | Yes: every item carries `schema_version`; the export contract (`contracts/export/duel.v1`, `vote.v1`) is drafted in Phase 1 so stored items already match it. | Decision line | VP |
| Q17 | Votes collect from Phase 1, but the export that drops visitor hashes comes in Phase 3. Is holding hashes for weeks OK? | Yes, with a reason on record: the salt is destroyed after a day, so stored hashes can't be linked to an IP (D56). The Methods page says so (O23). | Decision line | Security |
| Q18 | How is the writer's own device kept out (D34)? | On create, the browser stores the Duel id in `localStorage`; the reader page skips the vote for those ids. Version choice: hash(duel_id + local random) with the random kept in `localStorage`, so a reload shows the same version. The split check (SRM) catches bias. | ADR-009 | VP |
| Q19 | Throttling behaviour. | SDK max 2 retries; on `ProvisionedThroughputExceeded` return 429 + `Retry-After: 30`; the site shows "Lots of readers right now…". | Decision line | VP |
| Q20 | Logs and privacy. | CloudFront standard logs off. Lambda logs a fixed field list (route, status, latency, duel_id); never headers, IPs, bodies or owner keys. Log retention 14 days. | ADR-009 | Security |
| Q21 | CloudFront `/v1/*` behaviour settings. **Corrected 2026-10-19:** the flat-rate Free tier does **not** include custom origin request or cache policies (only AWS-managed "default" rules). | Use the managed origin request policy `AllViewerExceptHostHeader` (`b689b0a8-53d0-40ab-baf2-68738e2966ac`) — it exists for Lambda function URL origins and forwards `CloudFront-Viewer-Address`. For caching, use the managed `CachingDisabled` policy if the Free tier accepts it; P9 checks this. Methods ALL; OAC for Lambda. `/covers/*` → covers bucket OAC; default → site bucket OAC. Free tier allows 5 cache behaviours; we use 3. | ADR-007 | VP |
| Q22 | Which Lambda runtime and architecture? | Latest Node.js LTS that Lambda supports on the day Phase 1 starts, pinned; `arm64`. | Decision line | VP |
| Q23 | §3.13 lists `POST /v1/results` and `/v1/withdraw`; Phase 1 doesn't. | Not in Phase 1; they ship with the ad-results reader in Phase 7. The library check box in Phase 1 only stores `in_library=true`. | Decision line | VP |
| Q24 | Shared TS stats between `web/` and `edge/`. | One package `web/src/stats` (no dependencies) imported by `edge/` through an npm workspace; vectors in `tests/vectors/*.json` generated by scipy. | ADR-007 | VP |
| Q25 | Step Functions free transitions (4,000/month) are shared by dev and prod. | Dev runs with 5-minute waits and is limited to fixtures (≤ 20 executions a month ≈ 120 transitions). Count recorded in P11 (O33). | Decision line | VP |
| Q26 | **New, from verification:** flat-rate pricing plans are unavailable to accounts "using AWS Free Tier", and the plan needs a WAF Web ACL attached. Phase 1's acceptance says the distribution must show "Free (flat-rate)". | P9 runs right after S1.1 (paid plan) and checks three things before any prod deploy: the account is no longer flagged as using the Free Tier; a Free flat-rate plan can be attached to an existing distribution; a WAF Web ACL is attached as the plan requires. If it fails, Phase 1 launches on pay-as-you-go inside CloudFront's perpetual free tier and the flat-rate switch becomes a follow-up; that changes D50 and needs the board. | P9 evidence; ADR-007 | **BOARD if it fails** |

## Verification (2026-10-19)

Checked against AWS's own pages, because Q1–Q4, Q21 and Q26 rest on AWS limits:

| Claim | Result | Source |
|:--|:--|:--|
| DynamoDB free tier = 25 WCU/25 RCU, "per-Region, per-payer account basis", shared across all tables | **Confirmed** — Q1 stands (dev + prod can't both exceed 25). | aws.amazon.com/dynamodb/pricing |
| New AWS accounts get reduced Lambda concurrency; reserved concurrency comes out of account total, 100 always left unreserved | **Confirmed in direction; exact number unpublished.** Docs say "reduced concurrency and memory quotas"; community reports 10. P1 must read it. | docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html |
| Flat-rate Free tier includes WAF (5 rules), OAC, S3 5 GB, 1 M requests / 100 GB, no overage | **Confirmed.** | docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html |
| Flat-rate Free tier allows **custom** origin request / cache policies | **FALSE — corrected.** Free, and Pro, only include AWS-managed "default" rules. Q21 now uses `AllViewerExceptHostHeader`. | same page, feature table |
| Flat-rate plans available to an account "using AWS Free Tier" | **FALSE — new risk.** The docs list this as an account-level exclusion; and a plan "requires" a WAF Web ACL. Q26 added; P9 must check it. | same page, "Unsupported features" |
| `CloudFront-Viewer-Address` is forwarded by `AllViewerExceptHostHeader`, and can be added by origin request policy (not cache policy) | **Confirmed.** | using-managed-origin-request-policies.html; adding-cloudfront-headers.html |

Not checked today: S3, Step Functions, EventBridge Scheduler and SSM free allowances, and the 1,000-paths-a-month invalidation allowance used in Q14. P1–P12 cover those.

## Items that need the board

- **Q1 changes D49's capacity numbers.** Without it, any dev table on AWS pushes the account over the free 25 WCU/RCU and bills (provisioned capacity is charged by the hour). Alternative if the board keeps D49: no dev table on AWS at all, and dev tests run only on DynamoDB Local.

## What goes into which ADR

- **ADR-007 (static site + daily export):** Q3, Q21, Q24, Q26, plus the frozen snapshot contract (Q15 part).
- **ADR-009 (Duels on Lambda + DynamoDB + Step Functions):** Q2, Q4–Q6, Q8–Q12, Q14, Q18, Q20.
- **Decision-log lines:** Q7, Q13, Q16, Q17, Q19, Q22, Q23, Q25.
