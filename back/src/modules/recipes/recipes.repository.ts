import type { Pool } from 'pg'
import type { RecipeDetails, RecipeListQuery, RecipeSummary } from './recipes.schemas.ts'

interface RecipeRow {
  id: string
  title: string
  description: string | null
  prep_minutes: number | null
  servings: number
}

export function createRecipeRepository(pool: Pick<Pool, 'query'>) {
  return {
    async findForUser(id: string, userId: string): Promise<RecipeDetails | null> {
      const result = await pool.query<RecipeRow>(
        'SELECT id, title, description, prep_minutes, servings FROM recipes WHERE id = $1 AND user_id = $2',
        [id, userId],
      )
      const row = result.rows[0]
      if (!row) return null
      const [ingredients, steps] = await Promise.all([
        pool.query<{ ingredient_id: string; name: string; quantity: string; unit: RecipeDetails['ingredients'][number]['unit'] }>(
          `SELECT ri.ingredient_id, i.name, ri.quantity, ri.unit
           FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
           WHERE ri.recipe_id = $1 ORDER BY i.name, ri.unit`, [id],
        ),
        pool.query<{ position: number; instruction: string }>(
          'SELECT position, instruction FROM recipe_steps WHERE recipe_id = $1 ORDER BY position', [id],
        ),
      ])
      return {
        id: row.id, title: row.title, description: row.description, prepMinutes: row.prep_minutes, servings: row.servings,
        ingredients: ingredients.rows.map(item => ({ ingredientId: item.ingredient_id, name: item.name, quantity: Number(item.quantity), unit: item.unit })),
        steps: steps.rows,
      }
    },
    async listForUser(userId: string, { q, page, pageSize }: RecipeListQuery) {
      const values = [userId, q]
      // strpos treats %, _ and backslashes as literal characters; input is never SQL or a pattern.
      const where = 'WHERE user_id = $1 AND strpos(lower(title), lower($2)) > 0'
      const [recipes, count] = await Promise.all([
        pool.query<RecipeRow>(
          `SELECT id, title, description, prep_minutes, servings FROM recipes
           ${where}
           ORDER BY lower(title), title, id LIMIT $3 OFFSET $4`,
          [...values, pageSize, (page - 1) * pageSize],
        ),
        pool.query<{ total: number }>(`SELECT count(*)::integer AS total FROM recipes ${where}`, values),
      ])
      const data: RecipeSummary[] = recipes.rows.map(row => ({
        id: row.id, title: row.title, description: row.description,
        prepMinutes: row.prep_minutes, servings: row.servings,
      }))
      return { data, total: count.rows[0].total }
    },
  }
}

export type RecipeRepository = ReturnType<typeof createRecipeRepository>
