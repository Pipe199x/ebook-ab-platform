# Per‑Agent Caps Configuration

This file defines the limits for each agent in the company budget.

```json
{
  "budget_cents": 10000,
  "max_agents": 10
}
```

- `budget_cents`: total company budget in cents (e.g., 10000 = $100.00).
- `max_agents`: maximum number of agents allowed to consume the budget.

> **Note**: When the project later needs to track subscription‑run counts, extend this JSON schema accordingly.
