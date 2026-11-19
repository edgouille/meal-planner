import { z } from 'zod'

const date = z.iso.date().refine(value => value >= '0100-01-01' && value <= '9998-12-31')
export const mealPlanQuery = z.strictObject({ startDate: date, endDate: date }).refine(
  ({ startDate, endDate }) => endDate >= startDate && Date.parse(endDate) - Date.parse(startDate) <= 30 * 86400000,
  { path: ['endDate'], message: 'Use an ordered date range of at most 31 days.' },
)
export const mealPlanSchema = z.object({
  id: z.uuid(), date, moment: z.enum(['breakfast', 'lunch', 'dinner']),
  servings: z.number().int().positive(),
  recipe: z.object({ id: z.uuid(), title: z.string() }),
})
export const mealListResponseSchema = z.object({ data: z.array(mealPlanSchema) })
export type MealPlan = z.output<typeof mealPlanSchema>
export type MealPlanQuery = z.output<typeof mealPlanQuery>
