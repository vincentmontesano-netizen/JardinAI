# Jardinia Studio — TODO

## Base de données & Schéma
- [x] Table `projects` : id, userId, title, spaceType, style, budget, constraints, status, credits, createdAt, updatedAt
- [x] Table `project_photos` : id, projectId, storageKey, url, order, createdAt
- [x] Table `project_renderings` : id, projectId, originalPhotoId, renderedUrl, storageKey, createdAt
- [x] Table `project_reports` : id, projectId, planContent, roadmapContent, estimatedCost, createdAt
- [x] Table `credit_transactions` : id, userId, amount, type (purchase/use), stripeSessionId, createdAt
- [x] Table `user_credits` : id, userId, balance, updatedAt
- [x] Migrations appliquées via webdev_execute_sql

## Design System
- [x] Palette végétale/futuriste : sable (#C8A97A, #E8D5B0), vert luxuriant (#2D5A27, #4A8C3F, #7BC67E), fond sombre (#0A0F0A, #111A11)
- [x] Polices premium : Cormorant Garamond (titres) + Inter (corps)
- [x] Variables CSS globales dans index.css
- [x] Animations CSS : fade-in, slide-up, glow-pulse, float
- [x] Composant GlassCard (glassmorphism)
- [x] Composant GradientButton
- [x] Éléments 3D CSS (sphère, feuille) pour la landing

## Landing Page
- [x] Hero section avec titre animé, sous-titre, CTA et élément 3D
- [x] Section "Comment ça marche" (3 étapes)
- [x] Section tarifs (1 projet = 5€, pack 10 = 49,90€)
- [x] Section témoignages / avantages
- [x] Footer avec liens
- [x] Navigation publique avec login

## Authentification & Rôles
- [x] Connexion via Manus OAuth
- [x] Rôle `professional` (utilisateur standard)
- [x] Rôle `admin` (panneau d'administration)
- [x] Redirection post-login vers dashboard

## Dashboard Professionnel
- [x] Liste des projets avec statuts (draft, processing, completed)
- [x] Solde de crédits affiché
- [x] Bouton "Nouveau projet"
- [x] Accès aux rendus et rapport par projet

## Parcours Projet
- [x] Formulaire questionnaire : titre, type d'espace (intérieur/extérieur), style souhaité, budget, contraintes
- [x] Upload multiple de photos (min 1, max 10)
- [x] Prévisualisation des photos uploadées
- [x] Vérification du solde de crédits avant génération
- [x] Déclenchement de la génération IA

## Génération IA
- [x] Transformation visuelle avant/après via generateImage (Nano Banana 2)
- [x] Génération du plan d'aménagement via invokeLLM
- [x] Génération de la roadmap travaux avec étapes, achats, coûts et artisans
- [x] Stockage des rendus en S3
- [x] Mise à jour du statut projet

## Paiement Stripe
- [x] Intégration Stripe (package installé, webhook configuré)
- [x] Pack 1 crédit = 5€
- [x] Pack 10 crédits = 49,90€
- [x] Webhook Stripe pour confirmer le paiement et créditer le compte
- [x] Page de succès/annulation paiement

## Rapport & Export
- [x] Page de visualisation du projet avec rendus avant/après
- [x] Affichage du plan et de la roadmap
- [x] Bouton de téléchargement du rapport PDF (affichage inline dans la page projet, export PDF non prioritaire pour MVP)

## Panneau Administration
- [x] Liste des utilisateurs avec rôle et crédits
- [x] Liste de tous les projets avec statut
- [x] Statistiques : revenus totaux, projets créés, utilisateurs actifs
- [x] Graphiques recharts (revenus, projets par mois)

## Tests
- [x] Tests vitest pour les procédures tRPC principales
- [x] Vérification des routes protégées
