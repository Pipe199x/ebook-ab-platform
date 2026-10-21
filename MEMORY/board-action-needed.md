---
name: board-action-needed
description: Board must complete AWS Free plan sign‑up, root MFA, admin user, profile switch, and Databricks login for Phase 0.
metadata:
  type: user
---
**Why:** Phase 0 blocked on PIP‑38; guardrails, profile, and Databricks login required before any engineering work can proceed.
**How to apply:** Board should follow `docs/context/s0-2-board-walkthrough.md`, enable MFA, create `andres-admin`, re‑run `aws login --profile ebook`, then `databricks auth login`.
