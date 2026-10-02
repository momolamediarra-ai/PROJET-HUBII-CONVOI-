# 🚀 Guide de Déploiement sur Vercel — CORA EVENTS

## ⚠️ Contrainte importante : SQLite & Vercel

Vercel est une plateforme **serverless** avec un système de fichiers **éphémère** : la base de données SQLite (`database.db`) ne peut **pas être persistée** entre les requêtes. Chaque appel API repart d'une ardoise vierge.

### Solutions recommandées (choisir une) :

| Solution | Difficulté | Gratuit | Recommandé |
|---|---|---|---|
| **Turso** (SQLite distribué) | Facile | Oui | Oui |
| **PlanetScale / Neon** (MySQL/PostgreSQL) | Moyen | Oui | Oui |
| **Railway / Render** (hébergement classique) | Facile | Oui | Alternative |

---

## Option A — Déploiement rapide avec Turso (SQLite sur le cloud)

### 1. Créer une base Turso
```bash
npm install -g @turso/cli
turso auth login
turso db create cora-events-db
turso db show cora-events-db  # noter l'URL
turso db tokens create cora-events-db  # noter le token
```

### 2. Installer le client Turso dans le projet
```bash
npm install @libsql/client
```

### 3. Variables à ajouter dans Vercel
```env
TURSO_DATABASE_URL=libsql://votre-db.turso.io
TURSO_AUTH_TOKEN=votre_token
```

---

## Option B — Déploiement sur Railway (le plus simple, zéro changement de code)

Railway supporte SQLite nativement avec un volume persistant.

1. Aller sur https://railway.app
2. **New Project → Deploy from GitHub Repo**
3. Sélectionner `momolamediarra-ai/PROJET-HUBII-CONVOI-`
4. Ajouter les variables d'environnement (voir ci-dessous)
5. Railway détecte automatiquement Node.js

---

## Déploiement Vercel (etapes)

### 1. Installer Vercel CLI
```bash
npm install -g vercel
```

### 2. Se connecter
```bash
vercel login
```

### 3. Déployer
```bash
vercel        # preview
vercel --prod # production
```

### 4. Variables d'environnement sur Vercel

Dashboard Vercel → Settings → Environment Variables :

```env
SESSION_SECRET=votre_secret_tres_long_et_aleatoire
ADMIN_EMAIL=admin@coraevents.ci
ADMIN_PASSWORD=VotreMotDePasseAdmin
TURSO_DATABASE_URL=libsql://votre-base.turso.io
TURSO_AUTH_TOKEN=votre_token_turso
NODE_ENV=production
```

> Le paiement se fait via le **lien de paiement Wave** (constante `LIEN_PAIEMENT_WAVE` dans `js/paiement.js` à remplir ultérieurement) — aucune clé API complexe n'est requise. Les délégués peuvent également valider les paiements reçus depuis l'espace admin (`✓ Valider`).

---

## Structure des fichiers de déploiement

```
PROJET-HUBII-CONVOI-/
├── vercel.json          <- Config de déploiement Vercel
├── .env.example         <- Template des variables d'environnement
├── .gitignore           <- node_modules, .env, database.db exclus
├── server.js            <- Adapté serverless (module.exports)
└── package.json         <- Scripts npm start/dev
```

---

## Commandes utiles

```bash
npm start         # Lancer en local
vercel logs       # Voir les logs Vercel
vercel --prod     # Redéployer en production
```

---

## Recommandation finale

Pour un projet en production avec persistance des données :
- Utilise **Railway** pour le backend (zéro config, SQLite natif, domaine personnalisé)
- Ou migre vers **Turso** pour garder Vercel tout en ayant une vraie base SQLite cloud
