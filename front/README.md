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

The interface contains the public home page (`src/features/home/`) and the sign-in (`/connexion`) and registration (`/inscription`) pages (`src/features/auth/`), styled with the "Potager pétillant" design tokens in `src/styles.css`. Never commit secrets or personal data.

## Connecting to the API

The sign-in and registration pages call `POST /api/auth/login` and `POST /api/auth/register`. Start the backend first (see [back/README.md](../back/README.md#authentication-api)). The frontend calls `http://127.0.0.1:3000` by default; to use another API origin, copy `.env.example` to `.env.local` and set `VITE_API_URL`. The backend only accepts requests from its `FRONTEND_ORIGIN`, `http://localhost:5173` by default.

After signing in, the session (access token, expiry, and user) is kept in `localStorage` and shared between tabs. The token lasts one hour and cannot be refreshed: the session is cleared when it expires and the user signs in again. Signing out only clears the local session.

Features call protected routes with `apiRequest(path, { authenticated: true })`. The shared client adds the bearer token. When no valid token is available or the API answers `401`, it clears the session. `src/app/App.tsx` connects the client to the auth session with `configureAuthentication`, so `shared/` never imports a feature. Protected pages are listed in `protectedPaths` in `App.tsx`. Opening one while signed out redirects to `/connexion`.

## Account settings

The `/parametres` page (`src/features/users/`) is protected and linked as **Paramètres** in the signed-in header. It loads `GET /api/users/me`, shows the email read-only, and saves the **Nom affiché** with `PATCH /api/users/me`. The client applies the same rule as the API (1–100 characters after trimming) for immediate feedback. A failed load can be retried, and a failed save keeps the typed name. After a successful save, the name in the stored session is updated so the header greeting stays current.

Navigation between pages uses a small History API helper (`src/shared/lib/navigation.ts`) until the team selects a routing library. Links such as `<a href="/connexion">` navigate without reloading the page.

## Related documentation

- [Architecture](../ARCHI.md): frontend feature folders, shared code, and API integration boundaries.

- [Project README](../README.md): product overview, requirements reference, and scope.
- [Development guidelines](../GUIDELINES.md): conventions shared by the frontend and backend.
- [Contributing guide](../CONTRIBUTING.md): setup, Git conventions, and preparing a pull request.
