#!/usr/bin/env bash
# Rebuild the investor demo and push the built page to GitHub Pages.
#
#   bash tools/publish_investor.sh
#
# Publishes docs/investor/index.html (the complete, offline build) to the root of
# github.com/Pipe199x/ebook-ab-platform, which GitHub Pages serves at
# https://pipe199x.github.io/ebook-ab-platform/.
#
# Only the built page is published: no src/, no tools/, no docs/plan/. The page is
# self-contained, so nothing else is needed at runtime. D:\abtesting itself never
# becomes a git repo -- this works in a scratch clone under tmp/pages-repo/.
#
# Needs: bash + git + gh (to push), and WSL python3 (to run the build).
set -euo pipefail

# Git Bash rewrites /mnt/... into a Windows path before WSL sees it; stop that.
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'

REPO="Pipe199x/ebook-ab-platform"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLONE="$ROOT/tmp/pages-repo"
PAGE="$ROOT/docs/investor/index.html"

cd "$ROOT"

# 1. Build. python3 lives in WSL on this machine, so the repo path becomes /mnt/<drive>/<rest>.
WIN="$(cd "$ROOT" && pwd -W 2>/dev/null || printf '%s' "$ROOT")"   # D:/abtesting
DRIVE="$(printf '%s' "$WIN" | cut -c1 | tr 'A-Z' 'a-z')"
REST="$(printf '%s' "$WIN" | cut -c3- | tr '\\' '/')"
wsl.exe python3 -I "/mnt/$DRIVE$REST/tools/build_investor.py"
[ -f "$PAGE" ] || { echo "build did not produce $PAGE" >&2; exit 1; }

# 2. Scratch clone. The repo starts empty, so there may be no branch to pull.
mkdir -p "$ROOT/tmp"
if [ -d "$CLONE/.git" ]; then
  # The repo starts empty, so there may be no main on the remote yet -- only pull if there is.
  if git -C "$CLONE" rev-parse --verify -q refs/remotes/origin/main >/dev/null; then
    git -C "$CLONE" pull --ff-only
  fi
else
  gh repo clone "$REPO" "$CLONE" 2>/dev/null || {
    mkdir -p "$CLONE" && git -C "$CLONE" init -q
    git -C "$CLONE" remote add origin "https://github.com/$REPO.git"
  }
fi
git -C "$CLONE" checkout -q -B main 2>/dev/null || true

# 3. Copy the built page and the two host files it needs.
cp "$PAGE" "$CLONE/index.html"
: > "$CLONE/.nojekyll"                      # skip Jekyll; it would drop underscore files
printf 'User-agent: *\nDisallow: /\n' > "$CLONE/robots.txt"

# The demo prints this share link (docs/investor/index.html, the Duel "Copy" button),
# so it must resolve rather than 404 in front of an investor.
mkdir -p "$CLONE/d/7KQ2"
cat > "$CLONE/d/7KQ2/index.html" <<'HTML'
<!doctype html>
<meta charset="utf-8">
<title>Before You Decide</title>
<meta http-equiv="refresh" content="0; url=/ebook-ab-platform/#/duel">
<a href="/ebook-ab-platform/#/duel">Open the Duel</a>
HTML

# 4. Push.
cd "$CLONE"
git add -A
git -c user.name="Pipe199x" -c user.email="Pipe199x@users.noreply.github.com" \
  commit -q -m "Publish Before You Decide investor demo" || { echo "nothing changed"; exit 0; }
git push -u origin main
echo "pushed. live at https://pipe199x.github.io/ebook-ab-platform/"
