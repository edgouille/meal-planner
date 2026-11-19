# MealPlanner 🍽️

## Project overview

**MealPlanner** is a meal planning web application designed to simplify everyday meal organization. It aims to let users keep their recipes in one place, plan meals for the week, and automatically generate shopping lists from the ingredients they need.

The goal is to provide a simple, intuitive way to organize meals, save preparation time, and make grocery shopping easier.

## Planned features

- **Recipe management:** create, view, and manage recipes with ingredients, quantities, and preparation steps.
- **Meal planning:** organize meals in a weekly schedule by assigning recipes to specific days and mealtimes.
- **Shopping lists:** generate a list from planned meals and check off products while shopping.
- **User accounts:** sign up and log in to access personal recipes, meal plans, and shopping lists.

## Personas and requirements

The [Figma board: personas and needs overview](https://www.figma.com/board/WucPuPSbzpIg3WhUiQpsuD/Personas-%E2%80%94-Alex--Margeritte-et-Lois?node-id=3-2) is the reference for the project's personas and user needs.

## Technical goals

The project also provides an opportunity to practice software development principles using:

- **Frontend:** React with TypeScript.
- **Backend:** Node.js with TypeScript and Express.

Technical goals include:

- Separating frontend and backend responsibilities.
- Designing and consuming a REST API.
- Managing and persisting data in a relational database.
- Using Git and GitHub for version control.
- Organizing development in Jira with epics, user stories, and technical tasks.
- Setting up a development workflow and automation.

## Project scope

Development will be incremental, starting with an **MVP (Minimum Viable Product)** covering the application's core features. Additional features may follow as needs evolve.

MealPlanner aims to combine an intuitive user experience with a clear, maintainable fullstack architecture. The repository provides the public frontend, authentication, profile settings, recipe browsing, and a PostgreSQL data layer with migrations, the Ciqual import, and demo data. Additional business features are still to be implemented.

## Setup

With Node.js 22 selected and Docker Desktop running, open a terminal at the repository root and run:

```bash
npm run dev
```

The launcher creates missing local environment files, generates a JWT key only when missing, installs locked backend/frontend dependencies when their configuration changes, starts PostgreSQL and pgweb, applies pending migrations, and starts both development servers. Existing configuration and application data are preserved. Open [http://localhost:5173](http://localhost:5173). Press Ctrl+C to stop both servers; the database stays running.

Use `npm run setup` to prepare the environment without starting the applications. `npm run db:down` stops the database services while retaining their data. To explicitly load the catalog and recreate the demo account, run `npm run db:demo`; sign in with `demo@mealplanner.local` / `mealplanner-demo`. This demo command replaces that account's existing data, so it is never run automatically.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for prerequisites, setup instructions, Git conventions, checks, and GitHub rules to configure. Development guidelines are in [GUIDELINES.md](GUIDELINES.md).

Read [ARCHI.md](ARCHI.md) before starting a feature. It defines the frontend and backend module structure, API contracts, and rules for coordinating shared changes.

For details about each part of the project, see:

- [Frontend](front/README.md): installing and running the React application.
- [Backend](back/README.md): database setup, tooling, and planned API responsibilities.
