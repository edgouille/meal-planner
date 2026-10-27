# Backend — MealPlanner

The MealPlanner backend will expose the REST API consumed by the frontend and handle business rules and relational data persistence. This directory currently contains documentation only; the API has not been implemented yet.

## Planned responsibilities

- Handle user registration and authentication.
- Provide operations to create, view, and manage recipes.
- Save and retrieve weekly meal plans, associating a recipe with a day and a mealtime.
- Generate shopping lists from the ingredients in planned meals and track purchased products.
- Enforce access rules so users can only view and modify their own data.
- Validate input and return consistent errors to the frontend.

## API and data

The API connects the frontend and backend. Document any changes to routes, parameters, or data formats and update the frontend when needed. Data will be stored in a relational database, in line with the project's technical goals.

## Planned stack

The backend will use Node.js, TypeScript, and Express to expose the REST API consumed by the React and TypeScript frontend.

## Configuration and startup

Prerequisites, environment variables, startup commands, and migration procedures will be documented here once they are defined. Never commit secrets or real user data.

## Related documentation

- [Project README](../README.md): product overview, requirements reference, and scope.
- [Development guidelines](../GUIDELINES.md): conventions shared by the frontend and backend.
- [Contributing guide](../CONTRIBUTING.md): setup, Git conventions, and preparing a pull request.
