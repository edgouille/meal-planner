import type { Pool, PoolClient } from 'pg'
import type { GeneratedItem, MeasureUnit, PlannedIngredient, PreviousItem } from './shopping-lists.aggregation.ts'
import type { Period, ShoppingList, ShoppingListItem } from './shopping-lists.schemas.ts'

interface ListRow {
  id: string
  start_date: string
  end_date: string
  generated_at: Date
}

interface ItemRow {
  id: string
  ingredient_id: string | null
  label: string
  category: string | null
  quantity: string | null
  unit: MeasureUnit | null
  is_purchased: boolean
  is_manual: boolean
}

// pg returns numeric columns as strings.
function toItem(row: ItemRow): ShoppingListItem {
  return {
    id: row.id, ingredientId: row.ingredient_id, label: row.label, category: row.category,
    quantity: row.quantity === null ? null : Number(row.quantity), unit: row.unit,
    isPurchased: row.is_purchased, isManual: row.is_manual,
  }
}

const listColumns = `id, to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(end_date, 'YYYY-MM-DD') AS end_date, generated_at`

// Items sorted by aisle (Ciqual subgroup), then name; manual items come last.
const itemsQuery = `
  SELECT i.id, i.ingredient_id, i.label, g.category, i.quantity, i.unit, i.is_purchased, i.is_manual
  FROM shopping_list_items i LEFT JOIN ingredients g ON g.id = i.ingredient_id
  WHERE i.shopping_list_id = $1
  ORDER BY i.is_manual, g.category NULLS LAST, i.label, i.unit, i.id`

async function readList(db: Pick<Pool, 'query'>, row: ListRow): Promise<ShoppingList> {
  const { rows } = await db.query<ItemRow>(itemsQuery, [row.id])
  return {
    id: row.id, startDate: row.start_date, endDate: row.end_date,
    generatedAt: row.generated_at.toISOString(), items: rows.map(toItem),
  }
}

export function createShoppingListRepository(pool: Pick<Pool, 'query' | 'connect'>) {
  return {
    // Read model across meal-plans and recipes (ARCHI.md): the ingredients of the owner's planned
    // meals in the period. The recipe join repeats the ownership rule enforced by planned_meals.
    async listPlannedIngredients(userId: string, { startDate, endDate }: Period): Promise<PlannedIngredient[]> {
      const { rows } = await pool.query<{
        ingredient_id: string; name: string; quantity: string; unit: MeasureUnit; recipe_servings: number; planned_servings: number
      }>(
        `SELECT ri.ingredient_id, i.name, ri.quantity, ri.unit, r.servings AS recipe_servings, p.servings AS planned_servings
         FROM planned_meals p
         JOIN recipes r ON r.id = p.recipe_id AND r.user_id = p.user_id
         JOIN recipe_ingredients ri ON ri.recipe_id = r.id
         JOIN ingredients i ON i.id = ri.ingredient_id
         WHERE p.user_id = $1 AND p.meal_date BETWEEN $2::date AND $3::date`,
        [userId, startDate, endDate],
      )
      return rows.map(row => ({
        ingredientId: row.ingredient_id, name: row.name, quantity: Number(row.quantity), unit: row.unit,
        recipeServings: row.recipe_servings, plannedServings: row.planned_servings,
      }))
    },

    async findForPeriod(userId: string, { startDate, endDate }: Period) {
      const { rows } = await pool.query<ListRow>(
        `SELECT ${listColumns} FROM shopping_lists
         WHERE user_id = $1 AND start_date = $2::date AND end_date = $3::date
         ORDER BY generated_at DESC, id LIMIT 1`,
        [userId, startDate, endDate],
      )
      return rows[0] ? readList(pool, rows[0]) : null
    },

    /** Replaces the period's list in one transaction. `build` receives the items being replaced. */
    async replaceForPeriod(userId: string, { startDate, endDate }: Period, build: (previous: PreviousItem[]) => GeneratedItem[]) {
      const client: PoolClient = await pool.connect()
      try {
        await client.query('BEGIN')
        // Serializes concurrent generations of the same period for this user.
        await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1 || ':' || $2 || ':' || $3, 0))`, [userId, startDate, endDate])
        const { rows: previous } = await client.query<ItemRow>(
          `SELECT i.id, i.ingredient_id, i.label, NULL AS category, i.quantity, i.unit, i.is_purchased, i.is_manual
           FROM shopping_list_items i JOIN shopping_lists l ON l.id = i.shopping_list_id
           WHERE l.user_id = $1 AND l.start_date = $2::date AND l.end_date = $3::date`,
          [userId, startDate, endDate],
        )
        const items = build(previous.map(toItem))
        await client.query('DELETE FROM shopping_lists WHERE user_id = $1 AND start_date = $2::date AND end_date = $3::date', [userId, startDate, endDate])
        const { rows: [list] } = await client.query<ListRow>(
          `INSERT INTO shopping_lists (user_id, start_date, end_date) VALUES ($1, $2::date, $3::date) RETURNING ${listColumns}`,
          [userId, startDate, endDate],
        )
        await client.query(
          `INSERT INTO shopping_list_items (shopping_list_id, ingredient_id, label, quantity, unit, is_purchased, is_manual)
           SELECT $1::uuid, * FROM unnest($2::uuid[], $3::text[], $4::numeric[], $5::measure_unit[], $6::boolean[], $7::boolean[])`,
          [list.id, items.map(item => item.ingredientId), items.map(item => item.label), items.map(item => item.quantity),
            items.map(item => item.unit), items.map(item => item.isPurchased), items.map(item => item.isManual)],
        )
        const created = await readList(client, list)
        await client.query('COMMIT')
        return created
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        throw error
      } finally {
        client.release()
      }
    },
  }
}
export type ShoppingListRepository = ReturnType<typeof createShoppingListRepository>
