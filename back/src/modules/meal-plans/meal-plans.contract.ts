import { errorResponseSchema } from '../../shared/http/errors.ts'
import { createMealBody, mealListResponseSchema, mealParams, mealPlanQuery, mealResponseSchema } from './meal-plans.schemas.ts'

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
  create: {
    method: 'post', path: '/', operationId: 'planMeal', tags: ['Meal plans'], security: [{ bearerAuth: [] }],
    description: 'Assign an owned recipe to an empty slot. Servings come from the recipe.',
    request: { body: createMealBody },
    responses: { ...errors, 201: { description: 'Meal planned.', schema: mealResponseSchema },
      404: { description: 'Owned recipe not found.', schema: errorResponseSchema },
      409: { description: 'Slot occupied.', schema: errorResponseSchema } },
  },
  remove: {
    method: 'delete', path: '/:id', operationId: 'removePlannedMeal', tags: ['Meal plans'], security: [{ bearerAuth: [] }],
    description: 'Remove one owned planned meal.',
    request: { params: mealParams },
    responses: { ...errors, 204: { description: 'Meal removed.' },
      404: { description: 'Owned planned meal not found.', schema: errorResponseSchema } },
  },
} as const
