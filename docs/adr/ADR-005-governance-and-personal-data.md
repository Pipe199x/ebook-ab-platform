# ADR-005 · Governance and personal data: Unity Catalog for data, IAM for AWS

- **Status:** Draft (Phase 0, P0-11). Becomes *Accepted* when probes P2, P3, P7 and P8 pass (or their fallbacks are recorded), Security reviews it, and the VP of Engineering merges it.
- **Date:** 2026-10-19 · **Author:** Architect (draft), Documenter (edit) · **Review:** Security (identity, secrets, PII, IAM, Unity Catalog)
- **Plan refs:** D11, D15, D16, D45, D48, D56, D59; §3.9 (PII), §3.15, §3.18; O2, O7, O8, O23, O26, O34

## What this decides

Each platform guards what it holds. Unity Catalog guards the tables; IAM guards the AWS resources. Clear personal data exists only in Bronze. No long-lived AWS key exists outside the owner's laptop.

```
Bronze  clear email/phone/document ── column mask ──► only pii_readers see clear values
   │
Silver  keyed SHA-256 (pepper) for joins + masked display column (f.s•••@example.com)
   │     expect_or_fail(no_clear_pii) stops the update on a leak
Gold    no personal data ──► bi_readers: SELECT on <catalog>.gold only
```

## The rules

| # | Rule | Where it lives |
|:--|:--|:--|
| G1 | Clear PII only in Bronze, behind column masks; only `pii_readers` unmask. | `resources/grants.yml`, mask functions in `<catalog>.ops` |
| G2 | Silver join keys = `sha2(concat(pepper, ':', normalized), 256)`; the pepper sits in secret scope `ebook`, key `pii_pepper`. | `src/ebook_ab/transforms`, bundle |
| G3 | `no_clear_pii` is an `expect_or_fail` rule in Silver. | `config/quality/*.yml` |
| G4 | Gold has no PII; `bi_readers` get `SELECT` on Gold only. | `resources/grants.yml` |
| G5 | Every sensitive column tagged `pii`, `ley_1581`, `ley_1266`, `purpose`. | tags in the bundle; data dictionary |
| G6 | One IAM role per job, least privilege: `gha-ci` (read-only synth), `gha-deploy` (main only), `gha-pipeline` (its prefixes), `edge-*` (Duels table, covers, salt). | `infra/stacks/ci.py`, `edge.py` |
| G7 | GitHub → AWS by OIDC only, trust scoped to `Pipe199x/ebook-ab-platform` and, for deploy, `refs/heads/main`. Never access keys. | `infra/stacks/ci.py` |
| G8 | GitHub → Databricks: workload identity federation for `sp-ebook-ci`; else SP OAuth secret; else a PAT ≤ 90 days (D48). | GitHub environment |
| G9 | Visitor IPs never stored: `HMAC(daily salt, date + IP + Duel)`; the salt is in Parameter Store (SecureString, AWS-managed key) and destroyed daily (D56). | `edge/`, `lambdas/salt_rotate` |
| G10 | No IP addresses or clear personal data in logs, tasks, comments or code outside Bronze. CloudFront access logs stay off; Lambdas never log headers or bodies. | `edge/` logging helper; review checklist |

## Options considered

| Option | Verdict |
|:--|:--|
| **Unity Catalog (data) + IAM (AWS)** | **Chosen** (D45). |
| AWS Lake Formation | Rejected: the tables live in Databricks, so Lake Formation would guard nothing real. |
| Hash in Bronze, no clear data at all | Rejected: the project wants to show masking and an audit group; Bronze keeps the raw record for replay. |
| Shared admin token for moderation | Rejected (D59): IAM-signed admin function URL instead. |
| IAM Identity Center for the owner | Wanted, but not on the Free plan; revisit after S1.1. |

## Fallbacks (if a probe fails)

| Probe | Fails | Then |
|:--|:--|:--|
| P2 / O2 | Groups or catalogs can't be created | Default catalog with schema prefixes; grants per user (D14). |
| P3 / O34 | No workload identity federation | SP OAuth secret, else PAT ≤ 90 days, stored as a GitHub environment secret (D48). |
| P7 / O8 | Column masks unsupported on streaming or AUTO CDC targets | Masked columns written at Silver; grants only; the clear Bronze columns kept off every grant except `pii_readers`. |
| P8 | Role works outside its prefixes | Fix the trust or permission policy; never fall back to keys. |

## Open legal points (not blocking Phase 0)

- O23: does the daily-salted hash need a notice under Ley 1581? The Methods page explains it either way (Phase 1).
- O26: US adequacy for international transfer, before S1.1.

## Evidence to attach in Phase 0

P2 (catalog, groups, scope created), P3 (which identity option worked), P7 (mask, tags, Gold-only grant, lineage screenshot), P8 (refusal log outside prefixes), and the cdk-nag + IAM Access Analyzer output for the `foundation` and `ci` stacks.
