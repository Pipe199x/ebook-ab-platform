# S0.2 · AWS Agent Toolkit for AWS — install evidence

Date: 2026-10-20. Owner: Data Scientist (PIP-38). Board request: configure the agent toolkit per `setup-instructions/setup.md`.

> Companion: `docs/evidence/phase0/s0-2-account-verified.md` (Chief of staff, PIP-48) has the independent read-only audit of the account and the Kinesis/D52 finding. This file covers the toolkit install and the IAM user.

## Steps run

| Step | Result |
|:--|:--|
| 1 OS | Windows 10 (`win32`) |
| 2 AWS CLI | already present, `aws-cli/2.38.2` — installer not re-run |
| 3 Login | `aws login --profile ebook --region us-east-1` → browser flow completed; exit 0 |
| 4 Identity | `aws sts get-caller-identity --profile ebook` → returns account + ARN (not recorded here) |
| 5 Toolkit | `aws configure agent-toolkit --yes --region us-east-1 --profile ebook` → 24 skills installed, MCP entry written; command then exited 255 with `[WinError 2]` on its final (post-install) step — install itself succeeded |
| 6 Verify | `aws agent-toolkit list-available-skills --region us-east-1 --profile ebook` → JSON catalog returned |
| 7 Rules | advanced rules (`rules/aws-agent-rules.md`) appended inside `<!-- BEGIN AWS Agent Toolkit rules -->` markers to `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.cursor/rules/aws-agent-toolkit.mdc` |

## What landed

- **Skills**: 21 `aws-*` skill dirs in `~/.claude/skills/` (plus the same set in `~/.agents/skills/` and `~/.cursor/skills/`). Catalogue: bedrock, cdk, cloudformation, compute, containers, database, deployment, iam, messaging-and-streaming, networking, observability, sdk-js-v3, sdk-python, sdk-swift, security, serverless, storage, well-architected-review, blocks, ai-ml, auth.
- **MCP**: `aws-mcp` added to `~/.claude.json` pointing at `https://aws-mcp.us-east-1.api.aws/mcp` via `uvx mcp-proxy-for-aws@latest`, with the required `env: {"AWS_MCP_PROXY_PROFILES": "ebook"}` added by hand (the generated entry falls back to `default`, which does not exist here). `claude mcp list` → **Connected**.
- **Rules**: the "advanced AWS experience" file, since the account is a classic e-mail sign-up, not the new social-provider "project" experience.

## Account state observed (for O27 / P1)

| Check | Value |
|:--|:--|
| Plan | `accountPlanType: FREE`, `accountPlanStatus: ACTIVE` |
| Sign-up credits | **$100.00 USD**, plan expiry 2027-04-20 |
| Card at sign-up | **asked for** (board answer on the O27 card, 2026-10-20) |
| IAM users | **`andres-admin` created 2026-10-20T10:05Z**, `AdministratorAccess` attached, console login profile with reset-required (`get-login-profile` → `PasswordResetRequired: true`) |
| Root MFA | **not enabled** — `AccountMFAEnabled: 0`, no virtual MFA devices |
| `andres-admin` MFA | **not enrolled** — needs an authenticator app, agent cannot scan a QR |
| Account alias | `ebook-ab` → console URL `https://ebook-ab.signin.aws.amazon.com/console` |
| Credentials in use | `aws login` returned **root** credentials for profile `ebook` |

### P1 — all eight services reachable

Read-only list calls against the account, all exit 0 with empty lists:

```
[0] lambda list-functions            [0] cloudfront list-distributions
[0] dynamodb list-tables             [0] s3api list-buckets
[0] stepfunctions list-state-machines [0] sns list-topics
[0] scheduler list-schedules          [0] ssm describe-parameters
```

This is stronger evidence than reading the console's service list: the control plane accepted an authenticated call for each of the eight services the plan needs. **P1's first half passes.** The second half (free allowances staying inside \$0) is P12 and waits on the guardrails.

## Cost

The toolkit itself is **free**: "You can use the Agent Toolkit for AWS at no additional charge. You pay only for the AWS resources your agent provisions or interacts with" (`https://docs.aws.amazon.com/agent-toolkit/latest/userguide/what-is-agent-toolkit.html`, Pricing section, read 2026-10-20). The MCP endpoint in `us-east-1` is the only region offered and is not a billable service. Tools that *provision* resources still spend money — the D53 allow-list and the two budgets stay the guardrail, not the toolkit.

## Open risks

1. **Profile `ebook` currently authenticates as root.** Plan §3.15 says root is for billing and recovery only. This is a consequence of signing the browser in as root. Fix: create `andres-admin`, log in with it, and point `ebook` at that user.
2. **Root MFA is off.** Needs the board's phone/authenticator — an agent cannot enrol a device.
3. `aws login` sessions last 12 h and refresh for up to 90 days; the same 90-day rotation window as the plan's access-key rule.
4. The toolkit's final step crashes with `WinError 2` after doing its work; do not read exit 255 as a failed install.
