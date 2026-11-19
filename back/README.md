# Backend — MealPlanner

The MealPlanner backend provides a REST API consumed by the frontend. The API exposes health checks, account registration, and login. PostgreSQL migrations, the Ciqual import, and the demo seed are available as explicit setup commands.

## Recipe list API

`GET /api/recipes` lists the signed-in user's recipes (SCRUM-17, part of SCRUM-9 / epic SCRUM-5). Send the existing JWT as `Authorization: Bearer <accessToken>`. The owner is always taken from that token; callers cannot select another user.

| Query parameter | Behavior | Default |
|---|---|---|
| `q` | Case-insensitive literal substring of the title, trimmed, at most 150 characters. An empty value lists all owned recipes. `%` and `_` are ordinary characters. | Empty |
| `page` | Integer from 1 to 1000000 | `1` |
| `pageSize` | Integer from 1 to 100 | `20` |

```json
{
  "data": [{ "id": "3f0c5a52-4f6d-4c55-9a43-6d2b1f5e8a01", "title": "Soupe du jardin", "description": null, "prepMinutes": 20, "servings": 2 }],
  "pagination": { "page": 1, "pageSize": 20, "total": 1 }
}
```

Results are ordered by case-insensitive title, then the original title and ID for stable pagination. `total` counts all matching owned recipes before pagination; an out-of-range page returns an empty `data` array with the same total. Empty accounts and searches with no matches return `200` with an empty array. Description and preparation time can be `null`.

Missing, invalid, or expired tokens return `401`. Invalid or unknown query fields (including `userId`) return `400`. SQL uses parameters and filters both result rows and counts by owner. Responses use `Cache-Control: no-store`; unexpected failures use the shared sanitized error envelope.

The module exports its Zod schemas, inferred types, and `recipesContract` metadata through its public `index.ts`. OpenAPI generation remains tracked in SCRUM-54. No database migration is needed. The existing demo seed contains recipes; a newly registered account starts empty. Recipe creation is a separate story (SCRUM-10).

The HTTP tests cover authentication, validation, ownership, filtering, pagination and errors. With `TEST_DATABASE_URL` set to a migrated dedicated database ending in `_test`, an additional test checks the actual repository with two accounts and rolls back its fixtures.

## Planned API responsibilities

- Provide operations to create, view, and manage recipes.
- Save and retrieve weekly meal plans, associating a recipe with a day and a mealtime.
- Generate shopping lists from the ingredients in planned meals and track purchased products.
- Enforce access rules so users can only view and modify their own data.
- Validate input and return consistent errors to the frontend.

## API and data

The API will connect the frontend and backend. Document any changes to routes, parameters, or data formats and update the frontend when needed. Data is stored in a PostgreSQL relational database.

## Stack

The backend uses Node.js 22, TypeScript, Express 5, and PostgreSQL 16. It retains ES modules and the `NodeNext` TypeScript configuration.

## Configuration and startup

Prerequisites: Node.js 22, npm, and Docker with Docker Compose. PostgreSQL 16 runs in a container.

Run these commands from the `back/` directory:

```bash
cp .env.example .env       # Development values; adjust as needed
npm ci
npm run db:up             # Start PostgreSQL on port 5433 and pgweb
npm run db:migrate        # Create the database schema
npm run db:import-ciqual  # Populate the ingredient catalog
npm run db:seed           # Create the demo account and its data
```

In PowerShell, use `Copy-Item .env.example .env` to copy the configuration file.

The demo account is `demo@mealplanner.local`, with the password `mealplanner-demo`. It includes four recipes and a meal plan for the current week. The seed can be run again: each execution deletes and recreates this demo account and its data.

| Command | Purpose |
|---|---|
| `npm run db:up` / `npm run db:down` | Start or stop the database and its web interface. Data is retained in a Docker volume. |
| `npm run db:migrate` | Apply migrations from `migrations/` that have not been applied yet. |
| `npm run db:import-ciqual` | Import or update Ciqual foods and their nutritional values from `data/`. |
| `npm run db:seed` | Recreate the demo account and its data. |
| `npm run db:reset` | Clear the database, then run migrations, the Ciqual import, and the seed. For local development only. |
| `npm run ciqual:build -- <directory>` | Regenerate the CSV files in `data/` from Ciqual XML files. |
| `npm run typecheck` | Check TypeScript types. |

### Browsing the database

`npm run db:up` also starts [pgweb](https://github.com/sosedoff/pgweb), a web interface available at [http://localhost:8081](http://localhost:8081). It lets you browse tables and views, edit rows, and run SQL queries without configuring a connection manually. Its port is bound to the local machine.

pgweb does not draw a relationship diagram, but the schema is documented inside the database:

- The **Structure** tab displays descriptions for each column.
- The `schema_relations` view lists relationships between tables and their deletion behavior.

These descriptions are defined in [migrations/005_document_schema.sql](migrations/005_document_schema.sql). Keep schema descriptions up to date through new migrations whenever you add a table or column.

To open a SQL console in the terminal:

```bash
docker compose exec db psql -U mealplanner -d mealplanner
```

Port `5433` avoids conflicts with an existing PostgreSQL installation. To change it, update both `DB_PORT` and `DATABASE_URL` in `.env`.

Never commit secrets or real user data. The `.env` file is ignored by Git.

### Running the API

From `back/`, after installing dependencies and copying `.env.example`:

```bash
npm run dev       # Start with automatic reload
npm run typecheck # Check application, scripts, and test types
npm test          # Run focused TypeScript tests
npm run build    # Compile application code into dist/
npm start        # Run dist/server.js
```

The runtime loads `.env` once without overwriting environment variables already set by the caller. The application can be imported for tests without starting a server or connecting to PostgreSQL. Database migrations, imports, and seeds remain explicit commands; startup never runs them.

| Variable | Purpose | Default |
|---|---|---|
| `NODE_ENV` | `development`, `test`, or `production` | `development` |
| `HOST` | HTTP listening host | `127.0.0.1` |
| `PORT` | HTTP port, from 1 to 65535 | `3000` |
| `DATABASE_URL` | PostgreSQL URL including a host and database name | Required |
| `FRONTEND_ORIGIN` | Frontend HTTP(S) origin, without a path | `http://localhost:5173` |
| `SHUTDOWN_TIMEOUT_MS` | Maximum graceful shutdown time | `10000` |
| `READINESS_TIMEOUT_MS` | Total database readiness deadline, in milliseconds | `2000` |

`SIGINT` and `SIGTERM` stop accepting requests, let active requests finish, and close the shared PostgreSQL pool. A shutdown that exceeds the deadline terminates the process with an error.

Feature modules export an `ApiModule` with a `basePath` and an Express router. Pass modules to `createApp({ modules })` to register them without accessing another feature's internals.

### Request validation, errors, and logging

Middleware runs in this order: request ID and logging, CORS, JSON parsing (1 MiB maximum), feature routers, unknown-route handling, then the shared error handler. CORS advertises the configured `FRONTEND_ORIGIN`; it does not provide authentication or authorization.

Each feature owns its Zod schemas. Use `validateRequest({ body, params, query })` on a route, then `validatedRequest(schemas, res)` in its controller to read parsed, typed input. Query coercion and defaults belong in those schemas. Parsed values are stored separately from raw Express input. Pass plain values to services, never Express request or response objects.

Errors have this public shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [{ "field": "body.name", "code": "too_small", "message": "Invalid value." }]
  }
}
```

Validation and malformed JSON return `400`, unknown routes return `404`, oversized JSON returns `413`, and unexpected errors return a generic `500`. Use `ApiError` for intentional public errors, including `401`, `403`, `404`, and `409`. Its messages and details must be safe for clients. `errorResponseSchema` provides the shared Zod contract and inferred TypeScript type.

Every response carries a generated `X-Request-Id`. Logs contain only that ID, the request method, status, duration, and event name. They omit URLs, bodies, query strings, headers, exception messages, SQL, passwords, and tokens. Unexpected exceptions create a correlated `request_error` event; do not add raw error objects to it.

### Health and readiness

| Endpoint | Success | Failure | Database access |
|---|---|---|---|
| `GET /health` | `200`, `{ "data": { "status": "ok" } }` | Process is unreachable | None |
| `GET /ready` | `200`, `{ "data": { "status": "ready" } }` | `503`, error code `DATABASE_UNAVAILABLE` | `SELECT 1` through the shared pool |

Use `/health` to check process liveness and `/ready` to decide whether it can serve database-backed requests. Both endpoints are public. A failed database must not cause liveness to fail. Readiness does not verify migrations, catalog imports, or domain data.

`READINESS_TIMEOUT_MS` bounds the complete readiness check, including waiting for a pooled connection. A timed-out active query destroys its connection; a connection acquired after the deadline is released without running SQL. The shared pool also limits connection establishment and pool acquisition to two seconds. Errors never expose SQL, credentials, connection strings, or stack traces.

The health module's public `index.ts` exports its factory, response schemas and types, and `healthContract` endpoint metadata. Contracts can be imported without environment configuration or database access. OpenAPI generation and Swagger UI will be added in SCRUM-54; `/docs` and `/openapi.json` are not available yet.

`npm test` runs isolated HTTP checks, including database failure and timeout cases. To also check against a real PostgreSQL instance, set `TEST_DATABASE_URL` to a dedicated database whose name ends in `_test`, then run `npm test`. This optional check only executes `SELECT 1`; it does not migrate, reset, seed, or import data. Never use a personal or production database for tests.

```powershell
$env:TEST_DATABASE_URL = 'postgres://test:test@localhost:55433/mealplanner_test'
npm test
Remove-Item Env:TEST_DATABASE_URL
```

## Authentication API

From `back/`, copy `.env.example` to `.env` if needed. Generate a signing key with Node and save the output as `AUTH_JWT_SECRET` in `.env`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Start PostgreSQL, apply the existing migrations with `npm run db:migrate`, and run `npm run dev`. The default API URL is `http://127.0.0.1:3000`. Set `FRONTEND_ORIGIN` to the exact frontend origin if it differs from `http://localhost:5173`.

| Route | JSON body | Result |
| --- | --- | --- |
| `POST /api/auth/register` | `{"email":"camille@example.test","password":"local-password-123","displayName":"Camille Martin"}` | `201` with a session. A duplicate email returns `409 EMAIL_ALREADY_REGISTERED`. |
| `POST /api/auth/login` | `{"email":"camille@example.test","password":"local-password-123"}` | `200` with a session. An unknown email or wrong password returns `401 INVALID_CREDENTIALS`. |

Send `Content-Type: application/json`. Both routes return `400 VALIDATION_ERROR` for invalid fields. Registration requires an email, a password of 12–256 characters, and a display name of 1–100 characters after trimming. The API trims and lowercases the email. Passwords are used verbatim.

Both success responses use this shape:

```json
{
  "data": {
    "accessToken": "<signed JWT>",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "9a88e1e8-d81d-41eb-9f73-cc14e2128b50",
      "email": "camille@example.test",
      "displayName": "Camille Martin"
    }
  }
}
```

The client sends `Authorization: Bearer <accessToken>` to protected routes. The token expires after one hour and the client then signs in again. The backend provides `requireAuthentication(tokens)` for future protected routes. When mounted before a handler, it verifies the token and sets `res.locals.auth.userId`. For a populated local database, the demo credentials above can also be used with the login endpoint.

## Users API

Both routes require `Authorization: Bearer <accessToken>` and act on the account identified by the token. A `userId` or `email` sent by the client is never used to choose the account.

| Route | JSON body | Result |
| --- | --- | --- |
| `GET /api/users/me` | None | `200` with the current profile. |
| `PATCH /api/users/me` | `{"displayName":"Camille Martin"}` | `200` with the updated profile. |

Both success responses use this shape and are sent with `Cache-Control: no-store`:

```json
{
  "data": {
    "email": "camille@example.test",
    "displayName": "Camille Martin"
  }
}
```

- `displayName` is required. It must be a string; it is trimmed, then must contain 1–100 characters. Any other field, such as `email` or `userId`, is rejected. An invalid body returns `400 VALIDATION_ERROR` (or `400 INVALID_JSON`) and leaves the stored profile unchanged.
- A missing, malformed, expired, or wrongly signed token returns `401 UNAUTHENTICATED` on both routes, before the body is validated.
- A valid token whose account no longer exists returns `404 USER_NOT_FOUND`.

The `users` module receives the authentication middleware from `server.ts` (`createUsersModule(repository, requireAuthentication(tokens))`), so tests can mount it with their own signing key. `usersContract` describes both endpoints for the future OpenAPI document (SCRUM-54).

To replay the checks with two local accounts, sign in as the demo account and register a second one through `POST /api/auth/register` or the `/inscription` page. `npm test` covers these routes with an in-memory repository. With `TEST_DATABASE_URL` set (see "Health and readiness"), it also checks that an update by one of two PostgreSQL accounts is stored and leaves the other unchanged; that check runs in a transaction that is rolled back. To create and migrate a local test database in the Compose container:

```powershell
docker compose exec db createdb -U mealplanner mealplanner_test
$env:DATABASE_URL = 'postgres://mealplanner:mealplanner@localhost:5433/mealplanner_test'
npm run db:migrate
Remove-Item Env:DATABASE_URL
$env:TEST_DATABASE_URL = 'postgres://mealplanner:mealplanner@localhost:5433/mealplanner_test'
npm test
Remove-Item Env:TEST_DATABASE_URL
```

## Database

The schema is defined in SQL in [migrations/](migrations/):

- `users`: accounts with case-insensitive unique email addresses and hashed passwords.
- `ingredients`: a shared catalog imported from Ciqual, with unique names and optional weight per piece.
- `nutrients`, `ingredient_nutrients`: each ingredient's 74 Ciqual nutritional values, including energy, macronutrients, minerals, and vitamins, per 100 g or 100 ml.
- `recipes`, `recipe_ingredients`, `recipe_steps`: user recipes with quantities, units, and ordered preparation steps.
- `planned_meals`: one recipe per user, day, and mealtime (`breakfast`, `lunch`, or `dinner`).
- `shopping_lists`, `shopping_list_items`: shopping lists for a date range. Each item stores its purchased state in `is_purchased`.

The database enforces these rules:

- Deleting an account deletes its associated data.
- A recipe that is still scheduled cannot be deleted.
- A recipe can only be scheduled by its owner.
- A shopping list item retains its label if its ingredient is removed from the catalog.

### Nutritional values

Each nutritional value is a row in `ingredient_nutrients`, containing the ingredient, nutrient code from `nutrients`, amount per 100 g or 100 ml, and a value qualifier:

- `exact`: a measured value.
- `less_than`: below the specified amount, such as a Ciqual value written as `< 0.5`.
- `traces`: a trace amount, stored as zero.

Unknown values have no corresponding row.

Useful nutrient codes include:

| Code | Nutrient |
|---|---|
| `328` | Energy in kcal |
| `25000` | Protein |
| `31000` | Carbohydrates |
| `32000` | Sugars |
| `34100` | Fiber |
| `40000` | Fat |
| `40302` | Saturated fatty acids |
| `10004` | Salt |

Use the `ingredient_nutrient_details` view to read values alongside ingredient and nutrient names.

Recipe nutrition totals are calculated through views rather than stored:

```sql
-- All nutrients for a recipe, in total and per serving
SELECT nutrient_name, total, per_serving, unit, is_complete
FROM recipe_nutrients
WHERE recipe_id = $1;

-- Calorie summary
SELECT total_kcal, kcal_per_serving, is_complete
FROM recipe_calories
WHERE recipe_id = $1;
```

`$1` represents the recipe ID supplied as a query parameter.

For calculations, quantities are converted to grams using the current assumptions:

- 1 ml = 1 g.
- 1 tablespoon = 15 g.
- 1 teaspoon = 5 g.
- 1 pinch = 0.5 g.
- `piece` and `bunch` use the ingredient's `unit_weight_g`.

Trace amounts and `less_than` values contribute zero. These conversions are approximations, so the results should be treated as estimates.

`is_complete` is `false` when an ingredient lacks a value for the nutrient or cannot be converted because its required unit weight is missing. The total then underestimates the recipe's nutritional content, and the interface must indicate that it is incomplete.

For manually added ingredients, populate `ingredient_nutrients` with nutritional values, including at least energy using code `328`.

### Ingredient catalog — Ciqual

The catalog contains 3,484 foods and their 74 nutritional values from the Anses [Ciqual 2025 dataset](https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/RDMHWY), version dated November 3, 2025, published November 19, 2025.

For each food, the import retains its code (`ciqual_code`), name, and subgroup as its category. The versioned files are:

- `data/ciqual.csv`: one food per row, with one column per nutrient code.
- `data/ciqual-nutrients.csv`: the name and unit for each nutrient.

The team creates recipes manually using these foods. Ciqual does not provide weight per piece: populate `unit_weight_g` when a recipe uses `piece` or `bunch`, such as one onion or one bunch of coriander.

The import preserves `unit_weight_g` and manually added ingredients. It replaces the nutritional values of Ciqual foods, so make corrections in the CSV rather than directly in the database.

To update to a new Ciqual version:

1. Download the XML files: `alim_*.xml`, `alim_grp_*.xml`, `const_*.xml`, and `compo_*.xml`.
2. Run `npm run ciqual:build -- <directory>`.
3. Run `npm run db:import-ciqual`.
4. Update the dataset version documented above.

Source: Anses. 2025. *Ciqual food composition table*. Data licensed under the [Open Licence / Etalab 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).

### Schema changes

Add a new numbered migration, such as `006_add_favorites.sql`, instead of modifying an already applied migration. Each migration runs in a transaction.

The demo account uses the same scrypt password format as the authentication module and can sign in through the login endpoint.

## Related documentation


- [Architecture](../ARCHI.md): backend modules, shared HTTP behavior, data ownership, and OpenAPI generation.


- [Project README](../README.md): product overview, requirements reference, and scope.
- [Development guidelines](../GUIDELINES.md): conventions shared by the frontend and backend.
- [Contributing guide](../CONTRIBUTING.md): setup, Git conventions, and preparing a pull request.

## Meal planning — EPIC-02

The protected `/planning` page shows Monday through Sunday with breakfast, lunch and dinner slots. Use the week navigation to move backward, forward or return to the current week. Choose an owned recipe in an empty slot or remove an existing meal. The recipe selector supports title search and pagination.

| Endpoint | Input | Result |
| --- | --- | --- |
| `GET /api/meal-plans` | Required `startDate` and `endDate` query fields, inclusive `YYYY-MM-DD` dates | `200 { "data": [...] }`, ordered by date and meal moment. |
| `POST /api/meal-plans` | `{ "recipeId": "<uuid>", "date": "2026-11-19", "moment": "lunch" }` | `201 { "data": { "id": "...", "date": "...", "moment": "lunch", "servings": 4, "recipe": { "id": "...", "title": "..." } } }` |
| `DELETE /api/meal-plans/:id` | Planned meal UUID | `204` with an empty body. |

All routes require the bearer access token. The API derives ownership from verified authentication. The date range may span up to 31 calendar days and must be ordered. Supported dates run from `0100-01-01` through `9998-12-31`. Moments are `breakfast`, `lunch` and `dinner`. Calendar dates are returned without timezone conversion.

Creation takes servings from the owned recipe and stores them with the planned meal. A slot already used by the same account returns `409 SLOT_OCCUPIED`, including concurrent writes. An unavailable or foreign recipe returns `404 RECIPE_NOT_FOUND`. Deleting a missing or foreign meal returns `404 MEAL_NOT_FOUND`. Unknown input fields, invalid UUIDs, invalid dates and invalid moments return `400 VALIDATION_ERROR`. The existing schema already contains the required ownership and slot constraints.

### Checking the planning flow

1. Start the project with the root `npm run dev`. Load demo data with `npm run db:demo` on a local database if recipes are needed. Sign in with the demo credentials documented above.
2. Open **Mon planning**, add a recipe to a free slot and reload. Check that the recipe remains on the same day and mealtime.
3. Navigate to the previous and next weeks, then return using **Cette semaine**. Remove the planned meal and reload to check its removal.
4. Repeat with a second local account to verify that the first account's recipes and planned meals stay private. Check empty weeks, recipe search, keyboard navigation and a narrow mobile viewport.
5. Run `npm run typecheck`, `npm run build` and `npm test` in `back/`, and `npm run build` in `front/`. The optional planning PostgreSQL HTTP test uses `TEST_DATABASE_URL` pointing to a migrated database whose name ends in `_test`. It checks concurrent writes through the connection pool and deletes its temporary accounts and their data afterward.

## Shopping lists — EPIC-03

A shopping list covers a period of at most 31 days, usually one week. It is generated from the meals planned in that period.

| Endpoint | Input | Result |
| --- | --- | --- |
| `GET /api/shopping-lists` | Required `startDate` and `endDate` query fields, inclusive `YYYY-MM-DD` dates | `200 { "data": { ...list } }` for the list last generated for exactly this period, or `200 { "data": null }`. |
| `POST /api/shopping-lists/generate` | `{ "startDate": "2026-11-16", "endDate": "2026-11-22" }` | `201 { "data": { ...list } }`. The list is empty when no meal is planned. |
| `PATCH /api/shopping-lists/:listId/items/:itemId` | `{ "isPurchased": true }` | `200 { "data": { ...item } }`. An item that is missing or belongs to another account's list returns `404 ITEM_NOT_FOUND`. |

A list has this shape:

```json
{
  "id": "…", "startDate": "2026-11-16", "endDate": "2026-11-22", "generatedAt": "2026-11-19T09:12:00.000Z",
  "items": [
    { "id": "…", "ingredientId": "…", "label": "Pois chiche, appertisé, égoutté", "category": "légumineuses",
      "quantity": 600, "unit": "g", "isPurchased": false, "isManual": false }
  ]
}
```

All routes require the bearer access token and only read or write the authenticated account's data.

Generation rules (`shopping-lists.aggregation.ts`):

- Each ingredient line is scaled to the planned servings: `quantity × planned servings ÷ recipe servings`.
- Lines of the same ingredient are added when their units are compatible: `g` and `kg` together, and `ml`, `cl` and `l` together. The result uses a readable unit, for example 1.3 kg or 75 cl.
- `piece`, `bunch`, `tbsp`, `tsp` and `pinch` are only added to the same unit, so an ingredient can appear on two lines. Pieces and bunches are rounded up to whole units.
- Items are sorted by Ciqual subgroup (`category`), so products of the same aisle stay together, then by name.
- Generating a period again replaces its previous list in a single transaction. An item stays purchased when its quantity has not increased, and items added by hand (`isManual`) are kept.
