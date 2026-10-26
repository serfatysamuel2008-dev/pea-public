# STUDIOS — boutique de lunettes de soleil

Site e-commerce immersif pour STUDIOS : 14 modèles, un prix unique (29,90 €), une scène 3D temps réel, un panier persistant et un paiement Stripe.

React + TypeScript + Vite, Tailwind CSS, Framer Motion, GSAP ScrollTrigger, three.js / React Three Fiber, Lucide.

## Lancer le site

Il faut Node.js 22.18 ou plus récent.

```bash
cd studios
npm install
npm run dev        # le site, sur http://localhost:5173
npm run server     # dans un 2e terminal : l'API de paiement, sur http://localhost:8787
```

Sans `npm run server` (ou sans clé Stripe), la boutique fonctionne en **mode démonstration** : on peut tout parcourir et remplir le formulaire, mais aucune commande n'est créée et un bandeau l'indique clairement.

## Paiement (Stripe)

1. Créer un compte sur https://dashboard.stripe.com et récupérer la clé secrète **de test** (`sk_test_…`).
2. Copier `.env.example` en `.env` et y mettre `STRIPE_SECRET_KEY` et `PUBLIC_URL` (l'adresse du site, `http://localhost:5173` en local).
3. Relancer `npm run server`. Le bouton devient « Payer XX € » et redirige vers la page de paiement hébergée par Stripe (Stripe Checkout).
4. Carte de test : `4242 4242 4242 4242`, date future, n'importe quel code.

Ce qui est garanti :

- **Les prix sont recalculés par le serveur** depuis le catalogue. Le navigateur n'envoie que des identifiants et des quantités.
- **La page de confirmation interroge Stripe** : elle n'affiche « commande confirmée » (et ne vide le panier) que si la session est `complete` et `paid`. Sans paiement validé, elle affiche « Paiement non confirmé ».
- Les données de carte ne passent jamais par le site.

Webhook (recommandé en production) : `stripe listen --forward-to localhost:8787/api/stripe/webhook`, puis mettre le secret affiché dans `STRIPE_WEBHOOK_SECRET`. Les commandes payées sont alors ajoutées à `server/orders.jsonl`. C'est le point de branchement prévu pour un vrai système de commandes (base de données, OMS, envoi d'e-mails, stocks).

## Mise en ligne

```bash
npm run build                 # génère dist/
PUBLIC_URL=https://ton-domaine.fr STRIPE_SECRET_KEY=sk_live_… npm run server
```

`npm run server` sert à la fois le site compilé (`dist/`) et l'API, sur un seul port (`PORT`, 8787 par défaut). Il peut tourner sur n'importe quel hébergeur Node (Render, Railway, Fly.io, un VPS…), derrière HTTPS.

Hébergement statique seul (Netlify, Vercel, GitHub Pages) : le site fonctionne, en mode démonstration. Les URL étant de vraies adresses (`/produit/chrome`), configurer la redirection de toutes les routes vers `index.html`. Variable `BASE_PATH` pour un site servi dans un sous-dossier (ex. `BASE_PATH=/studios/ npm run build`).

## Modifier le contenu

| Quoi | Où |
|---|---|
| Prix unique, livraison, pays, délai de retour, e-mail, réseaux sociaux | `src/data/shop.ts` |
| Modèles (nom, textes, forme, couleurs, verres) | `src/data/products.ts` |
| Textes légaux (mentions, CGV, confidentialité) | `src/pages/Legal.tsx` |

Les informations à fournir avant la mise en ligne apparaissent sur le site surlignées en vert : **[À compléter : …]** (SIRET, hébergeur, adresse de retour, médiateur…). Les tarifs de livraison actuels sont des valeurs de démonstration : les remplacer puis passer `SHIPPING_RATES_CONFIRMED` à `true`.

Aucune caractéristique technique non vérifiée n'est affichée : dimensions, matériaux et catégorie de protection UV sont annoncés comme « publiés dès vérification ». Pas de faux avis, de faux stocks ni de fausses promotions.

### Visuels des lunettes

Les packshots (`public/products/<modèle>-<vue>.webp`, 4 vues par modèle) sont **générés** à partir d'un modèle 3D paramétrique (`src/three/buildGlasses.ts`) : forme des verres, épaisseur, finition (acétate, mat, métal, écaille, cristal), teinte et dégradé des verres, effet miroir. Le même générateur alimente la scène 3D de la page d'accueil et la vue 360° des fiches produit.

Après avoir ajouté ou modifié un modèle :

```bash
npm run render              # tous les modèles
npm run render -- volt neon # seulement certains
```

(nécessite Playwright : `npm i -D playwright && npx playwright install chromium`).

Pour passer aux **vraies photos** des produits, remplacer les fichiers `.webp` en gardant les mêmes noms (format 4:3, fond transparent idéalement). La section campagne (`src/components/home/Campaign.tsx`) utilise une silhouette graphique en attendant une vraie photo de mannequin : remplacer `<Silhouette />` par une image.

## Qualité

```bash
npm test          # tests unitaires : prix, panier, filtres, formulaire, serveur Stripe (vitest)
npm run e2e       # parcours d'achat complet dans un navigateur (avec npm run dev lancé)
npm run typecheck
```

Accessibilité et performance : navigation au clavier (focus visible, panier piégeant le focus, Échap), textes alternatifs sur chaque visuel, réglage « réduire les animations » respecté (pas d'intro, pas de 3D, pas de défilement automatique), 3D remplacée par les packshots sur les appareils modestes ou sans WebGL, three.js chargé uniquement quand une scène 3D s'affiche, images en `srcset` et chargement différé.

## Organisation

```
src/
  data/         catalogue et réglages de la boutique (source unique, lue aussi par le serveur)
  lib/          prix, filtres, validation, appels API, SEO
  store/        panier, favoris, notifications
  three/        générateur 3D des lunettes et scène temps réel
  components/
    layout/     Header, Footer, transitions de page
    home/       Intro, Hero, Manifesto, Lineup, FindYourFrame, Campaign, PriceSection, Marquee…
    product/    ProductCard, ProductMedia (galerie, zoom, 360°)
    cart/       CartDrawer
    anim/       Reveal, Tilt, Magnetic
  pages/        Accueil, Collection, Produit, Commande, Confirmation, Favoris, FAQ, Contact, pages légales
server/         API de paiement Stripe + service du site compilé
scripts/render/ génération des packshots
e2e/            test du parcours d'achat
```
