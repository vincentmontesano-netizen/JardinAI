#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

red() { printf '\033[0;31m%s\033[0m\n' "$*"; }
green() { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f .env.production.example ]]; then
    yellow "Fichier .env absent — copie depuis .env.production.example"
    cp .env.production.example "$ENV_FILE"
    red "Éditez .env puis relancez : ./docker/deploy.sh"
    exit 1
  fi
  red "Fichier .env manquant."
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

fail=0

require_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    red "  ✗ $name est requis"
    fail=1
  else
    green "  ✓ $name"
  fi
}

require_not_default() {
  local name="$1"
  local bad="$2"
  local value="${!name:-}"
  if [[ "$value" == "$bad" ]]; then
    red "  ✗ $name ne doit pas rester à la valeur par défaut ($bad)"
    fail=1
  else
    green "  ✓ $name (personnalisé)"
  fi
}

yellow "Vérification de la configuration production…"
require_var DOMAIN
require_not_default JWT_SECRET "change-me-in-production"
require_not_default POSTGRES_PASSWORD "postgres"
require_var GEMINI_API_KEY
require_var BUILT_IN_FORGE_API_URL
require_var BUILT_IN_FORGE_API_KEY
require_var STRIPE_SECRET_KEY
if [[ -z "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  yellow "  ⚠ STRIPE_WEBHOOK_SECRET absent — OK en test (confirmPayment sur /payment/success)"
else
  green "  ✓ STRIPE_WEBHOOK_SECRET"
fi

if [[ "$fail" -ne 0 ]]; then
  red "Configuration incomplète — corrigez .env avant le déploiement."
  exit 1
fi

yellow "Build et démarrage des conteneurs…"
docker compose -f "$COMPOSE_FILE" --profile edge up -d --build

yellow "Attente des healthchecks…"
sleep 20
docker compose -f "$COMPOSE_FILE" ps

green "Déploiement terminé."
echo ""
echo "  URL       : https://${DOMAIN}"
echo "  Webhook   : https://${DOMAIN}/api/stripe/webhook"
echo "  OAuth CB  : https://${DOMAIN}/api/oauth/callback"
echo ""
echo "Logs : docker compose -f $COMPOSE_FILE logs -f"
