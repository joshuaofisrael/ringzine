#!/usr/bin/env bash
# The only RingZine publish path: legal hold gate, tests, build, push _site to gh-pages.
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/legal-hold.js check src/content/posts
npm test
ELEVENTY_ENV=production npx eleventy --output=_site
# Held drafts must not exist in the output.
for f in $(grep -l '^review: HOLD_REVIEW' src/content/posts/*.md || true); do
  slug=$(basename "$f" .md)
  if [ -e "_site/articles/$slug" ]; then echo "HOLD_REVIEW draft $slug is in _site; aborting" >&2; exit 1; fi
done
python3 scripts/audit-copy.py _site
git fetch -q origin gh-pages
tmp=$(mktemp -d)
git worktree add -q "$tmp" FETCH_HEAD
git -C "$tmp" rm -rq --ignore-unmatch . >/dev/null
cp -a _site/. "$tmp/"
touch "$tmp/.nojekyll"
git -C "$tmp" add -A
git -C "$tmp" -c user.name="RingZine" -c user.email="deploy@ringzine.com" commit -qm "Deploy $(git rev-parse --short HEAD)" || echo "No site changes"
git -C "$tmp" push -q origin HEAD:gh-pages
git worktree remove --force "$tmp"
echo "Deployed $(git rev-parse --short HEAD) to gh-pages"
