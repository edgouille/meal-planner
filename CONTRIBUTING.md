# Contribuer à MealPlanner

## Installer le projet

Prérequis : Git, Node.js 22 et npm. Le fichier `.nvmrc` indique la version Node utilisée par la CI. Si vous utilisez nvm, lancez `nvm install` puis `nvm use` ; sous Windows avec nvm-windows, utilisez `nvm install 22` puis `nvm use 22`.

Depuis la racine du dépôt :

```bash
cd front
npm ci
npm run dev
```

Ouvrez l'adresse affichée par Vite. `npm ci` utilise les versions du fichier `package-lock.json`. Pour ajouter ou mettre à jour une dépendance, utilisez `npm install` et incluez les modifications de `package.json` et de `package-lock.json` dans la contribution.

Le backend contient actuellement sa documentation uniquement : aucune API, base de données, commande de lancement ou migration n'est encore disponible. Consultez [back/README.md](back/README.md) avant de le développer. Aucun fichier `.env` n'est nécessaire pour le frontend actuel.

## Branches et commits

Le workflow cible utilise `dev` pour l'intégration et `main` pour les versions validées. Créez d'abord `dev` depuis `main` sur GitHub si elle n'existe pas. Travaillez ensuite sur une branche dédiée depuis `dev` :

```bash
git switch dev
git pull --ff-only
git switch -c feat/recipe-form
```

Utilisez `feat/`, `fix/`, `docs/`, `chore/` ou `refactor/` avec un nom court en minuscules séparé par des tirets. Les branches créées par Codex utilisent le préfixe `codex/`.

Les messages de commit suivent la forme `type(scope): description`, par exemple `feat(front): ajouter le formulaire de recette` ou `docs: préciser l'installation`. Le scope est facultatif. Ajoutez la référence Jira dans la description du commit ou de la PR lorsqu'un ticket existe.

Gardez chaque contribution centrée sur un objectif. Suivez [GUIDELINES.md](GUIDELINES.md) pour l'architecture, les données et la qualité du code. Respectez le style du fichier existant et les réglages de `.editorconfig`.

## Vérifier une contribution

Dans `front/`, lancez :

```bash
npm ci
npm run build
```

Le build vérifie TypeScript puis produit l'application avec Vite. Pour une modification de l'interface, lancez aussi `npm run dev` et vérifiez le comportement dans le navigateur, notamment sur une largeur mobile. Décrivez les étapes et le résultat dans la PR.

Le dépôt ne dispose pas encore de commande de lint ni de tests automatisés. Lorsqu'ils seront ajoutés, documentez leurs commandes ici et ajoutez-les à la CI. Pour une évolution du backend, fournissez ses commandes d'installation et de vérification dans son README.

## Ouvrir une pull request

Poussez votre branche puis ouvrez une PR vers `dev`. Utilisez **Rebase and merge** ou **Squash and merge** pour intégrer la contribution. Pour publier une version validée, ouvrez une PR de `dev` vers `main` et utilisez **Create a merge commit**. Seule la branche `dev` de ce dépôt doit alimenter `main` ; cette restriction devient automatique une fois le contrôle `Main source is dev` publié et rendu obligatoire. Le modèle proposé demande le besoin, la solution et les vérifications. Ajoutez les captures utiles, les impacts sur l'API, les données et la configuration, ainsi que le ticket Jira éventuel.

Avant de fusionner :

- La vérification `Frontend build` doit réussir.
- Les discussions de revue doivent être résolues.
- La documentation et les exemples de configuration doivent être à jour.
- Une revue par une autre personne est attendue lorsque l'équipe compte plusieurs contributeurs.

Supprimez les branches de travail après fusion. Conservez `dev` et `main`. Après une publication, continuez les contributions depuis `dev`. Le commit de merge présent uniquement sur `main` est attendu : ne fusionnez pas `main` dans `dev`, dont l'historique doit rester linéaire.

## Secrets et configuration

Ne commitez aucun mot de passe, jeton, fichier `.env` ou donnée réelle d'utilisateur. Si une configuration devient nécessaire, fournissez un `.env.example` avec des valeurs fictives et documentez chaque variable. Toute variable frontend `VITE_*` est exposée au navigateur : elle ne doit contenir aucun secret.

## Activer les règles sur GitHub

Les fichiers du dépôt préparent la CI et le modèle de PR. Ils n'activent pas à eux seuls la protection de branche. Un administrateur doit configurer les règles du dépôt dans les paramètres GitHub :

1. Dans **Settings → General → Pull Requests**, autoriser **Allow merge commits**, **Allow rebase merging** et **Allow squash merging**.
2. Dans **Settings → Rules → Rulesets**, créer deux **branch rulesets** actifs, ciblant exactement `dev` et `main` respectivement, sans acteur autorisé à contourner les règles.
3. Pour les deux branches : activer **Require a pull request before merging**, **Require conversation resolution before merging**, **Block force pushes** et **Restrict deletions**. Ne pas activer **Restrict updates**, qui bloquerait aussi les intégrations pour les personnes sans droit de contournement.
4. Dans la règle de PR de `dev`, ne garder que **Rebase** et **Squash** parmi les méthodes de fusion autorisées. Activer **Require linear history**. Exiger le contrôle **Frontend build** après publication du workflow.
5. Dans la règle de PR de `main`, ne garder que **Merge** parmi les méthodes autorisées. Laisser **Require linear history** désactivé. Exiger **Frontend build** et **Main source is dev**.
6. Ne pas exiger que la branche source soit à jour avec `main` (**Require branches to be up to date before merging**) : le commit de merge de chaque publication reste sur `main` et ne doit pas obliger à le réintégrer dans `dev`.
7. Pour une équipe, exiger au moins une approbation et invalider les approbations après de nouveaux commits. Pour un projet solo, ne pas imposer une approbation que l'auteur ne peut pas se donner.

Les contrôles doivent avoir été exécutés avant de pouvoir être sélectionnés. Le workflow `main-source.yml` doit être présent sur `main` pour vérifier les PR entrantes. Il utilise `pull_request_target` sans récupérer ni exécuter le code proposé : il vérifie uniquement le nom de la branche source et son dépôt d'origine. Le contrôle doit être obligatoire dans le ruleset de `main` pour bloquer les autres sources.

Ordre de mise en place : publier ces fichiers sur `main` pour l'installation initiale, créer `dev` depuis cette version, déclencher les contrôles avec une PR de travail vers `dev` puis une PR `dev` vers `main`, et sélectionner les contrôles obligatoires dans les rulesets. Si des protections existent déjà, passer par le processus autorisé par ces protections pour publier la configuration.

La disponibilité des protections dépend de l'offre GitHub et de la visibilité du dépôt. Les règles de nommage des branches de travail et de commits restent des conventions d'équipe. La CI vérifie le build frontend et la provenance des PR vers `main`.

Référence : [configurer une protection de branche (documentation GitHub)](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule).

Référence pour les méthodes par branche : [règles disponibles dans les rulesets GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
