# Consignes de développement

Ces consignes s'appliquent au frontend et au backend de MealPlanner. Elles complètent le README racine, qui décrit le produit et ses fonctionnalités.

## Organisation

- `front/` contient l'interface utilisée pour gérer les recettes, le planning hebdomadaire et les courses.
- `back/` contient l'API REST, les règles métier et l'accès aux données persistées.
- Gardez les responsabilités du frontend et du backend séparées. Le frontend consomme l'API au lieu d'accéder directement à la base de données.
- Documentez les décisions techniques et les prérequis dans le README de la partie concernée.

## Fonctionnalités et données

- Les fonctionnalités principales sont la gestion des recettes, la planification des repas, la génération et le suivi des listes de courses, ainsi que l'inscription et la connexion.
- Les données personnelles doivent être isolées par utilisateur et les opérations doivent vérifier les droits d'accès.
- Une recette doit pouvoir décrire ses ingrédients, leurs quantités et ses étapes de préparation.
- La planification associe une recette à un jour et à un moment de la journée.
- La liste de courses est construite à partir des ingrédients des repas planifiés et permet de suivre les produits déjà achetés.
- Validez les données reçues et retournez des erreurs cohérentes et compréhensibles.

## Qualité et documentation

- Utilisez des noms explicites et gardez les fonctions et composants centrés sur une responsabilité.
- Évitez de dupliquer les règles métier entre le frontend et le backend ; le backend reste la référence pour les règles et les autorisations.
- Ne versionnez aucun secret ni donnée réelle d'utilisateur. Fournissez plutôt des exemples sans informations sensibles lorsque la configuration le nécessite.
- Mettez à jour la documentation et les exemples d'API lorsqu'un contrat ou un comportement change.
- Avant de proposer une modification, exécutez les vérifications prévues par la partie concernée et mentionnez leur résultat dans la pull request.
