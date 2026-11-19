import { errorResponseSchema } from '../../shared/http/errors.ts'
import { mealListResponseSchema, mealPlanQuery } from './meal-plans.schemas.ts'

export const mealPlansBasePath = '/api/meal-plans'
const errors = {
  400: { description: 'Invalid input.', schema: errorResponseSchema },
  401: { description: 'Authentication required.', schema: errorResponseSchema },
  500: { description: 'Unexpected failure.', schema: errorResponseSchema },
}
export const mealPlansContract = {
  list: {
    method: 'get', path: '/', operationId: 'listPlannedMeals', tags: ['Meal plans'], security: [{ bearerAuth: [] }],
    description: 'List owned meals in an inclusive date range of at most 31 days. Dates are calendar dates.',
    request: { query: mealPlanQuery },
    responses: { ...errors, 200: { description: 'Owned meals ordered by date and mealtime.', schema: mealListResponseSchema } },
  },
} as const
