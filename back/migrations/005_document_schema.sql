-- Documentation du schéma dans la base : descriptions affichées par pgweb (onglet Structure)
-- et vue schema_relations qui liste les liens entre les tables.

COMMENT ON TABLE users IS 'Comptes utilisateurs. Supprimer un compte supprime toutes ses données.';
COMMENT ON COLUMN users.id IS 'Identifiant du compte.';
COMMENT ON COLUMN users.email IS 'Adresse de connexion, unique sans tenir compte de la casse.';
COMMENT ON COLUMN users.password_hash IS 'Mot de passe haché. Le mot de passe en clair n''est jamais stocké.';
COMMENT ON COLUMN users.display_name IS 'Nom affiché dans l''application.';
COMMENT ON COLUMN users.created_at IS 'Date de création du compte.';

COMMENT ON TABLE ingredients IS 'Catalogue commun d''ingrédients, importé de la table Ciqual 2025 (Anses).';
COMMENT ON COLUMN ingredients.id IS 'Identifiant de l''ingrédient.';
COMMENT ON COLUMN ingredients.name IS 'Nom, unique sans tenir compte de la casse.';
COMMENT ON COLUMN ingredients.category IS 'Sous-groupe Ciqual (légumes, fromages…), utilisé pour trier la liste de courses.';
COMMENT ON COLUMN ingredients.unit_weight_g IS 'Poids d''une pièce ou d''une botte en grammes, nécessaire aux unités piece et bunch.';
COMMENT ON COLUMN ingredients.ciqual_code IS 'Code de l''aliment dans Ciqual. Vide pour un ingrédient ajouté à la main.';

COMMENT ON TABLE nutrients IS 'Les 74 nutriments de la table Ciqual (328 = énergie en kcal).';
COMMENT ON COLUMN nutrients.code IS 'Code du constituant dans Ciqual.';
COMMENT ON COLUMN nutrients.name IS 'Nom du nutriment.';
COMMENT ON COLUMN nutrients.unit IS 'Unité de la valeur pour 100 g : g, mg, µg, kcal ou kJ.';

COMMENT ON TABLE ingredient_nutrients IS 'Valeurs nutritionnelles pour 100 g ou 100 ml. Pas de ligne quand la valeur est inconnue.';
COMMENT ON COLUMN ingredient_nutrients.ingredient_id IS '→ ingredients.id. Supprimé avec l''ingrédient.';
COMMENT ON COLUMN ingredient_nutrients.nutrient_code IS '→ nutrients.code.';
COMMENT ON COLUMN ingredient_nutrients.amount IS 'Quantité pour 100 g ou 100 ml, dans l''unité du nutriment.';
COMMENT ON COLUMN ingredient_nutrients.qualifier IS 'exact : valeur mesurée ; less_than : inférieure à amount ; traces : quantité infime (amount = 0).';

COMMENT ON TABLE recipes IS 'Recettes d''un utilisateur.';
COMMENT ON COLUMN recipes.id IS 'Identifiant de la recette.';
COMMENT ON COLUMN recipes.user_id IS '→ users.id. Propriétaire de la recette, supprimée avec le compte.';
COMMENT ON COLUMN recipes.title IS 'Titre de la recette.';
COMMENT ON COLUMN recipes.description IS 'Présentation courte, facultative.';
COMMENT ON COLUMN recipes.prep_minutes IS 'Temps de préparation total en minutes.';
COMMENT ON COLUMN recipes.servings IS 'Nombre de portions pour les quantités indiquées.';
COMMENT ON COLUMN recipes.created_at IS 'Date de création.';
COMMENT ON COLUMN recipes.updated_at IS 'Date de dernière modification, mise à jour automatiquement.';

COMMENT ON TABLE recipe_ingredients IS 'Ingrédients d''une recette avec leur quantité.';
COMMENT ON COLUMN recipe_ingredients.id IS 'Identifiant de la ligne.';
COMMENT ON COLUMN recipe_ingredients.recipe_id IS '→ recipes.id. Supprimé avec la recette.';
COMMENT ON COLUMN recipe_ingredients.ingredient_id IS '→ ingredients.id. Un ingrédient utilisé dans une recette ne peut pas être supprimé.';
COMMENT ON COLUMN recipe_ingredients.quantity IS 'Quantité, strictement positive.';
COMMENT ON COLUMN recipe_ingredients.unit IS 'Unité : g, kg, ml, cl, l, piece, tbsp (c. à soupe), tsp (c. à café), bunch (botte), pinch (pincée).';

COMMENT ON TABLE recipe_steps IS 'Étapes de préparation d''une recette, dans l''ordre.';
COMMENT ON COLUMN recipe_steps.id IS 'Identifiant de l''étape.';
COMMENT ON COLUMN recipe_steps.recipe_id IS '→ recipes.id. Supprimée avec la recette.';
COMMENT ON COLUMN recipe_steps.position IS 'Numéro de l''étape à partir de 1, unique dans la recette.';
COMMENT ON COLUMN recipe_steps.instruction IS 'Texte de l''étape.';

COMMENT ON TABLE planned_meals IS 'Planning : une recette par utilisateur, jour et moment de la journée.';
COMMENT ON COLUMN planned_meals.id IS 'Identifiant du repas planifié.';
COMMENT ON COLUMN planned_meals.user_id IS '→ users.id. Supprimé avec le compte.';
COMMENT ON COLUMN planned_meals.recipe_id IS '→ recipes.id, recette du même utilisateur. Une recette planifiée ne peut pas être supprimée.';
COMMENT ON COLUMN planned_meals.meal_date IS 'Jour du repas.';
COMMENT ON COLUMN planned_meals.moment IS 'Moment de la journée : breakfast, lunch ou dinner.';
COMMENT ON COLUMN planned_meals.servings IS 'Nombre de portions prévues, utilisé pour ajuster les quantités des courses.';

COMMENT ON TABLE shopping_lists IS 'Listes de courses générées à partir du planning d''une période.';
COMMENT ON COLUMN shopping_lists.id IS 'Identifiant de la liste.';
COMMENT ON COLUMN shopping_lists.user_id IS '→ users.id. Supprimée avec le compte.';
COMMENT ON COLUMN shopping_lists.start_date IS 'Premier jour de la période couverte.';
COMMENT ON COLUMN shopping_lists.end_date IS 'Dernier jour de la période couverte, après ou égal à start_date.';
COMMENT ON COLUMN shopping_lists.generated_at IS 'Date de génération.';

COMMENT ON TABLE shopping_list_items IS 'Articles d''une liste de courses, copiés à la génération.';
COMMENT ON COLUMN shopping_list_items.id IS 'Identifiant de l''article.';
COMMENT ON COLUMN shopping_list_items.shopping_list_id IS '→ shopping_lists.id. Supprimé avec la liste.';
COMMENT ON COLUMN shopping_list_items.ingredient_id IS '→ ingredients.id, vide pour un article ajouté à la main. Mis à vide si l''ingrédient est supprimé.';
COMMENT ON COLUMN shopping_list_items.label IS 'Nom affiché, conservé même si l''ingrédient disparaît du catalogue.';
COMMENT ON COLUMN shopping_list_items.quantity IS 'Quantité totale à acheter, facultative pour un article ajouté à la main.';
COMMENT ON COLUMN shopping_list_items.unit IS 'Unité de la quantité.';
COMMENT ON COLUMN shopping_list_items.is_checked IS 'Vrai quand l''article est acheté.';
COMMENT ON COLUMN shopping_list_items.is_manual IS 'Vrai pour un article ajouté à la main, hors recette.';

COMMENT ON VIEW ingredient_nutrient_details IS 'Valeurs nutritionnelles avec les noms de l''ingrédient et du nutriment.';
COMMENT ON VIEW recipe_nutrients IS 'Apports de chaque recette pour chaque nutriment, au total et par portion.';
COMMENT ON VIEW recipe_calories IS 'Calories de chaque recette, au total et par portion.';

-- Liens entre les tables, lus dans le catalogue PostgreSQL : toujours à jour.
CREATE VIEW schema_relations AS
SELECT
  source.relname AS from_table,
  (SELECT string_agg(a.attname, ', ' ORDER BY k.ord)
     FROM unnest(c.conkey) WITH ORDINALITY AS k (attnum, ord)
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS from_columns,
  target.relname AS to_table,
  (SELECT string_agg(a.attname, ', ' ORDER BY k.ord)
     FROM unnest(c.confkey) WITH ORDINALITY AS k (attnum, ord)
     JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum) AS to_columns,
  CASE c.confdeltype
    WHEN 'c' THEN 'supprimé avec la ligne liée'
    WHEN 'n' THEN 'mis à vide'
    WHEN 'r' THEN 'suppression bloquée'
    WHEN 'a' THEN 'suppression bloquée'
    WHEN 'd' THEN 'valeur par défaut'
  END AS on_delete
FROM pg_constraint c
JOIN pg_class source ON source.oid = c.conrelid
JOIN pg_class target ON target.oid = c.confrelid
JOIN pg_namespace ns ON ns.oid = source.relnamespace
WHERE c.contype = 'f' AND ns.nspname = 'public';

COMMENT ON VIEW schema_relations IS 'Liens entre les tables : clé étrangère, table liée et effet d''une suppression.';
