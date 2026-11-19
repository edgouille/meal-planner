-- SCRUM-32: store whether a shopping list item has been purchased.
-- The column already existed as is_checked; it is renamed to match the API field isPurchased.

ALTER TABLE shopping_list_items RENAME COLUMN is_checked TO is_purchased;

COMMENT ON COLUMN shopping_list_items.is_purchased IS 'Vrai quand l''article est acheté, faux sinon.';

-- Finds the list of a period quickly; a period has at most one list per user once generated.
CREATE INDEX shopping_lists_user_period_idx ON shopping_lists (user_id, start_date, end_date);
