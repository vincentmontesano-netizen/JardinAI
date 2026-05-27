#!/usr/bin/env bash
# Vérification post-déploiement Hostinger (depuis votre machine)
# Usage : ./scripts/hostinger-check.sh http://76.13.45.7

set -euo pipefail

BASE="${1:-http://76.13.45.7}"
BASE="${BASE%/}"

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }

echo "=== Jardinia — check Hostinger ==="
echo "URL : $BASE"
echo ""

check_curl() {
  curl -sS --connect-timeout 10 --max-time 20 "$@"
}

yellow "1. API health"
HEALTH=$(check_curl -G "$BASE/api/trpc/system.health" \
  --data-urlencode 'input={"json":{"timestamp":0}}' || true)
if echo "$HEALTH" | grep -q '"ok":true'; then
  green "   OK — backend accessible"
else
  red "   ÉCHEC — backend injoignable ou 502"
  echo "   Réponse : ${HEALTH:-timeout}"
  exit 1
fi

yellow "2. Configuration (deployStatus)"
STATUS=$(check_curl -G "$BASE/api/trpc/system.deployStatus" \
  --data-urlencode 'input={"json":null}' || true)
echo "   $STATUS"

for key in stripe gemini jwt adminSeed; do
  if echo "$STATUS" | grep -q "\"$key\":true"; then
    green "   ✓ $key"
  else
    red "   ✗ $key — variable manquante dans le panneau Hostinger"
  fi
done

yellow "3. Cookie session (login HTTP)"
HEADERS=$(check_curl -D - -o /dev/null -X POST "$BASE/api/trpc/auth.login?batch=1" \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"email":"test@example.com","password":"wrong"}}}' 2>&1 || true)

if echo "$HEADERS" | grep -qi 'SameSite=Lax'; then
  green "   OK — SameSite=Lax (sessions HTTP)"
elif echo "$HEADERS" | grep -qi 'SameSite=None'; then
  red "   ÉCHEC — SameSite=None : rebuild backend depuis main (commit d06bbec+)"
else
  yellow "   ? — pas de Set-Cookie (normal si login 401)"
fi

yellow "4. Frontend"
CODE=$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 15 "$BASE/" || echo "000")
if [[ "$CODE" == "200" || "$CODE" == "304" ]]; then
  green "   OK — HTTP $CODE"
else
  red "   ÉCHEC — HTTP $CODE"
fi

echo ""
green "Check terminé."
echo "Stripe test : connectez-vous → /credits → carte 4242 4242 4242 4242"
