# STUDIOS — boutique de lunettes de soleil

Site e-commerce immersif pour STUDIOS : une monture ronde en 13 coloris, un prix unique (29,90 €), une page d'accueil « filmée » en 3D (la caméra suit la paire, la démonte et analyse chaque pièce), un panier persistant et un paiement Stripe.

React + TypeScript + Vite, Tailwind CSS, three.js, GSAP ScrollTrigger, Framer Motion, Lucide.

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
| Coloris (nom, textes, monture, verres, finition) | `src/data/products.ts` |
| Textes légaux (mentions, CGV, confidentialité) | `src/pages/Legal.tsx` |

Les informations à fournir avant la mise en ligne apparaissent sur le site surlignées en vert : **[À compléter : …]** (SIRET, hébergeur, adresse de retour, médiateur…). Les tarifs de livraison actuels sont des valeurs de démonstration : les remplacer puis passer `SHIPPING_RATES_CONFIRMED` à `true`.

Aucune caractéristique technique non vérifiée n'est affichée : dimensions, matériaux et catégorie de protection UV sont annoncés comme « publiés dès vérification ». Pas de faux avis, de faux stocks ni de fausses promotions.

### Visuels des lunettes

Les visuels viennent des photos produit réelles, rangées dans `photos/originals/<coloris>.jpg`. Le script `photos/process.py` en tire, dans `public/products/` :

- `<coloris>.webp` : la paire **détourée** (fond transparent, toutes au même cadrage), mise en scène sous les projecteurs sur le site ;
- `<coloris>-detail.webp` : un gros plan détouré (pont et verre).

Le fond des photos d'origine n'est jamais publié.

Le détourage utilise le modèle BiRefNet (via `rembg`). Pour ajouter un coloris :

```bash
python3 -m venv .venv && .venv/bin/pip install "rembg[cpu]" pillow
cp ma-photo.jpg photos/originals/nouveau-coloris.jpg
for f in photos/originals/*.jpg; do .venv/bin/python photos/process.py "$(basename "$f" .jpg)"; done
.venv/bin/python photos/process.py      # passe finale : cadrage commun à toutes les paires
```

puis ajouter l'entrée correspondante dans `src/data/products.ts`. Le premier lancement télécharge le modèle (~1 Go) ; un détourage prend environ 40 s par photo sur un processeur classique. Lancer une photo par commande évite de saturer la mémoire.

### Modèle 3D

La monture est modélisée en 3D dans `src/three/frameModel.ts`, d'après les photos : face d'un seul tenant (cercles et pont en trou de serrure dessinés par un champ de distance puis extrudés), verres, charnières et branches en pièces séparées pour la vue éclatée. L'aspect de chaque coloris (noir brillant, écaille, translucide, dégradé, marbre) est réglé dans le champ `look` de `src/data/products.ts`.

Le « film » de la page d'accueil (`src/three/Film.ts`, `src/components/film/FilmSection.tsx`) est une suite de plans (`SHOTS`) : position de la caméra, éclatement de la paire, pièce analysée. Le défilement de la page fait avancer le film.

Sur un appareil qui peine (plus de 45 ms par image), le rendu passe automatiquement en mode léger, sans réfraction ni ombres douces. On peut le forcer avec `?qualite=legere` dans l'adresse.

## Qualité

```bash
npm test          # tests unitaires : prix, panier, filtres, formulaire, serveur Stripe (vitest)
npm run e2e       # parcours d'achat complet dans un navigateur (avec npm run dev lancé)
npm run typecheck
```

Accessibilité et performance : navigation au clavier (focus visible, panier piégeant le focus, Échap), textes alternatifs sur chaque visuel, qualité 3D adaptative, images en `srcset` et chargement différé. Sans WebGL, le film affiche la paire détourée.

## Organisation

```
src/
  data/         catalogue et réglages de la boutique (source unique, lue aussi par le serveur)
  lib/          prix, filtres, validation, appels API, SEO
  store/        panier, favoris, notifications
  three/        modèle 3D de la monture et film de l'accueil
  components/
    layout/     Header, Footer, transitions de page
    film/       FilmSection (le film 3D de l'accueil)
    product/    ProductCard, ProductMedia (modèle 3D, paire détourée, gros plan)
    ui/         ProductImage, QtyStepper, FavoriteButton…
    cart/       CartDrawer
    anim/       Reveal, Tilt, Magnetic
  pages/        Accueil, Collection, Produit, Commande, Confirmation, Favoris, FAQ, Contact, pages légales
server/         API de paiement Stripe + service du site compilé
photos/         photos d'origine et script de détourage
e2e/            test du parcours d'achat
```
