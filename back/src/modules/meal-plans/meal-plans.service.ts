import type { MealPlanRepository } from './meal-plans.repository.ts'
import type { MealPlanQuery } from './meal-plans.schemas.ts'

export function createMealPlanService(meals: MealPlanRepository) {
  return {
    list: (userId: string, query: MealPlanQuery) => meals.listForUser(userId, query),
  }
}
export type MealPlanService = ReturnType<typeof createMealPlanService>
