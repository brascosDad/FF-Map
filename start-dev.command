#!/bin/bash
# Double-click this file in Finder to pull the latest changes and start the dev
# server. macOS opens it in Terminal automatically -- nothing to type.
#
# --ff-only means: if you have local edits that would conflict, this stops with
# a clear message instead of creating a merge you didn't ask for.
cd "$(dirname "$0")" || exit 1
echo "→ Pulling latest…"
git pull --ff-only || { echo; echo "Pull failed — you have local changes, or you're on the wrong branch."; echo "Current branch: $(git branch --show-current)"; read -r -p "Press return to close."; exit 1; }
echo "→ Checking dependencies…"
npm install --silent
echo "→ Starting dev server…"
npm run dev
