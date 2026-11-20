# Internship assignment — Recipe details and personal notes

## Goal and scope

A signed-in MealPlanner user can open one of their recipes from **Mes recettes**. The page shows its ingredients, quantities, preparation steps, preparation time, and servings. On the same page, the user can write personal notes, such as preparation tips, save them, and find them again after reloading.

The work covers two Jira stories in epic EPIC-01 RECETTES ([SCRUM-5](https://edgarandre.atlassian.net/browse/SCRUM-5)):

| Story | Sub-tasks |
| --- | --- |
| [SCRUM-57](https://edgarandre.atlassian.net/browse/SCRUM-57) — US-14 View a recipe's details | SCRUM-58 `GET /api/recipes/:id`, SCRUM-59 details page, SCRUM-60 links from recipe cards |
| [SCRUM-61](https://edgarandre.atlassian.net/browse/SCRUM-61) — US-15 Add personal notes to a recipe | SCRUM-62 migration, SCRUM-63 `PATCH /api/recipes/:id/notes`, SCRUM-64 notes editor |

US-15 depends on US-14: the notes editor goes on the details page, and the notes come back with the recipe details. Recipe content stays read-only. Editing the title, ingredients, quantities, servings, or steps is out of scope, and creating recipes belongs to SCRUM-10. Confirm any additional scope with your mentor, such as formatting notes, sharing them, or a notes history.

## Day-one setup and dependencies

1. Get repository and Jira access from your mentor. Read [CONTRIBUTING.md](CONTRIBUTING.md), [ARCHI.md](ARCHI.md), and [GUIDELINES.md](GUIDELINES.md). Plan one branch and one pull request per story. Start `feat/scrum-57-recipe-details` from the latest `dev`. Start `feat/scrum-61-recipe-notes` once the first PR is merged, or from the first branch with your mentor's agreement.
2. Use Node.js 22 and a running Docker engine with Compose. Follow the [backend setup](back/README.md) to create `back/.env`, including a locally generated `AUTH_JWT_SECRET`. From the repository root, `npm run dev` starts PostgreSQL, the API, and Vite. `npm run db:demo` loads the Ciqual catalog and the demo account (`demo@mealplanner.local` / `mealplanner-demo`) with four recipes. Confirm that `GET /health` and `GET /ready` return 200 on `http://127.0.0.1:3000`.
3. Create a second local account through `/inscription` to test ownership. Recipes are private: a new account has no recipes, and there is no recipe creation screen yet. Ask your mentor how to add a recipe to the second account, for example by copying a demo recipe in pgweb (`http://localhost:8081`) or in SQL.
4. Create a dedicated test database whose name ends in `_test` and apply the migrations to it. The steps are in [back/README.md](back/README.md), in the users API section. Database-backed tests only run when `TEST_DATABASE_URL` points to it.
5. Agree with your mentor on the API contracts below before writing the UI. Authentication, the shared HTTP client, protected routing, and the shared header already exist. OpenAPI and type generation (SCRUM-54) is not available yet: mirror the response types by hand in the frontend feature, as `recipes.types.ts` already does. Reserve migration number `008` in SCRUM-62 before creating the file.

## Mission 1 — Implement the recipe details API (SCRUM-58)

Extend the existing module in `back/src/modules/recipes/`. The list endpoint (`GET /api/recipes`) is your reference for the contract, routes, controller, service, repository, and tests. The [shopping-lists module](back/src/modules/shopping-lists/) shows how to scope a read to the owner and return 404 for another account's data.

| Request | Expected result |
| --- | --- |
| `GET /api/recipes/:id` for an owned recipe | `200` with the recipe details in the standard `data` envelope. |
| A recipe that does not exist, or belongs to another account | `404 RECIPE_NOT_FOUND` using the shared error format. The two cases must not be distinguishable. |
| An `id` that is not a UUID | `400` using the shared validation error format. |
| No valid authentication | `401` using the shared error format. |

Example successful response:

```json
{
  "data": {
    "id": "8f0c…",
    "title": "Curry de pois chiches",
    "description": "Un curry doux au lait de coco, prêt en 35 minutes.",
    "prepMinutes": 35,
    "servings": 4,
    "ingredients": [
      { "ingredientId": "1b2c…", "name": "Pois chiche, appertisé, égoutté", "quantity": 400, "unit": "g" }
    ],
    "steps": [
      { "position": 1, "instruction": "Émincer l’oignon et le faire revenir 5 minutes." }
    ]
  }
}
```

- **Schemas and contract.** Add a strict `params` schema (`id` as a UUID) and a Zod details response schema next to the existing list schemas. Add a `get` entry to `recipesContract` with its success and error responses, and register the route with the shared authentication middleware.
- **Persistence.** Read the user ID from the verified authentication context, never from the request. Scope the recipe query with `WHERE id = $1 AND user_id = $2` using parameterized SQL and the shared pool. Read `recipe_ingredients` joined with `ingredients` for names, ordered by ingredient name, and `recipe_steps` ordered by `position`. PostgreSQL returns `numeric` quantities as strings: convert them deliberately, as ARCHI.md requires. Map snake_case columns to camelCase fields.
- **Tests.** In `back/tests/integration/recipes.test.ts`, cover these cases:
  - an owned recipe returns its details, with the `Cache-Control: no-store` header like the list endpoint;
  - a missing recipe and account B's recipe both return the same 404;
  - an invalid UUID returns 400;
  - missing or invalid authentication returns 401;
  - an unexpected failure returns a sanitized 500.

  Add a database-backed check with two accounts. It must read ingredients, quantities, and steps in order, and refuse account B. Delete its fixtures afterward.

## Mission 2 — Build the details page and link the cards (SCRUM-59, SCRUM-60)

Work in `front/src/features/recipes/` and reuse the shared authenticated client (`apiRequest` with `authenticated: true`).

1. **Routing.** Add a protected `/recettes/:id` route. `front/src/app/App.tsx` currently matches exact paths, so the redirect rules need to recognize this dynamic path. This is a shared entry point: agree on the change with your mentor and keep it small. Opening the URL while signed out must follow the sign-in flow. The **Mes recettes** link in the shared header should stay highlighted on the details page.
2. **Links from the list.** Make each `RecipeCard` lead to `/recettes/<id>` with a real link, so it works with the keyboard and middle-click. Internal links are already handled by `useInternalLinks` without a page reload.
3. **Details page.** Call `GET /api/recipes/:id` when entering the page and show an explicit state for each case:
   - **Loading:** a loading message.
   - **Error:** a message with a retry action.
   - **Recipe not found (404):** a message and a link back to **Mes recettes**.
   - **Success:**
     - the title, the description, the preparation time, and the servings;
     - the ingredients with their quantities in French units, all read-only;
     - the steps as an ordered list.

   Handle a missing description or preparation time like `RecipeCard` does. Set the document title to the recipe title.
4. **Units.** Display units as `2 pièces`, `1 c. à soupe`, `400 g`. The shopping-lists feature already has a formatter (`front/src/features/shopping-lists/shopping-lists.format.ts`). A feature must not import another feature's internals, so propose moving the unit formatting to `front/src/shared/lib/` in a small, separate change.
5. **Accessibility and layout.** Use the existing design tokens and CSS Modules, with the planning and shopping pages as visual references. Write the interface in French. Use one `h1` for the title and headings for sections. Make loading and error messages available to assistive technology. Check keyboard navigation and a 390 px mobile width.

## Mission 3 — Store and update personal notes (SCRUM-62, SCRUM-63)

1. **Migration.** Add `back/migrations/008_add_recipe_personal_notes.sql`. It adds a nullable `personal_notes` column to `recipes`, limited to 2,000 characters, with no default. Existing recipes keep `NULL` and nothing else changes. Add a French `COMMENT ON COLUMN`, as in `005_document_schema.sql`. Apply it with `npm run db:migrate` on your local and test databases. Never edit a migration that is already merged.
2. **API.**

| Request | Expected result |
| --- | --- |
| `PATCH /api/recipes/:id/notes` with `{ "personalNotes": "Ajouter le lait de coco hors du feu." }` | `200` with the full recipe details, including `personalNotes`. |
| The same request with `{ "personalNotes": null }` or a text that is empty after trimming | `200`. The notes are removed and `personalNotes` is `null`. |
| A body that is not a string or `null`, longer than 2,000 characters after trimming, containing `\0`, or with unknown fields | `400`. The stored notes stay unchanged. |
| A missing recipe or another account's recipe | `404 RECIPE_NOT_FOUND`. The other account's notes stay unchanged. |
| No valid authentication | `401`. |

- Add `personalNotes` (string or `null`) to the details response of Mission 1, so the details page reads it.
- Trim leading and trailing whitespace, but keep the line breaks inside the text.
- Run the ownership check and the write in a single statement: `UPDATE recipes SET personal_notes = $3 WHERE id = $1 AND user_id = $2`. The `updated_at` trigger also updates the recipe's modification date. Mention this in the PR.
- **Tests.** Cover these cases:
  - saving and then reading the notes back;
  - clearing them with `null` and with whitespace only;
  - every invalid body above;
  - exactly 2,000 characters accepted and 2,001 refused;
  - account B getting 404, with account A's notes unchanged;
  - missing authentication.

  The database-backed check must save, reload, clear, and refuse account B. It must also check that a recipe created before the update keeps its other columns.

## Mission 4 — Add the notes editor (SCRUM-64)

Add the editor to the details page from Mission 2. The settings page (`front/src/features/users/`) is a reference for form states.

1. **Editor.** Show a **Mes notes** section with a labelled multi-line field, prefilled with `personalNotes`, and a counter such as `120 / 2000`. Apply the same trim and length rules as the API for immediate feedback.
2. **Save.** Provide an **Enregistrer les notes** button, disabled while saving to prevent duplicate submissions. Send only `personalNotes`, with `null` when the trimmed text is empty. On success, replace the field with the returned value and show a confirmation. On failure, keep the typed text, show an error, and let the user retry. Handle `401` through the shared session-expiry behavior.
3. **Unsaved changes.** Indicate when the text differs from the saved notes. Ask your mentor whether leaving the page with unsaved changes should ask for confirmation.
4. **Accessibility and layout.** Associate the counter and errors with the field, announce confirmations and errors, and check the keyboard flow and the mobile layout.

## Acceptance checks

| Scenario | Expected behavior |
| --- | --- |
| Account A opens a recipe from **Mes recettes** | The details page shows the title, ingredients with quantities and units, ordered steps, preparation time, and servings. Nothing in the recipe can be edited. |
| A opens `/recettes/<id of a recipe owned by B>` or a random UUID | The page shows the not-found state. A direct API request returns 404 in both cases. |
| A signed-out visitor opens a details URL or calls either endpoint | The page follows the sign-in flow. The API returns 401. |
| The API is unreachable while loading | The page shows an error with a retry action. |
| A saves notes, then reloads | The notes are still there. B never sees them. |
| A clears the field and saves, then reloads | The notes are gone and the field is empty. |
| A types more than 2,000 characters, or the save fails | The UI explains the problem. A direct API request returns 400. After a failed save, the typed text is still in the field. |
| The migration runs on a database that already has recipes | Every existing recipe is unchanged, with `personal_notes` empty. |
| A keyboard user opens a recipe at mobile width | Links, the notes field, and the save action are reachable. The shared header is present. |

## Delivery

- Run `npm run build` in `front/`. Run `npm run typecheck`, `npm run build`, and `npm test` in `back/`, with `TEST_DATABASE_URL` set so the database-backed tests run.
- Document the new endpoints and the migration in [back/README.md](back/README.md), and the new page in [front/README.md](front/README.md).
- Open one pull request per story targeting `dev`: SCRUM-57 first, then SCRUM-61. Each PR includes:
  - the Jira references;
  - the agreed API contract;
  - desktop and mobile screenshots;
  - test results;
  - steps for replaying the scenarios with two local accounts.

  Move your Jira sub-tasks to **En cours de revue** when the PR is open.
