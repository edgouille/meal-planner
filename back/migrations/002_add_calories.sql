-- Calories : valeur saisie par ingrédient, total calculé par recette.

ALTER TABLE ingredients
  -- kcal pour 100 g (ou 100 ml pour un liquide). Nul tant que la valeur n'est pas connue.
  ADD COLUMN kcal_per_100 numeric(6,1) CHECK (kcal_per_100 >= 0),
  -- Poids d'une pièce ou d'une botte, pour convertir les unités piece et bunch.
  ADD COLUMN unit_weight_g numeric(7,1) CHECK (unit_weight_g > 0);

-- Convertit une quantité en grammes. Les volumes comptent 1 ml = 1 g, une approximation
-- suffisante pour estimer des calories. Renvoie NULL quand la conversion est impossible.
CREATE FUNCTION quantity_in_grams(quantity numeric, unit measure_unit, unit_weight_g numeric)
RETURNS numeric AS $$
  SELECT CASE unit
    WHEN 'g'     THEN quantity
    WHEN 'kg'    THEN quantity * 1000
    WHEN 'ml'    THEN quantity
    WHEN 'cl'    THEN quantity * 10
    WHEN 'l'     THEN quantity * 1000
    WHEN 'tbsp'  THEN quantity * 15
    WHEN 'tsp'   THEN quantity * 5
    WHEN 'pinch' THEN quantity * 0.5
    WHEN 'piece' THEN quantity * unit_weight_g
    WHEN 'bunch' THEN quantity * unit_weight_g
  END
$$ LANGUAGE sql IMMUTABLE;

-- Calories par recette. is_complete est faux si un ingrédient n'a pas de valeur
-- calorique ou ne peut pas être converti : le total est alors sous-estimé.
CREATE VIEW recipe_calories AS
SELECT
  r.id AS recipe_id,
  round(coalesce(sum(lines.kcal), 0)) AS total_kcal,
  round(coalesce(sum(lines.kcal), 0) / r.servings) AS kcal_per_serving,
  bool_and(lines.kcal IS NOT NULL) IS NOT FALSE AS is_complete
FROM recipes r
LEFT JOIN LATERAL (
  SELECT quantity_in_grams(ri.quantity, ri.unit, i.unit_weight_g) * i.kcal_per_100 / 100 AS kcal
  FROM recipe_ingredients ri
  JOIN ingredients i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = r.id
) lines ON true
GROUP BY r.id, r.servings;
