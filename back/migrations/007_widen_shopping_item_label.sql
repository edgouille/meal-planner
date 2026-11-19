-- SCRUM-30: generated items copy the ingredient name into label. Ciqual names reach 191
-- characters, so label gets the same limit as ingredients.name.

ALTER TABLE shopping_list_items ALTER COLUMN label TYPE varchar(255);
