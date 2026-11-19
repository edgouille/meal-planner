import type { Pool } from 'pg'
import type { RecipeListQuery, RecipeSummary } from './recipes.schemas.ts'

interface RecipeRow {
  id: string
  title: string
  description: string | null
  prep_minutes: number | null
  servings: number
}

export function createRecipeRepository(pool: Pick<Pool, 'query'>) {
  return {
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
