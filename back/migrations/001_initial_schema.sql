-- Schéma initial de MealPlanner : comptes, recettes, planning et listes de courses.

CREATE TYPE meal_moment AS ENUM ('breakfast', 'lunch', 'dinner');

CREATE TYPE measure_unit AS ENUM ('g', 'kg', 'ml', 'cl', 'l', 'piece', 'tbsp', 'tsp', 'bunch', 'pinch');

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comptes ------------------------------------------------------------------

CREATE TABLE users (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  display_name  varchar(100) NOT NULL CHECK (length(trim(display_name)) > 0),
  created_at    timestamptz  NOT NULL DEFAULT now()
);

-- Unicité insensible à la casse : Alice@mail.fr et alice@mail.fr sont le même compte.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

-- Catalogue commun d'ingrédients -------------------------------------------

CREATE TABLE ingredients (
  id       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name     varchar(100) NOT NULL CHECK (length(trim(name)) > 0),
  category varchar(50)
);

CREATE UNIQUE INDEX ingredients_name_key ON ingredients (lower(name));

-- Recettes -----------------------------------------------------------------

CREATE TABLE recipes (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title        varchar(150) NOT NULL CHECK (length(trim(title)) > 0),
  description  text,
  prep_minutes integer      CHECK (prep_minutes >= 0),
  servings     integer      NOT NULL DEFAULT 1 CHECK (servings > 0),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  -- Cible de la clé étrangère composite de planned_meals.
  UNIQUE (id, user_id)
);

CREATE INDEX recipes_user_id_idx ON recipes (user_id);

CREATE TRIGGER recipes_set_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE recipe_ingredients (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id     uuid          NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  ingredient_id uuid          NOT NULL REFERENCES ingredients (id) ON DELETE RESTRICT,
  quantity      numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit          measure_unit  NOT NULL,
  UNIQUE (recipe_id, ingredient_id, unit)
);

CREATE INDEX recipe_ingredients_ingredient_id_idx ON recipe_ingredients (ingredient_id);

CREATE TABLE recipe_steps (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   uuid    NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  position    integer NOT NULL CHECK (position > 0),
  instruction text    NOT NULL CHECK (length(trim(instruction)) > 0),
  UNIQUE (recipe_id, position)
);

-- Planning -----------------------------------------------------------------

CREATE TABLE planned_meals (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  recipe_id uuid        NOT NULL,
  meal_date date        NOT NULL,
  moment    meal_moment NOT NULL,
  servings  integer     NOT NULL CHECK (servings > 0),
  UNIQUE (user_id, meal_date, moment),
  -- La recette planifiée doit appartenir au même utilisateur.
  -- NO ACTION (par défaut) plutôt que RESTRICT : supprimer une recette planifiée est refusé,
  -- mais supprimer un compte efface ses recettes et son planning dans la même instruction.
  FOREIGN KEY (recipe_id, user_id) REFERENCES recipes (id, user_id)
);

CREATE INDEX planned_meals_recipe_id_idx ON planned_meals (recipe_id);

-- Listes de courses --------------------------------------------------------

CREATE TABLE shopping_lists (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  start_date   date        NOT NULL,
  end_date     date        NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX shopping_lists_user_id_idx ON shopping_lists (user_id);

CREATE TABLE shopping_list_items (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id uuid          NOT NULL REFERENCES shopping_lists (id) ON DELETE CASCADE,
  -- Nul pour un article ajouté à la main ou un ingrédient retiré du catalogue ; label garde le nom.
  ingredient_id    uuid          REFERENCES ingredients (id) ON DELETE SET NULL,
  label            varchar(100)  NOT NULL CHECK (length(trim(label)) > 0),
  quantity         numeric(10,2) CHECK (quantity > 0),
  unit             measure_unit,
  is_checked       boolean       NOT NULL DEFAULT false,
  is_manual        boolean       NOT NULL DEFAULT false
);

CREATE INDEX shopping_list_items_list_id_idx ON shopping_list_items (shopping_list_id);
