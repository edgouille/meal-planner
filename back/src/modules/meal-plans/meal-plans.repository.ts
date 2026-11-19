import type { Pool } from 'pg'
import type { CreateMeal, MealPlan, MealPlanQuery } from './meal-plans.schemas.ts'

interface MealRow {
  id: string
  date: string
  moment: MealPlan['moment']
  servings: number
  recipe_id: string
  title: string
}

function toMeal(row: MealRow): MealPlan {
  return { id: row.id, date: row.date, moment: row.moment, servings: row.servings,
    recipe: { id: row.recipe_id, title: row.title } }
}

export function createMealPlanRepository(pool: Pick<Pool, 'query'>) {
  return {
    async listForUser(userId: string, { startDate, endDate }: MealPlanQuery) {
      const { rows } = await pool.query<MealRow>(
        `SELECT p.id, to_char(p.meal_date, 'YYYY-MM-DD') AS date, p.moment, p.servings, p.recipe_id, r.title
         FROM planned_meals p JOIN recipes r ON r.id = p.recipe_id AND r.user_id = p.user_id
         WHERE p.user_id = $1 AND p.meal_date BETWEEN $2::date AND $3::date
         ORDER BY p.meal_date, p.moment, p.id`, [userId, startDate, endDate],
      )
      return rows.map(toMeal)
    },

    async createForUser(userId: string, { recipeId, date, moment }: CreateMeal) {
      // The ownership check and write share one statement. PostgreSQL arbitrates concurrent slots.
      const { rows } = await pool.query<MealRow>(
        `WITH inserted AS (
           INSERT INTO planned_meals (user_id, recipe_id, meal_date, moment, servings)
           SELECT user_id, id, $3::date, $4::meal_moment, servings
           FROM recipes WHERE id = $2 AND user_id = $1
           RETURNING id, meal_date, moment, servings, recipe_id
         )
         SELECT i.id, to_char(i.meal_date, 'YYYY-MM-DD') AS date, i.moment, i.servings, i.recipe_id, r.title
         FROM inserted i JOIN recipes r ON r.id = i.recipe_id`,
        [userId, recipeId, date, moment],
      )
      return rows[0] ? toMeal(rows[0]) : null
    },

    async deleteForUser(userId: string, id: string) {
      const result = await pool.query('DELETE FROM planned_meals WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])
      return result.rows.length > 0
    },
  }
}
export type MealPlanRepository = ReturnType<typeof createMealPlanRepository>
