# Convoi pour Le Petit Paradis — Plateforme Officielle CORA EVENTS

Plateforme web officielle pour la réservation, le paiement sécurisé et l'émargement du convoi vers **Le Petit Paradis** organisé par **CORA EVENTS** le **Dimanche 13 Décembre 2026** au départ de la **Gendarmerie d'Abobo (Abidjan)**.

---

## 🌟 Présentation du Projet

Ce site a été conçu avec une direction artistique haut de gamme et humaine, alignée avec l'identité de marque de CORA EVENTS :
* **Palette :** Or Champagne (`#C59A44`), Noir Obsidienne (`#100E10`), accents Bordeaux Prestige (`#4A151E`) et fond Crème nacré (`#FBF8F3`).
* **Typographie :** Polices Google Fonts *Outfit* (titres prestigieux) et *Plus Jakarta Sans* (lecture fluide et moderne).
* **Zéro trace d'IA :** Textes authentiques, chaleureux et ancrés dans le contexte ivoirien et islamique (invocations, bienveillance, respect de la pudeur, programme chronologique précis, etc.).

---

## 📁 Architecture des Fichiers

| Fichier / Dossier | Description |
| :--- | :--- |
| `index.html` | Page d'accueil officielle : Héro avec affiche du convoi, compte à rebours vivant, programme heure par heure, billetterie dynamique, checklist du voyageur, consignes, témoignages, partage WhatsApp, FAQ et contact. |
| `paiement.html` | Page de règlement en 3 étapes avec récapitulatif nominatif, bouton Wave direct et accès au pass. |
| `recu.html` | Pass d'embarquement officiel (e-billet) prêt à l'impression ou capture smartphone avec code d'embarquement. |
| `admin.html` | Espace Délégués & Organisation : console de bord avec KPIs en direct, recherche instantanée, filtres et feuille d'émargement imprimable. |
| `css/style.css` | Feuille de style complète, modulaire et responsive (mobile, tablette, desktop, print). |
| `js/main.js` | Logique d'interaction : compte à rebours temps réel, ajusteur de passagers (`+`/`-`), calcul dynamique, accordéons FAQ et notifications toast. |
| `js/paiement.js` | Chargement dynamique de la réservation et redirection vers le lien de paiement officiel SASPay. |
| `js/recu.js` | Génération et affichage du pass d'embarquement officiel. |
| `js/admin.js` | Gestion de l'espace délégués (authentification, statistiques, pointage, suppression). |
| `server.js` | Serveur Node.js / Express avec base de données cloud **Turso** (`@libsql/client`), authentification admin par cookie signé et API REST (compatible Vercel serverless). |
| `image/` | Affiche officielle du convoi (`petit paris.jpg`) et logo CORA EVENTS (`cora_event.png.jpeg`). |

---

## 🚀 Démarrage du Projet

### 1. Prérequis
* Node.js (version 18 ou supérieure recommandée)
* NPM

### 2. Lancement du Serveur
Dans le terminal, à la racine du projet :
```bash
npm start
```
Le serveur démarrera sur : **`http://localhost:3000`**

*(En mode développement avec rechargement automatique : `npm run dev`)*

---

## 🔑 Accès à l'Espace Délégués (`admin.html`)

L'espace délégué permet aux organisateurs (le jour J à la Gendarmerie d'Abobo) de pointer les passagers et de suivre les recettes.

* **URL directe :** `http://localhost:3000/admin.html` *(ou via le lien « Espace Délégués 🔒 » dans le footer du site)*
* **Identifiant par défaut :** `admin@coraevents.ci`
* **Mot de passe par défaut :** `CoraEvents2026`

### Fonctionnalités de l'Espace Délégués :
1. **Compteurs en direct :** Nombre total de passagers, nombre de dossiers, montant total encaissé.
2. **Recherche instantanée :** Retrouvez un passager en tapant simplement son nom, son numéro ou son N° de dossier (`#PP-0001`).
3. **Filtres par commune & statut :** Affichez uniquement les passagers d'Abobo, Cocody, Yopougon, etc.
4. **Validation en 1 clic :** Marquez un passager comme *Payé* lorsqu'il règle sur place.
5. **Impression de la Feuille d'Émargement :** Cliquez sur *« Imprimer la feuille d'émargement »* pour obtenir la liste papier officielle avec les cases à cocher pour le car.

---

## 📞 Support & Coordination

* **Organisation :** CORA_EVENT
* **Coordination :** Diarra Mohamed Lamine
* **Téléphone :** 05 03 52 61 91 / 01 05 24 52 25
* **WhatsApp :** +225 01 05 24 52 25
