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
npm run db:migrate     # crée les tables
npm run db:seed        # ajoute le compte de démo et ses données
```

Le compte de démo est `demo@mealplanner.local` (mot de passe `mealplanner-demo`). Il contient quatre recettes et un planning pour la semaine en cours. Le seed peut être relancé : il recrée ce compte à chaque fois.

| Commande | Effet |
|---|---|
| `npm run db:up` / `npm run db:down` | Démarre ou arrête la base et son interface web (les données sont conservées dans un volume Docker) |
| `npm run db:migrate` | Applique les migrations de `migrations/` qui ne l'ont pas encore été |
| `npm run db:seed` | Recrée les données de démo |
| `npm run db:reset` | Vide la base, puis relance les migrations et le seed (développement uniquement) |
| `npm run typecheck` | Vérifie les types TypeScript |

### Consulter la base

`npm run db:up` démarre aussi [pgweb](https://github.com/sosedoff/pgweb), une interface web disponible sur http://localhost:8081. Elle permet de parcourir les tables et les vues, de modifier des lignes et de lancer des requêtes SQL, sans aucune connexion à configurer. Elle n'est accessible que depuis votre machine.

Pour une console SQL dans le terminal : `docker compose exec db psql -U mealplanner -d mealplanner`.

Le port 5433 évite un conflit avec un PostgreSQL déjà installé. Pour en changer, modifiez `DB_PORT` et `DATABASE_URL` dans `.env`.

Les secrets et les données réelles d'utilisateurs ne doivent jamais être versionnés : `.env` est ignoré par Git.

## Base de données

Le schéma est défini en SQL dans [migrations/](migrations/) :

- `users` : comptes ; email unique sans tenir compte de la casse, mot de passe stocké haché uniquement.
- `ingredients` : catalogue commun, nom unique, calories pour 100 g ou 100 ml et poids d'une pièce.
- `recipes`, `recipe_ingredients`, `recipe_steps` : recettes d'un utilisateur, avec quantités, unités et étapes ordonnées.
- `planned_meals` : une recette par jour et par moment (`breakfast`, `lunch`, `dinner`).
- `shopping_lists`, `shopping_list_items` : listes générées pour une période, articles cochables.

Règles appliquées par la base :

- Supprimer un compte supprime toutes ses données.
- Une recette encore planifiée ne peut pas être supprimée.
- Une recette ne peut être planifiée que par son propriétaire.
- Un article de courses garde son libellé si l'ingrédient est retiré du catalogue.

### Calories

Les calories sont saisies sur les ingrédients (`kcal_per_100`, pour 100 g ou 100 ml). Celles des recettes sont calculées par la vue `recipe_calories` et ne sont jamais stockées :

```sql
SELECT total_kcal, kcal_per_serving, is_complete FROM recipe_calories WHERE recipe_id = $1;
```

Pour additionner, chaque quantité est convertie en grammes : 1 ml = 1 g, 1 c. à soupe = 15 g, 1 c. à café = 5 g, 1 pincée = 0,5 g. Pour `piece` et `bunch`, on utilise le poids `unit_weight_g` de l'ingrédient. `is_complete` vaut `false` quand un ingrédient n'a pas de calories renseignées ou pas de poids à la pièce : le total est alors sous-estimé, et l'interface doit l'indiquer.

Pour faire évoluer le schéma, ajoutez un nouveau fichier numéroté (par exemple `002_add_favorites.sql`) au lieu de modifier une migration déjà appliquée. Chaque migration s'exécute dans une transaction.

Le hachage du mot de passe de démo (scrypt) est provisoire ; il devra suivre le format choisi pour l'authentification.

## Documentation associée

- [README du projet](../README.md) : présentation et périmètre fonctionnel.
- [Consignes de développement](../GUIDELINES.md) : conventions communes au frontend et au backend.
- [Contribution](../CONTRIBUTION.md) : préparation d'une contribution et d'une pull request.
