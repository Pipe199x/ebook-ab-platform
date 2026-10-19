#!/usr/bin/env bash
# Render docs/plan/PLAN.md -> docs/plan/PLAN.pdf offline (pandoc + Typst + mermaid-cli + headless Chrome),
# and build the demo (docs/plan/DEMO.html) whose screens the plan shows.
# Usage (inside WSL, from the repo root): tools/render_docs.sh
# Before it: python3 -I tools/make_plan_md.py docs/plan/render/plan-source.md docs/plan/PLAN.md
# Tools live in ~/.local/bin (installed without sudo; see PLAN.md section 0).
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
export NODE_PATH="$HOME/.local/opt/mmdc/node_modules"

cd "$(dirname "$0")/../docs/plan"
mkdir -p build/preview shots

# 1) Mermaid -> PNG (PNG, not SVG: Typst's SVG renderer drops Mermaid's foreignObject labels).
for src in diagrams/*.mmd; do
  png="${src%.mmd}.png"
  if [[ ! -f "$png" || "$src" -nt "$png" || render/mermaid.json -nt "$png" ]]; then
    mmdc -q -i "$src" -o "$png" -s 3 -b white -c render/mermaid.json -p render/puppeteer.json
    echo "rendered $png"
  fi
done

# 2) HTML charts -> PNG with the same headless Chrome (offline; see tools/render_html.cjs).
html_pages=()
for src in charts/*.html; do
  png="${src%.html}.png"
  if [[ ! -f "$png" || "$src" -nt "$png" || render/abstats.js -nt "$png" ]]; then
    html_pages+=("$src")
  fi
done
if (( ${#html_pages[@]} )); then
  node ../../tools/render_html.cjs "${html_pages[@]}"
fi

# 3) The demo: DEMO.html (offline) + build/DEMO.artifact.html (private claude.ai page). Its click-through test
#    must pass, and it saves the screens that Part 1 B and section 3.13 show (shots/).
python3 -I ../../tools/build_companion.py
node ../../tools/check_demo.cjs shots

# 4) Markdown -> Typst (custom conf, landscape markers, screen grid, part dividers, root-relative images).
pandoc PLAN.md \
  -f markdown+lists_without_preceding_blankline-tex_math_dollars-subscript-superscript-smart-fancy_lists-citations \
  -t typst --standalone \
  --shift-heading-level-by=-1 \
  --toc --toc-depth=2 \
  --lua-filter=render/plan.lua \
  -V template=/render/plan-conf.typ \
  -V papersize=a4 \
  -o build/PLAN.typ

# 5) Typst -> PDF, plus low-res page previews for checking.
typst compile --root . build/PLAN.typ PLAN.pdf
rm -f build/preview/*.png
typst compile --root . build/PLAN.typ 'build/preview/p-{0p}.png' --ppi 60

pages=$(find build/preview -name 'p-*.png' | wc -l)
echo "PLAN.pdf: ${pages} pages, $(du -h PLAN.pdf | cut -f1)"
if command -v wslpath >/dev/null 2>&1; then
  echo "Windows path: $(wslpath -w "$PWD/PLAN.pdf")"
fi
