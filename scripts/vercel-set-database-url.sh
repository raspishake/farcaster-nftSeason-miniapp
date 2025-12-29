#!/usr/bin/env bash
# scripts/vercel-set-database-url.sh
set -euo pipefail

# Hardcoded target, as requested
NEON_ENDPOINT="ep-orange-brook-acyp7wj0-pooler"
NEON_HOST="${NEON_ENDPOINT}.sa-east-1.aws.neon.tech"
NEON_USER="neondb_owner"
NEON_DB="neondb"

DB_PASS="${1:-}"
if [[ -z "$DB_PASS" ]]; then
  echo "Usage: ./scripts/vercel-set-database-url.sh 'NEON_PASSWORD'"
  exit 1
fi

DB_URL="postgresql://${NEON_USER}:${DB_PASS}@${NEON_HOST}/${NEON_DB}?sslmode=require&options=endpoint%3D${NEON_ENDPOINT}"

# Non-interactive: pipe value into vercel env add
printf "%s" "$DB_URL" | npx vercel env add DATABASE_URL production

echo "OK, DATABASE_URL set for production."
echo "Now redeploy (your deploy.sh --prod)."
