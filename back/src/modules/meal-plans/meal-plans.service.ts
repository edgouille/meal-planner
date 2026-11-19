import { ApiError } from '../../shared/http/errors.ts'
import type { MealPlanRepository } from './meal-plans.repository.ts'
import type { CreateMeal, MealPlanQuery } from './meal-plans.schemas.ts'

export function createMealPlanService(meals: MealPlanRepository) {
  return {
    list: (userId: string, query: MealPlanQuery) => meals.listForUser(userId, query),
    async create(userId: string, input: CreateMeal) {
      try {
        const meal = await meals.createForUser(userId, input)
        if (!meal) throw new ApiError(404, 'RECIPE_NOT_FOUND', 'Recipe not found.')
        return meal
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
          throw new ApiError(409, 'SLOT_OCCUPIED', 'A meal is already planned in this slot.')
        }
        throw error
      }
    },
    async remove(userId: string, id: string) {
      if (!await meals.deleteForUser(userId, id)) throw new ApiError(404, 'MEAL_NOT_FOUND', 'Planned meal not found.')
    },
  }
}
export type MealPlanService = ReturnType<typeof createMealPlanService>
