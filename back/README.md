# Backend — MealPlanner

Le backend de MealPlanner expose l'API REST utilisée par le frontend et gère les règles métier ainsi que la persistance des données relationnelles.

## Responsabilités

- Gérer l'inscription et l'authentification des utilisateurs.
- Fournir les opérations nécessaires à la création, la consultation et la gestion des recettes.
- Enregistrer et restituer le planning hebdomadaire, avec une recette associée à un jour et à un moment de la journée.
- Générer les listes de courses à partir des ingrédients des repas planifiés et permettre le suivi des produits achetés.
- Appliquer les règles d'accès afin que chaque utilisateur ne puisse consulter et modifier que ses propres données.
- Valider les entrées et retourner des erreurs cohérentes au frontend.

## API et données

L'API constitue le lien entre le frontend et le backend. Toute évolution de ses routes, paramètres ou formats de données doit être documentée et répercutée dans le frontend si nécessaire. Les données sont stockées dans une base relationnelle, conformément aux objectifs du projet.

## Technologies

Le backend est développé avec Node.js, TypeScript et Express. Il expose l'API REST consommée par le frontend React et TypeScript.

## Configuration et lancement

Prérequis : Node.js 22 et Docker. La base PostgreSQL 16 tourne dans un conteneur.

```bash
cp .env.example .env   # valeurs de développement, à adapter si besoin
npm install
npm run db:up          # démarre PostgreSQL sur le port 5433
npm run db:migrate         # crée les tables
npm run db:import-ciqual   # remplit le catalogue d'ingrédients (table Ciqual)
npm run db:seed            # ajoute le compte de démo et ses données
```

Le compte de démo est `demo@mealplanner.local` (mot de passe `mealplanner-demo`). Il contient quatre recettes et un planning pour la semaine en cours. Le seed peut être relancé : il recrée ce compte à chaque fois.

| Commande | Effet |
|---|---|
| `npm run db:up` / `npm run db:down` | Démarre ou arrête la base et son interface web (les données sont conservées dans un volume Docker) |
| `npm run db:migrate` | Applique les migrations de `migrations/` qui ne l'ont pas encore été |
| `npm run db:import-ciqual` | Importe ou met à jour les aliments Ciqual et leurs valeurs nutritionnelles depuis `data/` |
| `npm run db:seed` | Recrée les données de démo |
| `npm run db:reset` | Vide la base, puis relance les migrations, l'import Ciqual et le seed (développement uniquement) |
| `npm run ciqual:build -- <dossier>` | Régénère les CSV de `data/` à partir des fichiers XML Ciqual |
| `npm run typecheck` | Vérifie les types TypeScript |

### Consulter la base

`npm run db:up` démarre aussi [pgweb](https://github.com/sosedoff/pgweb), une interface web disponible sur http://localhost:8081. Elle permet de parcourir les tables et les vues, de modifier des lignes et de lancer des requêtes SQL, sans aucune connexion à configurer. Elle n'est accessible que depuis votre machine.

pgweb ne dessine pas de diagramme, mais le schéma y est documenté : l'onglet **Structure** affiche la description de chaque colonne, et la vue `schema_relations` liste tous les liens entre les tables avec l'effet d'une suppression. Ces descriptions sont dans [migrations/005_document_schema.sql](migrations/005_document_schema.sql) : complétez-les quand vous ajoutez une table ou une colonne.

Pour une console SQL dans le terminal : `docker compose exec db psql -U mealplanner -d mealplanner`.

Le port 5433 évite un conflit avec un PostgreSQL déjà installé. Pour en changer, modifiez `DB_PORT` et `DATABASE_URL` dans `.env`.

Les secrets et les données réelles d'utilisateurs ne doivent jamais être versionnés : `.env` est ignoré par Git.

## Base de données

Le schéma est défini en SQL dans [migrations/](migrations/) :

- `users` : comptes ; email unique sans tenir compte de la casse, mot de passe stocké haché uniquement.
- `ingredients` : catalogue commun issu de la table Ciqual, nom unique, poids d'une pièce.
- `nutrients`, `ingredient_nutrients` : les 74 valeurs nutritionnelles Ciqual (énergie, macronutriments, minéraux, vitamines…) de chaque ingrédient, pour 100 g ou 100 ml.
- `recipes`, `recipe_ingredients`, `recipe_steps` : recettes d'un utilisateur, avec quantités, unités et étapes ordonnées.
- `planned_meals` : une recette par jour et par moment (`breakfast`, `lunch`, `dinner`).
- `shopping_lists`, `shopping_list_items` : listes générées pour une période, articles cochables.

Règles appliquées par la base :

- Supprimer un compte supprime toutes ses données.
- Une recette encore planifiée ne peut pas être supprimée.
- Une recette ne peut être planifiée que par son propriétaire.
- Un article de courses garde son libellé si l'ingrédient est retiré du catalogue.

### Valeurs nutritionnelles

Chaque valeur est une ligne de `ingredient_nutrients` : ingrédient, code du nutriment (celui de Ciqual, listé dans `nutrients`), quantité pour 100 g ou 100 ml et nature de la valeur (`qualifier`) :

- `exact` : valeur mesurée ;
- `less_than` : inférieure à la valeur indiquée (Ciqual écrit « < 0,5 ») ;
- `traces` : quantité infime, enregistrée à 0.

Une valeur inconnue n'a pas de ligne. Quelques codes utiles : 328 énergie (kcal), 25000 protéines, 31000 glucides, 32000 sucres, 34100 fibres, 40000 lipides, 40302 acides gras saturés, 10004 sel. Pour lire les valeurs avec leurs noms, utilisez la vue `ingredient_nutrient_details`.

Les apports des recettes sont calculés par des vues et ne sont jamais stockés :

```sql
-- Tous les nutriments d'une recette, au total et par portion
SELECT nutrient_name, total, per_serving, unit, is_complete FROM recipe_nutrients WHERE recipe_id = $1;

-- Raccourci pour les calories
SELECT total_kcal, kcal_per_serving, is_complete FROM recipe_calories WHERE recipe_id = $1;
```

Pour additionner, chaque quantité est convertie en grammes : 1 ml = 1 g, 1 c. à soupe = 15 g, 1 c. à café = 5 g, 1 pincée = 0,5 g. Pour `piece` et `bunch`, on utilise le poids `unit_weight_g` de l'ingrédient. Les traces et les valeurs `less_than` comptent pour 0. `is_complete` vaut `false` quand un ingrédient n'a pas de valeur pour ce nutriment ou pas de poids à la pièce : le total est alors sous-estimé, et l'interface doit l'indiquer.

Pour un ingrédient ajouté à la main, ajoutez ses valeurs dans `ingredient_nutrients`, au minimum l'énergie (code 328).

### Catalogue d'ingrédients (Ciqual)

Le catalogue contient les 3 484 aliments et leurs 74 valeurs nutritionnelles de la [table Ciqual 2025](https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/RDMHWY) de l'Anses (version du 3 novembre 2025, publiée le 19 novembre 2025). Pour chaque aliment, on garde son code (`ciqual_code`), son nom et son sous-groupe comme catégorie. Les fichiers versionnés sont `data/ciqual.csv` (un aliment par ligne, une colonne par code de nutriment) et `data/ciqual-nutrients.csv` (nom et unité de chaque nutriment).

Les recettes sont saisies à la main par l'équipe à partir de ces aliments. Ciqual ne donne pas de poids à la pièce : renseignez `unit_weight_g` quand une recette utilise `piece` ou `bunch` (1 oignon, 1 botte de coriandre). L'import ne touche pas à cette colonne ni aux ingrédients ajoutés à la main. En revanche, il remplace les valeurs nutritionnelles des aliments Ciqual : corrigez-les dans le CSV plutôt que dans la base.

Pour passer à une nouvelle version de Ciqual, téléchargez les fichiers XML (`alim_*.xml`, `alim_grp_*.xml`, `const_*.xml`, `compo_*.xml`), lancez `npm run ciqual:build -- <dossier>`, puis `npm run db:import-ciqual`. Pensez à mettre à jour la version citée ci-dessus.

Source : Anses. 2025. Table de composition nutritionnelle des aliments Ciqual. Données sous [Licence Ouverte / Etalab 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).

Pour faire évoluer le schéma, ajoutez un nouveau fichier numéroté (par exemple `002_add_favorites.sql`) au lieu de modifier une migration déjà appliquée. Chaque migration s'exécute dans une transaction.

Le hachage du mot de passe de démo (scrypt) est provisoire ; il devra suivre le format choisi pour l'authentification.

## Documentation associée

- [README du projet](../README.md) : présentation et périmètre fonctionnel.
- [Consignes de développement](../GUIDELINES.md) : conventions communes au frontend et au backend.
- [Contribution](../CONTRIBUTION.md) : préparation d'une contribution et d'une pull request.
