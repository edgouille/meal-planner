# Development guidelines

These guidelines apply to both the MealPlanner frontend and backend. They complement the root README, which describes the product and its planned features.

## Organization

- `front/` contains the interface for managing recipes, weekly meal plans, and shopping lists.
- `back/` is reserved for the REST API, business rules, and access to persisted data. It currently contains documentation only.
- Keep frontend and backend responsibilities separate. The frontend consumes the API instead of accessing the database directly.
- Document technical decisions and prerequisites in the README for the relevant part of the project.

## Features and data

- Core features include recipe management, meal planning, shopping list generation and tracking, and user registration and login.
- Isolate personal data by user and check access rights for every operation.
- Recipes must support ingredients, quantities, and preparation steps.
- Meal planning associates a recipe with a day and a mealtime.
- Shopping lists are built from the ingredients in planned meals and track products that have already been purchased.
- Validate incoming data and return consistent, understandable errors.

## Quality and documentation

- Write all repository documentation and commit messages in English.
- Use descriptive names and keep functions and components focused on one responsibility.
- Avoid duplicating business rules between the frontend and backend; the backend remains the authority for business rules and permissions.
- Never commit secrets or real user data. Provide examples without sensitive information when configuration requires them.
- Update documentation and API examples whenever a contract or behavior changes.
- Before proposing a change, run the checks for the relevant part of the project and report their results in the pull request.
