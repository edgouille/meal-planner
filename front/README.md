# Frontend — MealPlanner

The MealPlanner frontend provides the interface for users to manage recipes, organize weekly meals, and prepare shopping lists.

## Planned features

- Sign up and log in to access a personal account.
- View and manage recipes, including ingredients, quantities, and preparation steps.
- Schedule recipes by day and mealtime.
- View a shopping list generated from the meal plan and track purchased products.

## Frontend responsibilities

The frontend presents data and available actions to users and communicates with the backend REST API. It must not access the database directly. Permissions and business validation remain the backend's responsibility.

## Stack and setup

The frontend uses React, TypeScript, and Vite. Node.js 22 and npm are required. The planned backend uses Node.js, TypeScript, and Express.

Run these commands from the `front/` directory:

```bash
npm ci
npm run dev
```

Open the local URL displayed by Vite in your browser. To build and preview a production version:

```bash
npm run build
npm run preview
```

The current interface is a starter page. REST API integration and persistent data management will be added as the backend is developed. Never commit secrets or personal data.

## Related documentation

- [Architecture](../ARCHI.md): frontend feature folders, shared code, and API integration boundaries.

- [Project README](../README.md): product overview, requirements reference, and scope.
- [Development guidelines](../GUIDELINES.md): conventions shared by the frontend and backend.
- [Contributing guide](../CONTRIBUTING.md): setup, Git conventions, and preparing a pull request.
