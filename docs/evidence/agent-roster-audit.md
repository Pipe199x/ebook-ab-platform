# Agent roster audit — PIP-10

Date: 2026-10-20 · Auditor: Chief of staff · Source of truth: `docs/plan/Agent-team-Paperclip.md`

Read live state from `GET /api/companies/{id}/agents` (16 agents) and each agent's
`instructions/AGENTS.md`. Compared against the roster table and setup steps 5–6.

## Result: 16/16 agents present and now conformant

| Agent | Reports to | Model tier | Heartbeat | Assign | AGENTS.md |
| --- | --- | --- | --- | --- | --- |
| Chief of staff (CEO) | board | Top | 24 h | yes | shared + CEO section |
| VP of Engineering | CEO | Top | 2 h | yes | shared + role |
| Product Owner | CEO | Mid | off | no | shared + role |
| Finance controller | CEO | Mid | 24 h | no | shared + role |
| Scrum Master | VP | Mid | 24 h | no | shared + role |
| Architect | VP | Top | off | no | shared + role |
| AWS engineer | VP | Mid | off | no | shared + role |
| Data Engineer (Databricks) | VP | Top | off | yes | shared + role |
| Data Analytics engineer | Data Engineer | Small | off | no | shared + role |
| Data Scientist | VP | Top | off | no | shared + role |
| Backend engineer | VP | Mid | off | no | shared + role |
| Frontend engineer | VP | Mid | off | no | shared + role |
| QA engineer | VP | Mid | off | no | shared + role |
| Security engineer | VP | Top | off | no | shared + role |
| Documenter | VP | Mid | off | no | shared + role |
| Operator (the bot) | VP | Mid | off | no | shared + role |

No agent has "Can create new agents" or "Can create/import skills" — only the board hires.

## Gaps found and fixed in this run

1. **CEO had no role section.** Its `AGENTS.md` was the generic onboarding template: no
   shared rules, no board-only list, no mission/owns/never. Rewritten from the roster doc
   (2.8 KB), so the CEO now reads the same source of truth as the other 15.
2. **CEO could create agents and skills.** Roster says only the board hires. Both flags now
   `false`; `canAssignTasks` is `true` (whole-org assignment).
3. **CEO heartbeat was off** (interval 300 s, disabled). Set to 24 h, matching the roster.
4. **Scrum Master heartbeat was off.** Set to 24 h.
5. **All 16 agents ran the same model.** Model tiers ignored. Applied Top / Mid / Small from
   the roster: Top = `deepseek-v4.1-flash-free`, Mid = `glm-5.3-flash-free`,
   Small = `mimo-v2.6-flash-free`.
6. **`canAssignTasks` was unset (null) on 7 agents** and granted to 3 agents that must not
   have it. Now exactly three can assign: CEO (whole org), VP (all engineering + Operator),
   Data Engineer (Data Analytics only). Recursive `canAssignTasks` kept the CEO's org-wide
   reach intact.

## Known deviations, recorded on purpose

- **Trust: all agents on `standard`.** The roster asks for `low_trust_review` for the
  Operator, Data Analytics and Finance controller. That preset cannot run here — it needs
  isolated workspaces or a sandbox this install does not have, and agents under it fail on
  every run. Board decision: stay on standard.
- **Budgets are still $0 per agent.** Company budget and per-agent caps are PIP-13's scope
  (in review, board-only approval). This issue does not change money settings.
- **All 16 agents exist at once.** The roster's step 8 says add agents by phase; a full team
  on day one can burn budget on idle agents. Every non-timed agent has its heartbeat off, so
  idle cost is $0 until a task is assigned. No action needed unless spend shows otherwise.

## How to re-check

```
GET /api/companies/{companyId}/agents   # name, reportsTo, adapterConfig.model,
                                        # runtimeConfig.heartbeat, permissions
```

Compare `permissions.canCreateAgents`/`canCreateSkills` (must be false for all agents),
`canAssignTasks` (true for exactly three), and `runtimeConfig.heartbeat.enabled`
(true for exactly four).
