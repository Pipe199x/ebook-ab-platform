#!/usr/bin/env bash
# Render an answers document in docs/plan/answers/ to an A4 PDF, offline (headless Chrome).
# Usage (inside WSL, from the repo root): tools/render_answers.sh [v2.2|lifesaver]   (default: v2.2)
#   v2.2       answers-v2.2.html -> ANSWERS-v2.2.pdf. The demo screenshots in shots/ are made once from the old XP demo
#              (docs/plan/old/demo-xp/) and committed.
#   lifesaver  answers-lifesaver.html -> LIFESAVER.pdf. Builds the demo (docs/plan/DEMO.html), then its click-through test
#              checks it and saves the screens the PDF shows (figs/ls-*.png).
# These are past answers; their changes now live in the plan (docs/plan/PLAN.pdf).
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
export NODE_PATH="$HOME/.local/opt/mmdc/node_modules"

root="$(cd "$(dirname "$0")/.." && pwd)"
name="${1:-v2.2}"
cd "$root/docs/plan/answers"

case "$name" in
  v2.2)
    figs=(figs/lessons_plain.html figs/library_launch.html figs/plan_help.html figs/store_plain.html)
    doc=answers-v2.2.html
    pdf=ANSWERS-v2.2.pdf
    ;;
  lifesaver)
    python3 -I "$root/tools/build_companion.py" demo.html
    node "$root/tools/check_demo.cjs" figs
    figs=(figs/ls_*.html)
    doc=answers-lifesaver.html
    pdf=LIFESAVER.pdf
    ;;
  *)
    echo "usage: tools/render_answers.sh [v2.2|lifesaver]" >&2
    exit 2
    ;;
esac

# 1) Figures for the answers -> PNG (same renderer and checks as the plan's figures).
node "$root/tools/render_html.cjs" "${figs[@]}"

# 2) The answers document -> A4 PDF.
node "$root/tools/render_pdf.cjs" "$doc" "$pdf"
echo "$pdf: $(du -h "$pdf" | cut -f1)"
if command -v wslpath >/dev/null 2>&1; then
  echo "Windows path: $(wslpath -w "$PWD/$pdf")"
fi
