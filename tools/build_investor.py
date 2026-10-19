"""Build the investor demo: one self-contained offline page, and one body-only variant for the artifact host.

Usage (from the repo root):  python -I tools/build_investor.py

Reads docs/investor/src/investor.html, inlines the marked stylesheets and scripts, pulls in
body.html at the <!--include:body.html--> marker, and base64s every woff2 so the page works
offline with no network. Writes:
  * docs/investor/index.html                -- complete, self-contained, works offline
  * docs/investor/build/INVESTOR.artifact.html -- the same content without the document
    wrapper (no doctype/html/head/body), because the artifact host supplies that skeleton.

Same idea as tools/build_companion.py, kept separate so the plan's build is untouched.
"""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "investor" / "src"
OUT = ROOT / "docs" / "investor" / "index.html"
ARTIFACT = ROOT / "docs" / "investor" / "build" / "INVESTOR.artifact.html"


def inline_styles(html: str) -> str:
    def repl(m: re.Match) -> str:
        sheet = SRC / m.group(1)
        css = sheet.read_text(encoding="utf-8")

        def font(u: re.Match) -> str:
            data = base64.b64encode((sheet.parent / u.group(1)).read_bytes()).decode()
            return f'url("data:font/woff2;base64,{data}")'

        css = re.sub(r'url\("([^"]+\.woff2)"\)', font, css)
        assert "</style" not in css, m.group(1)
        return f"<style>\n{css}</style>"

    return re.sub(r'<link rel="stylesheet" href="([^"]+)" data-inline>', repl, html)


def inline_scripts(html: str) -> str:
    def repl(m: re.Match) -> str:
        code = (SRC / m.group(1)).read_text(encoding="utf-8")
        assert "</script" not in code, m.group(1)
        return f"<script>\n{code}</script>"

    return re.sub(r'<script src="([^"]+)" data-inline></script>', repl, html)


def include_body(html: str) -> str:
    def repl(m: re.Match) -> str:
        return (SRC / m.group(1)).read_text(encoding="utf-8")

    return re.sub(r"<!--include:([^>]+)-->", repl, html)


def body_only(full: str) -> str:
    """Everything the artifact host wants: its head contents (title, metas, style) at the top of the
    file, then the page content, with the document wrapper and the body marker dropped."""
    head = full[full.index("<head>") + len("<head>"):full.index("</head>")].strip()
    rest = full[full.index("</head>") + len("</head>"):]
    rest = re.sub(r"</?(body|html)>", "", rest)
    return head + "\n" + rest.lstrip("\n")


def main() -> None:
    html = include_body(inline_scripts(inline_styles((SRC / "investor.html").read_text(encoding="utf-8"))))
    assert "data-inline" not in html, "a marked asset was not inlined"
    assert "<!--include:" not in html, "an include was not resolved"
    OUT.write_text(html, encoding="utf-8")

    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT.write_text(body_only(html), encoding="utf-8")

    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")
    print(f"wrote {ARTIFACT} ({ARTIFACT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()

