# Mon PEA

Application web (un seul fichier `index.html`, sans dépendance) qui reproduit la refonte de la rubrique PEA :

- **Accueil** : valeur du PEA, gains depuis l'ouverture, graphique (1S, 1M, 1A, 5A, Tout) avec lecture au doigt, boutons Acheter / Vendre, conseil malin, compteur 5 ans, versements, mes placements, notifications.
- **Acheter / Vendre en 3 gestes** : choix du placement, pavé numérique, calcul automatique des parts entières, confirmation « C'est fait ! » et notification.
- **Portefeuille** : valeur totale, répartition, détail de chaque placement (cours, PRU, plus-value), liquidités (verser / placer), historique, réinitialisation de la démo.
- **Avantages** : compteur fiscal 5 ans calculé à partir de la date d'ouverture, plafond de 150 000 €, règles du PEA, estimation de l'impôt évité.
- **Auto** : versement mensuel (25 / 50 / 100 / 200 €), simulation sur 10 ans à 5 %/an, arrondis, lancement / modification / arrêt du plan.

Les données sont fictives et enregistrées dans le navigateur (localStorage).

Pour l'utiliser : ouvrir `index.html` dans un navigateur, ou activer GitHub Pages sur la branche.
