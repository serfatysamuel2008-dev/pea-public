# Mon PEA

App d'épargne complète : **PEA, PEA-PME, compte-titres, assurance vie, contrat de capitalisation et PER**, avec comptes utilisateurs et données enregistrées sur le serveur.

## Version en ligne

La version démo (sans connexion, données gardées dans le navigateur de chaque visiteur) est publiée automatiquement sur GitHub Pages à chaque mise à jour de `main` :

https://serfatysamuel2008-dev.github.io/pea-public/

La publication passe d'abord par les tests : si un test échoue, le site en ligne n'est pas modifié.

## Lancer l'app

Il faut Node.js 22.13 ou plus récent. Aucune dépendance à installer.

```bash
npm start
```

Puis ouvrir http://localhost:3000, créer un compte, et c'est parti. À l'inscription, les 6 comptes démarrent avec des montants d'exemple.

| Variable | Rôle | Par défaut |
|---|---|---|
| `PORT` | Port d'écoute | `3000` |
| `DB_PATH` | Fichier de la base SQLite | `data/monpea.db` |
| `COOKIE_SECURE` | Mettre `1` en production derrière HTTPS | désactivé |

Avec Docker :

```bash
docker build -t mon-pea .
docker run -p 3000:3000 -v mon-pea-data:/data -e COOKIE_SECURE=1 mon-pea
```

## Tests

```bash
npm test
```

## Ce que fait l'app

- **Comptes utilisateurs** : inscription, connexion, déconnexion. Mots de passe hachés (scrypt), sessions dans un cookie `HttpOnly` / `SameSite=Lax`, connexion limitée après 8 échecs.
- **Le serveur fait foi** : chaque opération (achat, vente, versement, retrait, arbitrage…) est recalculée et vérifiée côté serveur avant d'être enregistrée. Le navigateur ne peut pas modifier un solde lui-même. Chaque opération est journalisée.
- **Page d'accueil principale** : nom et logo en grand, patrimoine total, comptes détenus (on touche un compte pour y entrer) et comptes à ouvrir (ouverture avec un premier versement facultatif). Dans un compte, toucher le logo en haut ramène à cette page.
- **6 produits** : chaque compte a ses 4 onglets (Supports, Avantages, Fiscalité, Transmission, Retraite…) et ses opérations.
- **Les cours bougent chaque jour** : chaque placement suit une évolution quotidienne calculée à l'identique sur le serveur et dans le navigateur. Les graphiques (1S, 1M, 1A, 5A, Tout), les performances et la valeur des comptes se mettent à jour tous les jours.
- **L'argent fructifie** : les supports des contrats (fonds euros à 2,6 %/an, ETF, immobilier, obligations) sont détenus en parts dont la valeur évolue. Un versement reste et suit cette valeur.
- **Versements programmés réels** : le montant choisi (libre, de 10 à 10 000 € par mois) est versé le 5 de chaque mois, arrondis compris. Sur un compte boursier, les mois s'additionnent jusqu'à pouvoir acheter une part.
- **Retirer ses liquidités** vers un compte courant externe (fictif) : libre sur le compte-titres, et sur PEA / PEA-PME après 5 ans. Avant 5 ans, l'app propose la clôture du plan (placements vendus, tout est viré), avec confirmation en deux temps.
- **Explorer** : catalogue de 68 ETF, actions et obligations avec graphiques, recherche, filtres et favoris.
- **Mode démo** : si l'app est ouverte sans serveur (fichier local, hébergement statique), elle fonctionne quand même, avec les données gardées dans le navigateur.

Les cours, graphiques et montants sont fictifs.

## Nom et logo

Ils se règlent en haut du script de `public/index.html` :

```js
const BRAND = {name:'Mon épargne', sub:'Investissement', logo:null};
```

`logo` accepte l'adresse d'une image placée dans `public/` (par exemple `'logo.svg'`). N'utilise le nom ou le logo d'une marque que si tu as le droit de le faire.

## Organisation du code

- `server.js` : serveur HTTP, base SQLite, authentification, API.
- `public/engine.js` : règles métier partagées par le serveur et le navigateur (produits, catalogue, calcul des parts, répartition, impôt, validation des opérations).
- `public/index.html` : l'interface.
- `test/api.test.js` : tests de l'API.

### API

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/register` | `{email, password, firstName}` : crée le compte et ouvre la session |
| `POST` | `/api/login` | `{email, password}` |
| `POST` | `/api/logout` | ferme la session |
| `GET` | `/api/me` | utilisateur et état de ses comptes |
| `POST` | `/api/op` | applique une opération, par exemple `{type:"order", account:"pea", mode:"buy", asset:"MO", amount:965}` |

## STUDIOS (boutique de lunettes)

Le dossier [`studios/`](studios/) contient un projet indépendant : la boutique en ligne STUDIOS. Voir [`studios/README.md`](studios/README.md).
