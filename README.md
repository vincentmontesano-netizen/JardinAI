# Jardinia Studio

SaaS d'aménagement intérieur et extérieur assisté par IA pour les professionnels.

## Stack

- **Frontend** : React 19, Vite, Tailwind CSS 4, tRPC, wouter
- **Backend** : Express, tRPC, Drizzle ORM, PostgreSQL (Supabase)
- **Auth** : email / mot de passe (+ OAuth SSO optionnel)
- **Paiements** : Stripe Checkout + webhook
- **Stockage** : S3 via Forge (upload direct presigné)
- **IA** : Google Gemini — rendus visuels (`gemini-2.5-flash-image`) + compte rendu (`gemini-2.5-flash`)

## Démarrage local

```bash
pnpm install
cp .env.example .env
# Renseigner les variables dans .env

# PostgreSQL local (requis pour pnpm dev)
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d db
# DATABASE_URL=postgresql://postgres:postgres@localhost:5433/postgres
pnpm db:migrate
pnpm db:seed-admin   # si OWNER_EMAIL + ADMIN_SEED_PASSWORD définis

pnpm dev
```

> **Important** : en développement local, `DATABASE_URL` doit pointer vers le port hôte Postgres (`localhost:5433` par défaut avec Docker, ou `5432` si Postgres natif).  
> Dans Docker Compose (stack complète), utilisez `supabase-db` comme hôte (voir `.env.docker.example`).

L'application est disponible sur `http://localhost:3000`.

## Variables d'environnement

Voir [.env.example](./.env.example).

## Scripts

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build production |
| `pnpm start` | Lancer le build production |
| `pnpm test` | Tests Vitest (backend) |
| `pnpm check` | Vérification TypeScript |
| `pnpm db:push` | Génère et applique les migrations Drizzle |
| `pnpm db:migrate` | Applique les migrations existantes |

## Docker (Frontend + Backend + PostgreSQL Supabase)

Stack containerisée en 3 services :

| Service | Rôle | Port |
|---------|------|------|
| `frontend` | Nginx — assets React + reverse proxy `/api` | **8090** (configurable via `APP_PORT`) |
| `backend` | Express + tRPC + migrations Drizzle | interne 3000 |
| `db` | PostgreSQL (`postgres:16-alpine`) | interne (voir `docker-compose.local.yml` pour le port hôte) |

```bash
cp .env.docker.example .env
# Renseigner JWT_SECRET, GEMINI_API_KEY, Stripe, Forge/S3 dans .env

# Dev local avec Postgres accessible sur localhost:5433 :
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d db

# Stack complète (app sur http://localhost:8090) :
APP_PORT=8090 docker compose up --build
```

Application disponible sur **http://localhost:8090** en local (`APP_PORT=8090`) ou port **80** par défaut sur Hostinger.

### Déploiement Hostinger (Docker Manager)

1. Repo : `vincentmontesano-netizen/JardinAI`, branche `main`, fichier `docker-compose.yml`
2. Variables d'environnement **obligatoires** dans le panneau :
   - `JWT_SECRET` — secret long et aléatoire
   - `POSTGRES_PASSWORD` — mot de passe fort
   - `APP_PORT=80` — port exposé par Hostinger
   - `GEMINI_API_KEY` — clé Google AI
3. **Ne pas** définir `DATABASE_URL` ni `DB_HOST` dans le panneau (anciennes valeurs `supabase-db` / `jardinia-db` cassent le backend).
4. **Supprimez l’ancien projet** dans Docker Manager (volume PG15 Supabase incompatible), puis redéployez depuis `main`.
5. Relancer le déploiement — le volume **`jardinia_pg_v2`** créera une base PostgreSQL 16 vierge.

> **502 sur `/api/trpc/*`** : Nginx répond mais le backend est arrêté. Consultez les logs `backend` et `db` — cause fréquente : Postgres 16 sur un volume PG15 (`database files are incompatible`).

> Erreur `database files are incompatible` ou `supabase_admin` : l’ancien volume `jardinia_pg_data` (Supabase PG15) est encore monté. Suppression du projet obligatoire une fois.

> Ne pas utiliser l'image `supabase/postgres` sur un petit VPS : elle échoue souvent au healthcheck.  
> La stack utilise `postgres:16-alpine` (léger, stable).

Le backend attend que la base soit prête, exécute `drizzle-kit migrate`, puis démarre.  
Les variables `VITE_*` sont injectées au **build** du conteneur frontend — relancer `docker compose up --build` après modification.

Pour OAuth, configurer l'URL de redirection vers `http://localhost:8090/api/oauth/callback` (adapter si `APP_PORT` est modifié).

> Si vous lancez **uniquement** la base avec `docker compose up -d supabase-db` pour `pnpm dev`, utilisez  
> `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/postgres` (port hôte `POSTGRES_HOST_PORT`).

## Déploiement production (Docker)

Stack production en **4 conteneurs** : PostgreSQL, backend, frontend (Nginx), **Caddy** (HTTPS automatique).

| Service | Rôle | Exposé |
|---------|------|--------|
| `caddy` | TLS Let's Encrypt + reverse proxy | **80 / 443** |
| `frontend` | Assets React + proxy `/api` | interne |
| `backend` | Express + tRPC + migrations | interne |
| `db` | PostgreSQL 16 | interne (non exposé) |

### Prérequis serveur

- Docker + Docker Compose
- Nom de domaine pointant vers le serveur (A record → IP)
- Ports **80** et **443** ouverts

### Déploiement

```bash
cp .env.production.example .env
# Éditer .env : DOMAIN, JWT_SECRET, POSTGRES_PASSWORD, GEMINI, Stripe, Forge…

./docker/deploy.sh
```

Ou manuellement :

```bash
docker compose -f docker-compose.prod.yml --profile edge up -d --build
```

Application disponible sur **https://votre-domaine**.

### Configuration post-déploiement

| Service | URL à configurer |
|---------|------------------|
| Stripe webhook | `https://DOMAIN/api/stripe/webhook` |
| OAuth callback | `https://DOMAIN/api/oauth/callback` |

Les variables `VITE_*` et `APP_ID` sont injectées au **build** du frontend — relancer `docker compose -f docker-compose.prod.yml --profile edge up --build` après modification.

### Commandes utiles

```bash
pnpm docker:prod          # démarrer la stack prod
pnpm docker:prod:down     # arrêter
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml ps
```

### Sécurité production

- La base **n'est pas exposée** sur l'hôte (réseau Docker interne uniquement)
- Cookies de session en `Secure` derrière HTTPS (via `TRUST_PROXY=true`)
- Utiliser des secrets forts pour `JWT_SECRET` et `POSTGRES_PASSWORD`
- Stripe en mode **live** (`sk_live_…`, webhook live)

### Dépannage

| Problème | Solution |
|----------|----------|
| Caddy ne démarre pas (port 80) | Sur macOS, désactiver « Récepteur AirPlay » (Réglages → Général → AirDrop et Handoff). Sur le serveur, vérifier qu'aucun service n'écoute sur 80/443. |
| Certificat TLS échoue | Le domaine doit pointer (DNS A) vers l'IP du serveur **avant** le premier lancement. |
| `deploy.sh` refuse le `.env` | Remplir toutes les variables requises (voir `.env.production.example`). |
| Modifier `VITE_*` ou `APP_ID` | Rebuild : `docker compose -f docker-compose.prod.yml --profile edge up --build` |

## Fonctionnalités

- Landing page marketing
- Dashboard professionnel avec crédits
- Wizard de création de projet (questionnaire + upload S3 direct)
- Génération IA asynchrone avec file d'attente et retry
- Paiement Stripe (1 crédit = 6,99 EUR, pack 10 = 49,99 EUR)
- Export PDF du rapport (impression navigateur)
- Panel admin (stats, utilisateurs, projets)

## Tests

```bash
pnpm test
```

## Déploiement

Voir la section [Déploiement production (Docker)](#déploiement-production-docker) ci-dessus.

Pour un déploiement sans Docker : configurer `DATABASE_URL`, exécuter `pnpm db:push`, puis `pnpm build && pnpm start`.
