# Internship assignment — User settings

## Goal and scope

A signed-in MealPlanner user can open their account settings, read their email address, and change their display name. The new name is stored in PostgreSQL and still appears after reloading the page.

The first version covers the profile fields already present in the `users` table. Confirm any additional scope with your mentor, including preferences, email changes, password changes, and account deletion.

## Day-one setup and dependencies

1. Get repository access, the Jira ticket if available, and any design reference from your mentor. Start from the latest `dev` and create `feat/user-settings`. Read [CONTRIBUTING.md](CONTRIBUTING.md), [ARCHI.md](ARCHI.md), and [GUIDELINES.md](GUIDELINES.md).
2. Use Node.js 22 and a running Docker engine with Compose. Follow the [backend setup](back/README.md) to configure `.env`, start PostgreSQL, and apply migrations. Start the API from `back/` and Vite from `front/` in separate terminals with `npm run dev`. Check the Vite URL and confirm that `GET /health` and `GET /ready` return 200 on `http://127.0.0.1:3000`.
3. Agree with your mentor on the settings route and API contract below. Identify who owns JWT authentication (SCRUM-39), the protected frontend route and shared HTTP client, and OpenAPI/type generation (SCRUM-54). Ask how to sign in locally as two different test users. The public home page and health endpoints are already present on the starting revision.
4. Begin with the contract, backend tests using a test authentication context, and UI states using agreed example responses. Connect the real sign-in flow, routing, and API client once the shared dependencies are available. Coordinate changes to shared entry points with their owners.

## Mission 1 — Implement the profile API

Use the existing health module as a reference for module registration and shared HTTP conventions. Add the feature under `back/src/modules/users/`. Reuse the existing [user model and row mapping](back/src/modules/users/users.model.ts) in the repository. Select the columns declared by `UserRow` and shape the HTTP response separately.

| Request | Expected result |
| --- | --- |
| `GET /api/users/me` | `200` with the signed-in user's profile in the standard `data` envelope. |
| `PATCH /api/users/me` with `{ "displayName": "Camille Martin" }` | `200` with the updated profile in the same envelope. |
| Either endpoint without valid authentication | `401` using the shared error format. |
| `PATCH` with an invalid body | `400` using the shared validation error format. Leave the stored profile unchanged. |
| Valid authentication for a profile that no longer exists, if the request reaches the users module | `404` using the shared error format. |

Example successful response for either route:

```json
{
  "data": {
    "email": "camille@example.test",
    "displayName": "Camille Martin"
  }
}
```

- **Routes and schemas.** Attach the shared authentication middleware to both routes. Use Zod for the response shape and the PATCH body. Require a string `displayName`, trim leading and trailing whitespace, and validate a length of 1–100 characters after trimming. Reject missing values, whitespace-only names, non-string values, and unknown fields such as `email` or `userId`.
- **Controller and persistence.** Read the user ID from the verified authentication context. Scope the SELECT and UPDATE to that ID using parameterized SQL and the shared PostgreSQL pool. Return the row written by the update, map `display_name` to `displayName`, and expose only `email` and `displayName`. The existing schema supports this change.
- **Registration and contract.** Register the module in the API. Reuse the feature's schemas and route metadata in its OpenAPI contract. Document success and error responses, and regenerate the API document and frontend types when the shared tooling is available.
- **Tests.** Add HTTP integration tests for reading and updating the current profile, trimming whitespace, rejecting the invalid bodies above, and handling missing or invalid authentication on both endpoints. Verify that an update by account A leaves account B unchanged. Include a database-backed check with two local test users to verify the write and subsequent read.

## Mission 2 — Build and connect the settings page

Add the feature under `front/src/features/users/` and use the app's shared routing and authenticated HTTP client.

1. **Navigation.** Register the proposed `/parametres` route as protected. Add a **Paramètres** link to the signed-in navigation. Opening the URL directly while signed out should follow the shared sign-in flow.
2. **Load the profile.** Call `GET /api/users/me` when entering the page. Show a loading state until it returns. Populate the **Adresse e-mail** field in read-only mode and the editable **Nom affiché** field. On a load error, show a message and an action to retry.
3. **Validate and save.** Provide an **Enregistrer** button. Use the same trim and length rules as the API for immediate feedback. Send only `displayName`. Disable duplicate submissions while saving. On success, replace the form values with the returned profile and show a confirmation. On a recoverable error, keep the typed name and let the user retry. Handle `401` through the shared session-expiry behavior.
4. **Accessibility and layout.** Use the existing design tokens and CSS Modules. Write labels and feedback in French. Associate field errors with their inputs, make feedback available to assistive technology, and verify keyboard navigation and the mobile layout.

## Acceptance checks

| Scenario | Expected behavior |
| --- | --- |
| Account A opens **Paramètres** | The page shows A's email and current display name. The email field is read-only. |
| A submits `  Camille Martin  ` and reloads the page | The saved name is `Camille Martin`; the email is unchanged. |
| A submits an empty, whitespace-only, or overlong name | The UI explains the problem. A direct API request returns 400, and the saved name stays unchanged. |
| Account B signs in after A saves | B sees B's own email and name. A request containing a different `userId` is rejected. |
| A signed-out visitor opens the page or calls either endpoint | The page follows the sign-in flow. The API returns 401. |
| Profile loading or saving fails | Loading can be retried. A failed save keeps the typed name and shows feedback. |
| A keyboard user opens the page at mobile width | The fields and save action are reachable. Labels and feedback remain usable. |

## Delivery

- Run `npm run build` in `front/`. Run `npm run typecheck`, `npm run build`, and `npm test` in `back/`.
- Prepare a pull request targeting `dev` with the Jira reference if available, the agreed API contract, desktop and mobile screenshots, test results, and steps for replaying the scenarios with two local accounts.
