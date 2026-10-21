import sys
from pathlib import Path
# Add repository src directory to PYTHONPATH using cwd
src_path = Path.cwd() / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

import unittest
from ebook_ab.config import load_per_agent_caps, PerAgentCaps

class TestPerAgentCaps(unittest.TestCase):
    def test_load_success(self):
        caps = load_per_agent_caps()
        self.assertIsInstance(caps, PerAgentCaps)
        self.assertGreater(caps.budget_cents, 0)
        self.assertGreater(caps.max_agents, 0)

if __name__ == "__main__":
    unittest.main()
