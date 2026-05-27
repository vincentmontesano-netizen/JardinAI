#!/bin/sh
set -e

echo "[entrypoint] Attente de PostgreSQL sur ${DB_HOST:-supabase-db}:${DB_PORT:-5432}..."

i=0
max_attempts=30
while [ "$i" -lt "$max_attempts" ]; do
  if pg_isready -h "${DB_HOST:-supabase-db}" -p "${DB_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; then
    echo "[entrypoint] Base de données prête."
    break
  fi
  i=$((i + 1))
  sleep 2
done

if [ "$i" -ge "$max_attempts" ]; then
  echo "[entrypoint] Timeout : PostgreSQL indisponible."
  exit 1
fi

echo "[entrypoint] Exécution des migrations Drizzle..."
pnpm exec drizzle-kit migrate

echo "[entrypoint] Démarrage du serveur..."
exec node dist/index.js
