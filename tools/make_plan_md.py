"""Turn the plan source (docs/plan/render/plan-source.md) into docs/plan/PLAN.md for the PDF build.

Usage (from the repo root):
    python3 -I tools/make_plan_md.py docs/plan/render/plan-source.md docs/plan/PLAN.md

Content stays verbatim. Only presentation changes:
  * the H1 title moves into YAML metadata (rendered on the cover page),
  * each Mermaid block is written to docs/plan/diagrams/<name>.mmd and replaced by a captioned image,
  * the <!-- screens --> marker becomes six phone screens of the demo (saved by tools/check_demo.cjs in docs/plan/shots/),
  * pipe-table separator rows get proportional dash counts (pandoc uses them as column widths),
  * a few paragraphs become block quotes (rendered as callout boxes),
  * HTML-comment markers switch the wide-table sections to landscape (invisible on GitHub).
"""
import re
import sys
from pathlib import Path

# Mermaid blocks, in document order: (file name, caption, width[, image]).
# An explicit image replaces the Mermaid render (small_seller: Mermaid's bar labels are unreadable),
# so no .mmd is written for it; its picture comes from docs/plan/charts/<name>.html.
DIAGRAMS = [
    ("big_picture", "The big picture: what we build and who benefits.", "70%"),
    ("purchase_journey", "The journey of one purchase in the simulated store, from click to decision.", "45%"),
    ("vote_journey", "The journey of one Duel vote, from a reader's tap to the library.", "45%"),
    ("small_seller", "Months of traffic a small seller needs to detect a lift (2,000 visitors/month, 2% buy).", "100%",
     "charts/small_seller.png"),
    ("timeline", "Phases at about 20 h/week (example start date; STOP points add calendar time).", "100%"),
    ("path_a", "Path A: direct ingestion with Spark's Kafka source. Added only if the Phase 0 probes pass.", "100%"),
    ("path_b", "Path B: lakehouse-bridge plus Auto Loader. Always on.", "100%"),
    ("bridge_protocol", "lakehouse-bridge commit protocol.", "78%"),
    ("phase0_rule", "Phase 0 decision rule: Path A vs Path B.", "100%"),
    ("site_flow", "How data reaches the public website, and how votes and shared results come back. No tokens in the browser.", "34%"),
    ("job_cluster", "Local job cluster lifecycle: created for the run, deleted after it.", "100%"),
]

# Phone screens of the demo (docs/plan/shots/<name>.png, saved by tools/check_demo.cjs), a 3 x 2 grid in Part 1, section B.
SCREENS = [
    ("ls-home", "Home: three doors, one per pain"),
    ("ls-reader", "A Duel: what a reader sees, one version and one tap"),
    ("ls-reveal", "The reveal: the result in plain words, and a post to share"),
    ("ls-play", "Which would you read? Vote on other Duels to earn votes"),
    ("ls-doctor", "Ad Doctor: what to stop paying for, from your own report"),
    ("ls-luck", "Real or luck? Two numbers, an honest answer"),
]
SCREEN_MARKER = "<!-- screens -->"

# Hand-tuned relative column widths (percent) for the widest tables; others are computed.
WIDTHS = {
    "| Area | v1 | v2 |": [14, 34, 52],
    "| When | You do | I do |": [15, 52, 33],
    "| # | Question | Options offered (recommended first) | Your answer | Consequence in v2 |": [4, 22, 27, 16, 31],
    "| # | Question | Options offered (recommended first) | Your answer | Consequence |": [4, 22, 27, 16, 31],
    "| # | Your point | What changed |": [4, 34, 62],
    "| ID | Change | Reason |": [5, 55, 40],
    "| ID | Decision | Rationale |": [5, 55, 40],
    "| Topic (2 partitions; retention 72 h on both sides) | Key | Event types |": [34, 18, 48],
    "| Option | Value | Why |": [24, 22, 54],
    "| Action | Rules | Why |": [14, 46, 40],
    "| Experiment | Baseline | MDE | α / power | n per arm | Exposure probability | Users needed |": [13, 19, 13, 15, 18, 11, 11],
    "| Component | Free tier / license | Limits | When a limit is hit | Official source | Paid option rejected | Free fallback |": [10, 14, 26, 12, 17, 10, 11],
    "| Option | Facts (checked 2026-10-15) | What we lose without it |": [16, 56, 28],
    "| ID | Risk | L | I | Mitigation | Phase |": [5, 31, 5, 4, 46, 9],
    "| # | View | Grain | Sources | Purpose | Consumer | cluster_by |": [3, 15, 13, 18, 25, 14, 12],
    "| Field | EXP-CHK-001 Wallet-first checkout | EXP-PDP-002 New cover + subtitle | EXP-BUN-003 3-book bundle banner |": [10, 30, 30, 30],
    "| ID | Question | Resolved by |": [6, 70, 24],
    "| # | Change | From your question | Where in v2.3 |": [5, 59, 13, 23],
    "| Badge | What it is | Where you see it | On launch day |": [16, 32, 26, 26],
}

# Paragraphs that start with these prefixes become block quotes (callout boxes in the PDF).
CALLOUTS = ("In one sentence:", "**Accounts.**", "**Effort: ~", "**Rule.**", "**What's new in v3.0.**")

# Landscape sections: marker inserted before each heading.
LANDSCAPE = [
    ("### 3.3 lakehouse-bridge commit protocol", "<!-- landscape:on -->"),
    ("### 3.5 Topics, keys, contract", "<!-- landscape:off -->"),
    ("## 4. Zero-cost bill of materials", "<!-- landscape:on -->"),
    ("## 5. Phases", "<!-- landscape:off -->"),
    ("## 6. Risk register", "<!-- landscape:on -->"),
    ("## 9. Assumptions and open questions", "<!-- landscape:off -->"),
]

SEP_RE = re.compile(r"\s*\|(\s*:?-{3,}:?\s*\|)+\s*")


def cell_len(cell: str) -> int:
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", cell)  # links -> link text
    text = re.sub(r"[`*_]", "", text)
    return len(text.strip())


def auto_widths(rows: list[list[str]]) -> list[int]:
    cols = len(rows[0])
    weights = []
    for j in range(cols):
        lens = [cell_len(r[j]) for r in rows if j < len(r)]
        longest_word = max((len(w) for w in re.split(r"\s+", rows[0][j]) if w), default=3)
        w = 0.5 * max(lens) + 0.5 * (sum(lens) / len(lens))
        weights.append(min(max(w, longest_word, 4), 70))
    total = sum(weights)
    return [max(3, round(100 * w / total)) for w in weights]


def split_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def main(src: Path, dst: Path) -> None:
    lines = src.read_text(encoding="utf-8").splitlines()
    m = re.match(r"# (\S+): plan (v[\d.]+) \((\d{4}-\d{2}-\d{2})\)", lines[0])
    assert m, f"unexpected title line: {lines[0]}"
    name, version, date = m.groups()
    front = [
        "---",
        f'title: "{name}"',
        f'subtitle: "Plan {version}: A/B testing for a fictional Latin American ebook marketplace, at $0"',
        f'date: "{date}"',
        "lang: en",
        "---",
        "",
    ]
    body = "\n".join(lines[1:]).lstrip("\n")

    # 1) Mermaid blocks -> diagrams/<name>.mmd + captioned images.
    blocks = re.findall(r"```mermaid\n(.*?)\n```", body, flags=re.S)
    assert len(blocks) == len(DIAGRAMS), f"expected {len(DIAGRAMS)} mermaid blocks, found {len(blocks)}"
    diagram_dir = dst.parent / "diagrams"
    diagram_dir.mkdir(exist_ok=True)
    for code, (fname, caption, width, *override) in zip(blocks, DIAGRAMS):
        if override:
            src = override[0]
        else:
            src = f"diagrams/{fname}.png"
            mmd = diagram_dir / f"{fname}.mmd"
            if not mmd.exists() or mmd.read_text(encoding="utf-8") != code + "\n":
                mmd.write_text(code + "\n", encoding="utf-8", newline="\n")
        image = f"![{caption}]({src}){{width={width}}}"
        body = body.replace(f"```mermaid\n{code}\n```", "\n" + image + "\n", 1)

    # 1b) Screen marker -> the demo's screens between start/end markers (a grid in the PDF, a list on GitHub).
    assert body.count(SCREEN_MARKER) == 1, SCREEN_MARKER
    images = "\n\n".join(f"![{caption} (the demo; example data)](shots/{name}.png)" for name, caption in SCREENS)
    body = body.replace(SCREEN_MARKER, f"<!-- screens:start -->\n\n{images}\n\n<!-- screens:end -->")

    # 2) Proportional column widths.
    out, body_lines, i, tables = [], body.split("\n"), 0, 0
    while i < len(body_lines):
        line = body_lines[i]
        if line.strip().startswith("|") and i + 1 < len(body_lines) and SEP_RE.fullmatch(body_lines[i + 1]):
            header = line.strip()
            rows = [split_row(line)]
            j = i + 2
            while j < len(body_lines) and body_lines[j].strip().startswith("|"):
                rows.append(split_row(body_lines[j]))
                j += 1
            widths = WIDTHS.get(header) or auto_widths(rows)
            assert len(widths) == len(rows[0]), header
            indent = line[: len(line) - len(line.lstrip())]
            out.append(line)
            out.append(indent + "|" + "|".join("-" * (2 * w) for w in widths) + "|")
            out.extend(body_lines[i + 2 : j])
            tables += 1
            i = j
            continue
        out.append(line)
        i += 1
    body = "\n".join(out)

    # 3) Callouts: a paragraph (up to the next blank line) starting with a prefix becomes a block quote.
    out, para_start = [], True
    quoting = False
    for line in body.split("\n"):
        if para_start and line.startswith(CALLOUTS):
            quoting = True
        if line.strip() == "":
            quoting = False
        out.append(("> " + line) if quoting else line)
        para_start = line.strip() == ""
    body = "\n".join(out)

    # 4) Landscape markers.
    for heading, marker in LANDSCAPE:
        idx = body.find("\n" + heading)
        assert idx >= 0, heading
        body = body[: idx + 1] + marker + "\n\n" + body[idx + 1 :]

    dst.write_text("\n".join(front) + body.rstrip() + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {dst} ({dst.stat().st_size} bytes); tables: {tables}; diagrams: {len(DIAGRAMS)}")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
