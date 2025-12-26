#!/usr/bin/env bash
# deploy.sh
# Usage:
#   ./deploy.sh            # prod deploy
#   ./deploy.sh --preview  # preview deploy (non-prod)
#   ./deploy.sh --skip-build
#
# Requirements:
#   - npm
#   - npx (ships with npm)
#   - vercel project already linked (you have .vercel/)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="prod"
SKIP_BUILD="0"

for arg in "$@"; do
  case "$arg" in
    --preview) MODE="preview" ;;
    --prod) MODE="prod" ;;
    --skip-build) SKIP_BUILD="1" ;;
    -h|--help)
      cat <<'EOF'
deploy.sh
  ./deploy.sh               Deploy to production (vercel --prod)
  ./deploy.sh --preview     Deploy as preview (vercel)
  ./deploy.sh --skip-build  Skip typecheck/build step
EOF
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

err() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "==> $*"; }

# Basic sanity checks
[[ -f package.json ]] || err "package.json not found. Run from project root."
[[ -d public ]] || err "public/ not found."
[[ -d src ]] || err "src/ not found."

# Ensure manifest exists
MANIFEST_PATH="public/.well-known/farcaster.json"
[[ -f "$MANIFEST_PATH" ]] || err "Missing $MANIFEST_PATH. Create it before deploy."

# Ensure thumbnail exists (you currently reference /thumbs/tmp.png)
[[ -f "public/thumbs/tmp.png" ]] || err "Missing public/thumbs/tmp.png (thumbnail)."

# Ensure vercel project is linked
[[ -d ".vercel" ]] || err "Missing .vercel/ (project not linked). Run: npx vercel"

# Quick JSON sanity check without jq dependency
info "Validating Farcaster manifest JSON parses..."
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));' "$MANIFEST_PATH" \
  || err "Manifest JSON is invalid."

# Build
if [[ "$SKIP_BUILD" == "0" ]]; then
  info "Installing deps (npm ci if lockfile present, else npm install)..."
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi

  info "Typecheck + build..."
  npm run build
else
  info "Skipping build step (--skip-build)."
fi

# Deploy
if [[ "$MODE" == "prod" ]]; then
  info "Deploying to production (npx vercel --prod)..."
  DEPLOY_OUT="$(npx vercel --prod 2>&1 || true)"
else
  info "Deploying preview (npx vercel)..."
  DEPLOY_OUT="$(npx vercel 2>&1 || true)"
fi

# Print vercel output (works in TTY and non-TTY environments)
printf '%s\n' "$DEPLOY_OUT"

# Fail if vercel failed
# (vercel sometimes prints useful output even when failing, so we printed first)
if echo "$DEPLOY_OUT" | grep -qiE 'error|failed'; then
  err "Vercel reported an error. See output above."
fi

# Extract alias URL if present
ALIAS_URL="$(echo "$DEPLOY_OUT" | grep -Eo 'https://[^ ]+\.vercel\.app' | tail -n 1 || true)"

if [[ -z "$ALIAS_URL" ]]; then
  info "Could not auto-detect deploy URL from vercel output."
  info "If you know your domain, run the verification step manually:"
  info "  curl -s https://YOUR_DOMAIN/.well-known/farcaster.json"
  exit 0
fi

# Verify manifest reachable
info "Verifying manifest is reachable on: $ALIAS_URL"
curl -fsS "$ALIAS_URL/.well-known/farcaster.json" >/dev/null \
  || err "Manifest not reachable at $ALIAS_URL/.well-known/farcaster.json"

info "OK, deployed: $ALIAS_URL"
info "Manifest: $ALIAS_URL/.well-known/farcaster.json"

echo -e '\n✅ Now open this link and hit "Refresh" to finish deployment:\nhttps://farcaster.xyz/~/developers/mini-apps/manifest?domain=nft-season.vercel.app\n'
