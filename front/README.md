# Frontend — MealPlanner

Le frontend de MealPlanner fournit l'interface permettant aux utilisateurs de gérer leurs recettes, d'organiser leurs repas sur la semaine et de préparer leurs courses.

## Fonctionnalités

- Inscription et connexion pour accéder à un espace personnel.
- Consultation et gestion des recettes, de leurs ingrédients, quantités et étapes.
- Planification des recettes par jour et moment de la journée.
- Consultation d'une liste de courses générée à partir du planning et suivi des produits achetés.

## Rôle du frontend

Le frontend présente les données et les actions disponibles à l'utilisateur, puis communique avec l'API REST du backend. Il ne doit pas accéder directement à la base de données. Les autorisations et la validation métier restent contrôlées par le backend.

## Technologies et lancement

Le frontend utilise React, TypeScript et Vite. Node.js et npm sont requis. Le backend associé utilise Node.js, TypeScript et Express.

```bash
npm ci
npm run dev
```

Vite affiche l'adresse locale à ouvrir dans le navigateur. Pour créer et prévisualiser une version de production :

```bash
npm run build
npm run preview
```

L'interface actuelle est une première maquette interactive. Les connexions à l'API REST et les fonctionnalités de gestion persistante seront intégrées à mesure que le backend sera développé. Ne placez pas de secrets ou de données personnelles dans le dépôt.

## Documentation associée

- [README du projet](../README.md) : présentation et périmètre fonctionnel.
- [Consignes de développement](../GUIDELINES.md) : conventions communes au frontend et au backend.
- [Contribution](../CONTRIBUTING.md) : installation, règles Git et préparation d'une pull request.
