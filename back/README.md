# Backend — MealPlanner

The MealPlanner backend provides an Express 5 and TypeScript API runtime alongside PostgreSQL migrations, the Ciqual import, demo data, and the shared database pool. Business API endpoints and authentication are still to be implemented.

## Planned API responsibilities

- Handle user registration and authentication.
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

`SIGINT` and `SIGTERM` stop accepting requests, let active requests finish, and close the shared PostgreSQL pool. A shutdown that exceeds the deadline terminates the process with an error.

Feature modules export an `ApiModule` with a `basePath` and an Express router. Pass modules to `createApp({ modules })` to register them without accessing another feature's internals. Shared validation and error handling are the next foundation step.

## Database

The schema is defined in SQL in [migrations/](migrations/):

- `users`: accounts with case-insensitive unique email addresses and hashed passwords.
- `ingredients`: a shared catalog imported from Ciqual, with unique names and optional weight per piece.
- `nutrients`, `ingredient_nutrients`: each ingredient's 74 Ciqual nutritional values, including energy, macronutrients, minerals, and vitamins, per 100 g or 100 ml.
- `recipes`, `recipe_ingredients`, `recipe_steps`: user recipes with quantities, units, and ordered preparation steps.
- `planned_meals`: one recipe per user, day, and mealtime (`breakfast`, `lunch`, or `dinner`).
- `shopping_lists`, `shopping_list_items`: shopping lists for a date range, with items that can be checked off.

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

The demo password's scrypt hashing format is temporary and must be aligned with the format chosen for authentication.

## Related documentation

- [Architecture](../ARCHI.md): module boundaries, shared HTTP behavior, and API contracts.

- [Project README](../README.md): product overview, requirements reference, and scope.
- [Development guidelines](../GUIDELINES.md): conventions shared by the frontend and backend.
- [Contributing guide](../CONTRIBUTING.md): setup, Git conventions, and preparing a pull request.
