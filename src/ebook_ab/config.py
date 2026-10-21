import json
import re
from dataclasses import dataclass
from pathlib import Path

@dataclass(frozen=True)
class PerAgentCaps:
    """Limits for per‑agent budgeting.

    Attributes
    ----------
    budget_cents: int
        Total company budget in cents (e.g. 10_000 = $100).
    max_agents: int
        Maximum number of agents that may draw from the budget.
    """
    budget_cents: int
    max_agents: int

def load_per_agent_caps(path: Path | str = Path("docs/config/per_agent_caps.md")) -> PerAgentCaps:
    """Load the per‑agent caps configuration.

    The configuration file is a Markdown document containing a JSON code block.
    This function extracts the JSON, validates the required keys and returns a
    :class:`PerAgentCaps` instance.

    Parameters
    ----------
    path:
        Path to the ``per_agent_caps.md`` file.

    Returns
    -------
    PerAgentCaps
        The parsed configuration.
    """
    txt = Path(path).read_text(encoding="utf-8")
    # Find the first JSON code fence.
    m = re.search(r"```json\s+(.*?)\s+```", txt, re.DOTALL)
    if not m:
        raise ValueError("JSON block not found in per_agent_caps.md")
    data = json.loads(m.group(1))
    # Basic validation.
    if "budget_cents" not in data or "max_agents" not in data:
        raise KeyError("Required keys missing in per_agent_caps config")
    return PerAgentCaps(budget_cents=int(data["budget_cents"]), max_agents=int(data["max_agents"]))

# Example usage (removed in production code).
# caps = load_per_agent_caps()
# print(caps)
