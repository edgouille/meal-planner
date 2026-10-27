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
- **Planned backend:** Node.js with TypeScript and Express.

Technical goals include:

- Separating frontend and backend responsibilities.
- Designing and consuming a REST API.
- Managing and persisting data in a relational database.
- Using Git and GitHub for version control.
- Organizing development in Jira with epics, user stories, and technical tasks.
- Setting up a development workflow and automation.

## Project scope

Development will be incremental, starting with an **MVP (Minimum Viable Product)** covering the application's core features. Additional features may follow as needs evolve.

MealPlanner aims to combine an intuitive user experience with a clear, maintainable fullstack architecture. The repository contains a starter frontend, an Express and TypeScript API runtime, and the PostgreSQL data layer, including migrations, the Ciqual import, and demo data. Business endpoints and user-facing features are still to be implemented.

## Setup

Read [CONTRIBUTING.md](CONTRIBUTING.md) for prerequisites, setup instructions, Git conventions, checks, and GitHub rules to configure. Development guidelines are in [GUIDELINES.md](GUIDELINES.md).

Read [ARCHI.md](ARCHI.md) before starting a feature. It defines the frontend and backend module structure, API contracts, and rules for coordinating shared changes.

For details about each part of the project, see:

- [Frontend](front/README.md): installing and running the React application.
- [Backend](back/README.md): database setup, tooling, and planned API responsibilities.
