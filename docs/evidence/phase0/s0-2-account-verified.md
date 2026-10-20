# S0.2 · AWS account — verified state (2026-10-20 09:45Z)

> Chief of staff (PIP-48). Read-only checks against the real account, not the task description.
> Nothing below prints a credential. Corrections to earlier claims are marked **corrected**.

## What is true now

| Check | Command | Result |
|:--|:--|:--|
| Plan | `aws freetier get-account-plan-state --profile ebook --region us-east-1` | `accountPlanType: FREE`, `accountPlanStatus: ACTIVE`, `$100.00` credits, expires `2027-04-20` |
| Identity | `aws sts get-caller-identity --profile ebook` | `arn:aws:iam::208588111983:root` |
| Region | `aws configure get region --profile ebook` | `us-east-1` (D38 satisfied) |
| Root MFA | `aws iam get-account-summary` → `SummaryMap.AccountMFAEnabled` | **`0` — MFA off** |
| Root access keys | `aws iam get-credential-report` | `access_key_1_active: false`, `access_key_2_active: false` — none |
| Admin user | `aws iam list-users` | **empty** — `andres-admin` does not exist |
| Databricks | `ls ~/.databrickscfg` | **absent** — `databricks auth login` never ran |
| Service reachability | `sns list-topics`, `s3api list-buckets`, `cloudformation list-stacks` | all return empty lists, so the root session reads every service P1 needs |
| Databricks CLI | `databricks --version` | `1.21.0`, installed |
| CDK | `cdk --version` | `2.1145.0`, installed |

**corrected:** earlier notes said S0.2 was "not started". The sign-up *is* done — a Free-plan account exists and the CLI authenticates. What is missing is MFA, the admin user, and Databricks.

O27 (`PIP-38` card `s0.2:o27`, answered 09:32Z): sign-up asked for a card **yes**, credits **$100**, console service access **unknown**.

## Why root matters

`~/.aws/config` holds `login_session = arn:aws:iam::208588111983:root` and the credential source is `aws login` — a session, not a long-lived key, which is the safer of the two. But every script we run would execute as root, and root MFA is off, so the account has neither of the two guardrails plan §5 Ph0 step 4 asks for.

Fix, in this order:

1. Root MFA (`Security credentials` → `Assign MFA device`). **Board hands** — needs the authenticator app.
2. `andres-admin` + `AdministratorAccess` + MFA on that user. Scriptable with the root session already present, but it is an identity change, so it waits on the board's "go".
3. `aws login --profile ebook` **as `andres-admin`**; `aws sts get-caller-identity` must end `:user/andres-admin`.
4. Databricks Free Edition → `databricks auth login` on the board's laptop (browser OAuth).

Steps 1 and 4 cannot be delegated. Steps 2 and 3 can, on a word from the board.

## Proof commands (no secret printed)

```
aws sts get-caller-identity --profile ebook          # want: ...:user/andres-admin
aws iam get-account-summary --profile ebook --query SummaryMap.AccountMFAEnabled   # want: 1
aws iam list-mfa-devices --profile ebook --user-name andres-admin                  # want: one entry
databricks auth describe                                                           # want: logged in
```
