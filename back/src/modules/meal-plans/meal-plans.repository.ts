import type { Pool } from 'pg'
import type { MealPlan, MealPlanQuery } from './meal-plans.schemas.ts'

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
  }
}
export type MealPlanRepository = ReturnType<typeof createMealPlanRepository>
