"""P0-9 real-data probe (Plan §5 Phase 0 step 9).

Confirms the two real sources are the ones the plan names, by counting what
they actually hold:

    uv run python -m ebook_ab.realdata.check

Exits 0 only when every count matches. Paths come from the command line or the
UPWORTHY_CSV / GUTENBERG_RDF environment variables.
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
import tarfile
from pathlib import Path
from xml.etree import ElementTree as ET

EXPECTED_BYTES = 14_260_949
EXPECTED_ROWS = 22_666
EXPECTED_TESTS = 4_873
RDF_SAMPLE = 10

DEFAULT_UPWORTHY = Path("data/real/upworthy/upworthy-archive-exploratory-packages-03.12.2020.csv")
DEFAULT_GUTENBERG = Path("data/real/gutenberg/rdf-files.tar.bz2")

NS = {
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "dcterms": "http://purl.org/dc/terms/",
    "pgterms": "http://www.gutenberg.org/2009/pgterms/",
}


def check_upworthy(path: Path) -> list[str]:
    """Count bytes, packages and test IDs; return the mismatches, if any."""
    problems = []
    size = path.stat().st_size
    if size != EXPECTED_BYTES:
        problems.append(f"bytes={size} expected={EXPECTED_BYTES}")

    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    tests = {r["clickability_test_id"] for r in rows}
    if len(rows) != EXPECTED_ROWS:
        problems.append(f"rows={len(rows)} expected={EXPECTED_ROWS}")
    if len(tests) != EXPECTED_TESTS:
        problems.append(f"tests={len(tests)} expected={EXPECTED_TESTS}")

    print(
        f"upworthy bytes={size} rows={len(rows)} tests={len(tests)} "
        f"file={path.name}"
    )
    return problems


def parse_gutenberg(record: bytes) -> dict:
    """One pgterms:ebook record -> the catalog fields the plan uses."""
    root = ET.fromstring(record)
    ebook = root.find("pgterms:ebook", NS)
    if ebook is None:
        raise ValueError("no pgterms:ebook element")

    def text(tag: str) -> str | None:
        node = ebook.find(tag, NS)
        return node.text.strip() if node is not None and node.text else None

    languages = [
        (node.find("rdf:value", NS).text or "").strip()
        for node in ebook.findall("dcterms:language/rdf:Description", NS)
        if node.find("rdf:value", NS) is not None
    ]
    authors = [
        (node.find("pgterms:name", NS).text or "").strip()
        for node in ebook.findall("dcterms:creator/pgterms:agent", NS)
        if node.find("pgterms:name", NS) is not None
    ]
    return {
        "id": ebook.get(f"{{{NS['rdf']}}}about", "").rsplit("/", 1)[-1],
        "title": text("dcterms:title"),
        "authors": authors,
        "languages": languages,
        "downloads": int(text("pgterms:downloads") or 0),
    }


def check_gutenberg(path: Path, sample: int = RDF_SAMPLE) -> list[str]:
    """Parse and print the first `sample` records; fail on unreadable ones."""
    parsed = []
    with tarfile.open(path, "r:bz2") as tar:
        for member in tar:
            if not member.name.endswith(".rdf"):
                continue
            parsed.append(parse_gutenberg(tar.extractfile(member).read()))
            if len(parsed) == sample:
                break

    for book in parsed:
        print(
            f"gutenberg id={book['id']} lang={','.join(book['languages']) or '-'} "
            f"downloads={book['downloads']} title={book['title']!r}"
        )
    print(f"gutenberg records={len(parsed)} file={path.name}")

    problems = []
    if len(parsed) != sample:
        problems.append(f"records={len(parsed)} expected={sample}")
    if any(not book["title"] for book in parsed):
        problems.append("a record has no title")
    return problems


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--upworthy", type=Path, default=Path(os.getenv("UPWORTHY_CSV", DEFAULT_UPWORTHY))
    )
    ap.add_argument(
        "--gutenberg", type=Path, default=Path(os.getenv("GUTENBERG_RDF", DEFAULT_GUTENBERG))
    )
    ap.add_argument("--sample", type=int, default=RDF_SAMPLE)
    args = ap.parse_args(argv)

    missing = [str(p) for p in (args.upworthy, args.gutenberg) if not p.is_file()]
    if missing:
        print(f"missing source file: {', '.join(missing)}", file=sys.stderr)
        return 2

    problems = check_upworthy(args.upworthy)
    problems += check_gutenberg(args.gutenberg, args.sample)

    if problems:
        print("FAIL " + "; ".join(problems), file=sys.stderr)
        return 1
    print("PASS real-data sources match the plan")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
