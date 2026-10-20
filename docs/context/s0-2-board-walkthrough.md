# S0.2 · First-time AWS + Databricks setup, click by click

> For the board. About 25 minutes. Plan v4.0 §5 Phase 0 step 4. Nothing here needs an agent; no agent may run it for you.
>
> **Never paste a key, password, token or account ID into a task, a comment or a chat.** The only thing this task needs back is the O27 answer (below) and the word "done".

## 1. Sign up on the Free plan — DONE 2026-10-20

Verified from the API: `accountPlanType: FREE`, `accountPlanStatus: ACTIVE`, `accountPlanRemainingCredits: 100.00 USD`, expiry 2027-04-20. **O27 answer: the sign-up did ask for a card**, and granted $100. Skip to §2.

## 2. MFA on the root user (~3 min)

1. Sign in as the root user (the e-mail you just registered with).
2. Top-right account menu → **Security credentials**.
3. **Multi-factor authentication (MFA)** → **Assign MFA device** → authenticator app → scan the QR → enter two consecutive codes → done.
4. Stay on that page for step 3.

## 3. Create `andres-admin` — DONE 2026-10-20

Created by an agent with your go-ahead on the root session: user `andres-admin`, `AdministratorAccess` attached, console login profile set with a forced password reset, account alias `ebook-ab` (sign-in URL `https://ebook-ab.signin.aws.amazon.com/console`).

1. Your first password is in `C:\Users\Horse\andres-admin-first-password.txt`. Open it, sign in at the URL above as `andres-admin`, and set a new password — then **delete that file**.
2. **Enroll MFA for `andres-admin`** — IAM → Users → `andres-admin` → Security credentials → Assign MFA device. This is the one agent step left: nobody can scan a QR on your behalf.

## 4. CLI profile `ebook` on this laptop (~2 min)

The profile currently signs in as **root**. Re-point it at the IAM user:

```powershell
aws login --profile ebook --region us-east-1
```

Sign in as **`andres-admin`** with your new password + MFA, then verify:

```powershell
aws sts get-caller-identity --profile ebook
```

The ARN must end in `:user/andres-admin`. If it still says `:root`, the browser reused the root session — sign out of the console first, or run the command in a private window.

## 5. Databricks login (~2 min)

```powershell
databricks auth login --host https://<your-workspace>.cloud.databricks.com
```

It opens the browser; sign in to Free Edition; the CLI saves an OAuth session (no long-lived token on disk). Then note, for the record only:

- the workspace URL,
- its region (shown in the workspace's account/region badge).

Then confirm the CLI sees it:

```powershell
databricks current-user me
```

## 6. Agent toolkit for AWS (already installed — 2026-10-20)

The agents' AWS toolkit is configured (evidence: `docs/evidence/phase0/s0-2-agent-toolkit.md`): 21 `aws-*` skills in `~/.claude/skills/`, an `aws-mcp` server entry in `~/.claude.json` (healthy) pinned to profile `ebook`, and the AWS guidance rules in `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` and `~/.cursor/rules/`. Nothing further is needed from you — restart your AI tool so it loads the new skills and rules.

## 7. What to comment back

One line is enough:

```
done — O27: card? <yes/no>; credits: $<n>; P1 services listed? <yes/no/which missing>; workspace region: <region>
```

Do **not** include the account ID, keys or the workspace URL.

## If something goes wrong

- Sign-up asks for a card on the Free plan → stop, note it as the O27 answer, and comment; the plan's fallback is to take that up at S1.1 rather than now.
- Phone verification fails → the account is not created; comment and the board retries later.
- `aws sts get-caller-identity` says `InvalidClientTokenId` → the key was copied with a trailing space; re-run `aws configure --profile ebook`.
- `databricks auth login` opens no browser → add `--no-browser` and paste the printed code in the browser yourself.

## What this unblocks

PIP-27 (P0-4 guardrails, the first stack that spends anything), PIP-29 (P0-6 bundle skeleton), and through them P0-5, P0-7, P0-8.
