-- Import du catalogue Ciqual (Anses) : code de référence et colonnes élargies.

ALTER TABLE ingredients
  -- Les noms Ciqual vont jusqu'à 191 caractères.
  ALTER COLUMN name TYPE varchar(255),
  ALTER COLUMN category TYPE varchar(100),
  -- Code de l'aliment dans la table Ciqual. Nul pour un ingrédient ajouté à la main.
  ADD COLUMN ciqual_code integer UNIQUE;
