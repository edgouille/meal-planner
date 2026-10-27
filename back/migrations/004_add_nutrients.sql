-- Valeurs nutritionnelles complètes : un nutriment par ligne au lieu d'une colonne par valeur.
-- Les calories deviennent le nutriment 328 et la colonne kcal_per_100 disparaît.

-- exact : valeur mesurée ; less_than : inférieure à la valeur indiquée ; traces : quantité infime.
CREATE TYPE nutrient_qualifier AS ENUM ('exact', 'less_than', 'traces');

-- Constituants de la table Ciqual. Le code est celui de Ciqual (328 = énergie en kcal).
CREATE TABLE nutrients (
  code integer      PRIMARY KEY,
  name varchar(150) NOT NULL,
  unit varchar(10)  NOT NULL
);

-- Valeur pour 100 g (ou 100 ml) d'un ingrédient. Pas de ligne quand la valeur est inconnue.
CREATE TABLE ingredient_nutrients (
  ingredient_id uuid               NOT NULL REFERENCES ingredients (id) ON DELETE CASCADE,
  nutrient_code integer            NOT NULL REFERENCES nutrients (code),
  amount        numeric            NOT NULL CHECK (amount >= 0),
  qualifier     nutrient_qualifier NOT NULL DEFAULT 'exact',
  PRIMARY KEY (ingredient_id, nutrient_code)
);

CREATE INDEX ingredient_nutrients_nutrient_code_idx ON ingredient_nutrients (nutrient_code);

-- Reprise des calories déjà saisies.
INSERT INTO nutrients (code, name, unit) VALUES (328, 'Energie, Règlement UE N° 1169/2011', 'kcal');

INSERT INTO ingredient_nutrients (ingredient_id, nutrient_code, amount)
SELECT id, 328, kcal_per_100 FROM ingredients WHERE kcal_per_100 IS NOT NULL;

DROP VIEW recipe_calories;

ALTER TABLE ingredients DROP COLUMN kcal_per_100;

-- Lecture plus simple dans pgweb : noms de l'ingrédient et du nutriment au lieu des identifiants.
CREATE VIEW ingredient_nutrient_details AS
SELECT
  i.id AS ingredient_id,
  i.name AS ingredient_name,
  n.code AS nutrient_code,
  n.name AS nutrient_name,
  inn.amount,
  n.unit,
  inn.qualifier
FROM ingredient_nutrients inn
JOIN ingredients i ON i.id = inn.ingredient_id
JOIN nutrients n ON n.code = inn.nutrient_code;

-- Apports de chaque recette pour chaque nutriment. Les traces et les valeurs « inférieures à »
-- comptent pour 0. is_complete est faux si un ingrédient n'a pas de valeur pour ce nutriment
-- ou ne peut pas être converti en grammes : le total est alors sous-estimé.
CREATE VIEW recipe_nutrients AS
SELECT
  r.id AS recipe_id,
  n.code AS nutrient_code,
  n.name AS nutrient_name,
  n.unit,
  round(coalesce(sum(lines.amount), 0), 2) AS total,
  round(coalesce(sum(lines.amount), 0) / r.servings, 2) AS per_serving,
  bool_and(lines.amount IS NOT NULL) IS NOT FALSE AS is_complete
FROM recipes r
CROSS JOIN nutrients n
LEFT JOIN LATERAL (
  SELECT
    quantity_in_grams(ri.quantity, ri.unit, i.unit_weight_g)
      * CASE
          WHEN inn.qualifier = 'exact' THEN inn.amount
          WHEN inn.qualifier IS NOT NULL THEN 0
        END
      / 100 AS amount
  FROM recipe_ingredients ri
  JOIN ingredients i ON i.id = ri.ingredient_id
  LEFT JOIN ingredient_nutrients inn ON inn.ingredient_id = i.id AND inn.nutrient_code = n.code
  WHERE ri.recipe_id = r.id
) lines ON true
GROUP BY r.id, r.servings, n.code, n.name, n.unit;

-- Même résultat qu'avant la migration, calculé à partir du nutriment 328.
CREATE VIEW recipe_calories AS
SELECT
  recipe_id,
  round(total) AS total_kcal,
  round(per_serving) AS kcal_per_serving,
  is_complete
FROM recipe_nutrients
WHERE nutrient_code = 328;
