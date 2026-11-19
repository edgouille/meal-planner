import { apiRequest } from '../../../shared/api/client.ts'
import type { PlannedMeal } from '../meal-plans.types.ts'

export function listMeals(startDate: string, endDate: string, signal: AbortSignal) {
  const query = new URLSearchParams({ startDate, endDate })
  return apiRequest<{ data: PlannedMeal[] }>(`/api/meal-plans?${query}`, { authenticated: true, signal })
}
