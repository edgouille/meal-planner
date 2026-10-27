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

Les prérequis, variables d'environnement, commandes de lancement et procédures de migration seront documentés ici lorsqu'ils seront définis pour le projet. Les secrets et les données réelles d'utilisateurs ne doivent jamais être versionnés.

## Documentation associée

- [README du projet](../README.md) : présentation et périmètre fonctionnel.
- [Consignes de développement](../GUIDELINES.md) : conventions communes au frontend et au backend.
- [Contribution](../CONTRIBUTING.md) : installation, règles Git et préparation d'une pull request.
