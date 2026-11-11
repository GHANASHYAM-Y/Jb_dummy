#!/usr/bin/env bash
# EVOAIQU - one-command setup for macOS, Linux and Git Bash
#
# Run from the repo root:
#   bash setup.sh
#
# What it does: checks Node.js, installs the packages, creates data/.env.local
# from the template. It never overwrites an existing .env.local.
# What it does NOT do: create your Supabase project or run the SQL migrations.
# Those need your own keys. See SETUP.md, steps 4 to 7.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$ROOT/data"

fail() {
  echo ""
  echo "ERROR: $1" >&2
  exit 1
}

echo "== EVOAIQU setup =="

# 1. Node.js 20.9 or newer
command -v node >/dev/null 2>&1 || fail "Node.js is not installed. Get it from https://nodejs.org, then open a NEW terminal and run this again."

NODE_VERSION="$(node -v | sed 's/^v//')"
NODE_MAJOR="$(echo "$NODE_VERSION" | cut -d. -f1)"
NODE_MINOR="$(echo "$NODE_VERSION" | cut -d. -f2)"
if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 9 ]; }; then
  fail "Node.js $NODE_VERSION is too old. This project needs 20.9 or newer."
fi
echo "Node.js $NODE_VERSION OK"

[ -f "$APP/package.json" ] || fail "Cannot find data/package.json. Run this script from the repo root."

# 2. Install packages
echo "Installing packages (this can take a few minutes)..."
(cd "$APP" && npm install) || fail "npm install failed. Read the messages above."

# 3. Environment file
if [ -f "$APP/.env.local" ]; then
  echo "data/.env.local already exists. Leaving it as it is."
else
  cp "$APP/.env.example" "$APP/.env.local"
  echo "Created data/.env.local from the template."
fi

echo ""
echo "Done with the automatic part."
echo ""
echo "Next steps:"
echo "  1. Create a Supabase project and put its keys in data/.env.local   (SETUP.md steps 4 and 5)"
echo "  2. Run the 17 SQL files in data/supabase/migrations in order      (SETUP.md step 6)"
echo "  3. Set the sign-in redirect URLs in Supabase                       (SETUP.md step 7)"
echo "  4. Start the app:   cd data && npm run dev     then open http://localhost:3000"
echo ""
echo "Want to try it first without Supabase? Start it now - the solo games work without keys."
