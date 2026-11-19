import { apiRequest } from '../../../shared/api/client.ts'
import type { MealMoment, PlannedMeal } from '../meal-plans.types.ts'

export function listMeals(startDate: string, endDate: string, signal: AbortSignal) {
  const query = new URLSearchParams({ startDate, endDate })
  return apiRequest<{ data: PlannedMeal[] }>(`/api/meal-plans?${query}`, { authenticated: true, signal })
}
export function planMeal(date: string, moment: MealMoment, recipeId: string) {
  return apiRequest<{ data: PlannedMeal }>('/api/meal-plans', {
    method: 'POST', body: { date, moment, recipeId }, authenticated: true,
  })
}
export function removeMeal(id: string) {
  return apiRequest<void>(`/api/meal-plans/${id}`, { method: 'DELETE', authenticated: true })
}
