# Mon PEA

App d'épargne complète : **PEA, PEA-PME, compte-titres, assurance vie, contrat de capitalisation et PER**, avec comptes utilisateurs et données enregistrées sur le serveur.

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
- **Mes comptes** : en touchant « Salut … · Mon PEA » sur l'Accueil, on passe d'un produit à l'autre. Chaque produit a ses 4 onglets (Supports, Avantages, Fiscalité, Transmission, Retraite…) et ses opérations.
- **Explorer** : catalogue de 68 ETF, actions et obligations avec graphiques, recherche, filtres et favoris.
- **Mode démo** : si l'app est ouverte sans serveur (fichier local, hébergement statique), elle fonctionne quand même, avec les données gardées dans le navigateur.

Les cours, graphiques et montants sont fictifs.

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
