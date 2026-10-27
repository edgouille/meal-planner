# Contributing to MealPlanner

## Setting up the project

Prerequisites: Git, Node.js 22, and npm. The `.nvmrc` file specifies the Node.js version used by CI. With nvm, run `nvm install` followed by `nvm use`. On Windows with nvm-windows, run `nvm install 22` followed by `nvm use 22`.

From the repository root:

```bash
cd front
npm ci
npm run dev
```

Open the URL displayed by Vite. `npm ci` installs the versions recorded in `package-lock.json`. To add or update a dependency, use `npm install` and include changes to both `package.json` and `package-lock.json` in your contribution.

The backend currently contains documentation only: no API, database, startup command, or migration is available yet. Read [back/README.md](back/README.md) before working on it. The current frontend does not require a `.env` file.

## Branches and commits

The workflow uses `dev` for integration and `main` for validated releases. If `dev` does not exist yet, create it from `main` on GitHub. Then create a dedicated working branch from `dev`:

```bash
git switch dev
git pull --ff-only
git switch -c feat/recipe-form
```

Use `feat/`, `fix/`, `docs/`, `chore/`, or `refactor/` with a short English name in lowercase, separating words with hyphens. Branches created by Codex use the `codex/` prefix.

Write commit messages in English using `type(scope): description`, for example `feat(front): add the recipe form` or `docs: clarify setup instructions`. The scope is optional. Include the Jira reference in the commit or PR description when a ticket exists.

Keep each contribution focused on one objective. Follow [GUIDELINES.md](GUIDELINES.md) for architecture, data handling, and code quality. Match the existing file's style and the `.editorconfig` settings. Write all repository documentation in English.

## Checking a contribution

From `front/`, run:

```bash
npm ci
npm run build
```

The build checks TypeScript and then builds the application with Vite. For interface changes, also run `npm run dev` and check the behavior in a browser, including at a mobile viewport width. Describe the steps and results in the PR.

The repository does not yet include a lint command or automated tests. When adding them, document the commands here and include them in CI. For backend changes, provide installation and validation commands in its README.

## Opening a pull request

Push your working branch and open a PR targeting `dev`. Use **Rebase and merge** or **Squash and merge** to integrate the contribution. To release a validated version, open a PR from `dev` to `main` and use **Create a merge commit**. Only this repository's `dev` branch should feed into `main`; this restriction is enforced automatically once the `Main source is dev` check is published and required.

The PR template asks for context, changes, and validation. Include useful screenshots, any impact on the API, data, or configuration, and the Jira ticket when applicable.

Before merging:

- The `Frontend build` check must pass.
- Review conversations must be resolved.
- Documentation and configuration examples must be up to date.
- A review by another contributor is expected when working as a team.

Remote working branches are automatically deleted after their pull request is merged. Keep `dev` and `main` protected against deletion. After a release, continue contributions from `dev`. A merge commit that exists only on `main` is expected: do not merge `main` into `dev`, which must keep a linear history.

## Automatic branch deletion after merging

GitHub's **Automatically delete head branches** setting deletes a remote working branch after its pull request is merged, whether through rebase, squash, or a merge commit. No custom cleanup workflow is required.

Enable it under **Settings → General → Pull Requests → Automatically delete head branches**.

The **Restrict deletions** rules on `main` and `dev` keep these permanent branches from being deleted, including after a `dev` → `main` release PR. Other branch protection rules can also prevent automatic deletion.

This setting does not delete local branches or remove branches solely because they are inactive. After a merge, switch back to `dev` and remove your local working branch when it is no longer needed. A deleted branch can be restored from the merged PR when GitHub offers the **Restore branch** action.

For PRs from a fork, automatic deletion depends on the setting and write permissions in that fork.

Reference: [Managing the automatic deletion of branches (GitHub documentation)](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches).

## Secrets and configuration

Never commit passwords, tokens, `.env` files, or real user data. If configuration becomes necessary, provide a `.env.example` file with dummy values and document each variable. Frontend `VITE_*` variables are exposed to the browser and must never contain secrets.

## Configuring GitHub rules

Repository files provide CI workflows and a PR template. They do not enable branch protection by themselves. A repository administrator must configure the following settings on GitHub:

1. Under **Settings → General → Pull Requests**, enable **Allow merge commits**, **Allow rebase merging**, and **Allow squash merging**.
2. Under **Settings → Rules → Rulesets**, create two active **branch rulesets**, targeting exactly `dev` and `main`, with no actors allowed to bypass the rules.
3. For both branches, enable **Require a pull request before merging**, **Require conversation resolution before merging**, **Block force pushes**, and **Restrict deletions**. Leave **Restrict updates** disabled: it would also block integrations for contributors without bypass permissions.
4. In the PR rule for `dev`, allow only **Rebase** and **Squash**. Enable **Require linear history**. Require the **Frontend build** check once its workflow has been published.
5. In the PR rule for `main`, allow only **Merge**. Leave **Require linear history** disabled. Require **Frontend build** and **Main source is dev** once their workflows have been published.
6. Leave **Require branches to be up to date before merging** disabled on `main`: each release's merge commit stays on `main` and should not have to be integrated back into `dev`.
7. For a team, require at least one approval and dismiss stale approvals after new commits. For a solo project, avoid requiring an approval that the author cannot give themselves.
8. Under **Settings → General → Pull Requests**, enable **Automatically delete head branches** to remove working branches after their PR is merged. Keep deletion restrictions enabled on `main` and `dev`.

Run the checks before selecting them as required checks. The `main-source.yml` workflow must be present on `main` to validate incoming PRs. It uses `pull_request_target` without checking out or executing proposed code: it only checks the source branch name and repository. Make this check mandatory in the `main` ruleset to block other sources.

For an initial setup, publish the workflow files to `main`, create `dev` from that version if needed, run the checks with a working-branch PR into `dev` and a `dev` PR into `main`, then select the required checks in the rulesets. If protections already exist, use their authorized contribution process to publish the configuration before requiring the checks.

Branch protection availability depends on the GitHub plan and repository visibility. Working-branch names and commit messages remain team conventions. CI checks the frontend build and the source of PRs targeting `main`.

References:

- [Managing a branch protection rule (GitHub documentation)](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule).
- [Available rules for rulesets, including merge methods per branch (GitHub documentation)](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
