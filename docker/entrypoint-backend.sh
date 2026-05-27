#!/bin/sh
set -e

# Hôte Postgres = nom du service Compose (db). Ignorer les anciennes valeurs Hostinger.
DB_HOST=db
export DB_HOST
DB_PORT="${DB_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

echo "[entrypoint] Attente de PostgreSQL sur ${DB_HOST}:${DB_PORT}..."

i=0
max_attempts=45
while [ "$i" -lt "$max_attempts" ]; do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER" >/dev/null 2>&1; then
    echo "[entrypoint] Base de données prête."
    break
  fi
  i=$((i + 1))
  sleep 2
done

if [ "$i" -ge "$max_attempts" ]; then
  echo "[entrypoint] ERREUR : PostgreSQL indisponible après $((max_attempts * 2))s."
  echo "[entrypoint] Vérifiez les logs du service db (volume PG15 incompatible → supprimer le projet Hostinger et redéployer)."
  exit 1
fi

echo "[entrypoint] Exécution des migrations Drizzle..."
pnpm exec drizzle-kit migrate

if [ -n "$OWNER_EMAIL" ] && [ -n "$ADMIN_SEED_PASSWORD" ]; then
  echo "[entrypoint] Initialisation du compte admin ($OWNER_EMAIL)..."
  node dist/scripts/seed-admin.js
else
  echo "[entrypoint] AVERTISSEMENT: OWNER_EMAIL ou ADMIN_SEED_PASSWORD absent — connexion admin impossible."
fi

echo "[entrypoint] Démarrage du serveur..."
exec node dist/index.js
