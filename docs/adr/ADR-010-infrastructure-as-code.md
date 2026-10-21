# ADR-010 · Infrastructure as code: AWS CDK + Databricks bundles, with a \$0 allow-list

- **Status:** Draft (Phase 0, P0-11). Becomes *Accepted* when P0-4, P0-5 and P0-6 pass and the VP of Engineering merges it.
- **Date:** 2026-10-19 · **Author:** Architect (draft), Documenter (edit) · **Review:** Security (IAM roles in `ci` stack)
- **Plan refs:** D47, D48, D53, D55, D61; §3.15, §3.17; Phase 0 steps 5–7

## What this decides

Every resource on both platforms is reviewed code, each in its platform's native tool:

| Platform | Tool | Units |
|:--|:--|:--|
| AWS | CDK v2, Python | stacks `foundation`, `ci`, `edge`, `site`, `lab`; stages `dev`, `prod` (`-c stage=`) |
| Databricks | Declarative Automation Bundles (`databricks.yml` + `resources/`) | pipeline, Job `ebook_daily`, schemas, volume, secret scope; targets `dev` → `ebook_ab_dev`, `prod` → `ebook_ab` |

## The \$0 guardrail (D53)

`tools/check_free_allowlist.py` runs on every `cdk synth` in CI and fails the build when any **production** stack template contains a resource type outside the allow-list.

- **Allowed (draft list):** `AWS::S3::*`, `AWS::Lambda::Function|Url|Permission|EventInvokeConfig`, `AWS::DynamoDB::Table` (only with `BillingMode: PROVISIONED` and auto scaling off), `AWS::StepFunctions::StateMachine` (`STANDARD` only), `AWS::Scheduler::Schedule`, `AWS::CloudFront::*`, `AWS::WAFv2::WebACL` (only attached to the flat-rate distribution, see Phase 1 review Q14), `AWS::SNS::Topic|Subscription`, `AWS::SSM::Parameter`, `AWS::IAM::*`, `AWS::Logs::LogGroup` (retention ≤ 14 days), `AWS::Budgets::*`, `Custom::*` CDK helpers, `AWS::CDK::Metadata`.
- **Property checks**, not just types: on-demand DynamoDB, Express state machines, log groups without retention and provisioned concurrency all fail.
- **The `lab` stack is excluded** and is deployed by hand only, then destroyed (D61).
- Test: a branch that adds `AWS::Glue::Job` to a prod stack must fail (Phase 0 acceptance).

Plus: cdk-nag on every synth; `databricks bundle validate` on every PR; the CDK diff posted on the PR; prod deploys only from `main` through `gha-deploy`, with the board's OK (S1.1).

## Options considered

| Option | Verdict |
|:--|:--|
| **CDK (AWS) + bundles (Databricks)** | **Chosen** (D47): CDK packages Lambda code; bundles deploy notebooks and pipeline code with the resources. |
| Terraform for both | Good at a company; here two state backends to host and lock, and weaker packaging of code. Kept as the "what I'd do at scale" answer. |
| CloudFormation / SAM only | No Databricks story; weaker abstractions than CDK. |
| ClickOps + scripts | Rejected: no review, no reproducibility. |

## Consequences

- Two tools, two review surfaces; the PR template asks for both diffs.
- CDK bootstrap creates an S3 asset bucket and ECR repo; both are allow-listed as bootstrap resources (ECR stays empty, so \$0). **Check at P0-5** that no image asset is used.
- Free Edition may lack some bundle resource types; P2 records any fallback to CLI calls, kept in `tools/` and documented here.

## Evidence to attach in Phase 0

`cdk synth` with cdk-nag clean; the allow-list failing on the Glue test branch; `databricks bundle validate && deploy -t dev` green; `describe-budgets` → 2.
