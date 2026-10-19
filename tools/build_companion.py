"""Build the interactive pages from their sources in docs/plan/render/.

Usage (from the repo root): python3 -I tools/build_companion.py [source.html ...]   (default: all pages)

Today there is one page: render/demo.html, the demo of the final product (it also holds the For nerds tab).
Each source becomes two files:
  * docs/plan/<NAME>.html: a complete, self-contained page that works offline;
  * docs/plan/build/<NAME>.artifact.html: the same content without the document wrapper, for a private claude.ai page.
The old pages (the v2.2 plan companion and the Windows XP demo) are kept, already built, in docs/plan/old/.
Scripts marked <script src="..." data-inline> are inlined, and so are stylesheets marked
<link rel="stylesheet" href="..." data-inline>, with every url("x.woff2") in them turned into a data URI (embedded fonts).
<!--local-->...<!--/local--> blocks stay only in the offline page and <!--artifact-->...<!--/artifact--> blocks only in
the artifact copy. Everything before the <!--body--> marker (title, metas, style) goes into the offline page's <head>.
"""
import base64
import re
import sys
from pathlib import Path

PLAN = Path(__file__).resolve().parent.parent / "docs" / "plan"
PAGES = [("demo.html", "DEMO")]


def inline_scripts(html: str, base: Path) -> str:
    def repl(m: re.Match) -> str:
        code = (base / m.group(1)).read_text(encoding="utf-8")
        assert "</script" not in code, m.group(1)
        return f"<script>\n{code}</script>"
    return re.sub(r'<script src="([^"]+)" data-inline></script>', repl, html)


def inline_styles(html: str, base: Path) -> str:
    def repl(m: re.Match) -> str:
        sheet = base / m.group(1)
        css = sheet.read_text(encoding="utf-8")

        def font(u: re.Match) -> str:
            data = base64.b64encode((sheet.parent / u.group(1)).read_bytes()).decode()
            return f'url("data:font/woff2;base64,{data}")'
        css = re.sub(r'url\("([^"]+\.woff2)"\)', font, css)
        assert "</style" not in css, m.group(1)
        return f"<style>\n{css}</style>"
    return re.sub(r'<link rel="stylesheet" href="([^"]+)" data-inline>', repl, html)


def keep(html: str, kept: str, dropped: str) -> str:
    html = re.sub(rf"<!--{dropped}-->.*?<!--/{dropped}-->", "", html, flags=re.S)
    return re.sub(rf"<!--/?{kept}-->", "", html)


def build(source: str, name: str) -> None:
    src = PLAN / "render" / source
    body = inline_styles(inline_scripts(src.read_text(encoding="utf-8"), src.parent), src.parent)
    assert "data-inline" not in body, source

    artifact = PLAN / "build" / f"{name}.artifact.html"
    artifact.parent.mkdir(parents=True, exist_ok=True)
    artifact.write_text(keep(body, "artifact", "local"), encoding="utf-8")

    head, sep, rest = keep(body, "local", "artifact").partition("<!--body-->")
    assert sep, f"{source} needs a <!--body--> marker after its title, metas and style"
    page = (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        + head.strip() + "\n</head>\n<body>\n" + rest.strip() + "\n</body>\n</html>\n"
    )
    (PLAN / f"{name}.html").write_text(page, encoding="utf-8")
    print(f"wrote {PLAN / (name + '.html')} ({len(page.encode())} bytes) and build/{name}.artifact.html")


if __name__ == "__main__":
    wanted = set(sys.argv[1:])
    unknown = wanted - {source for source, _ in PAGES}
    assert not unknown, f"unknown pages: {sorted(unknown)}"
    for source, name in PAGES:
        if not wanted or source in wanted:
            build(source, name)
