import { errorResponseSchema } from '../../shared/http/errors.ts'
import { recipeListQuery, recipeListResponseSchema, recipeParamsSchema, recipeDetailsResponseSchema } from './recipes.schemas.ts'

export const recipesBasePath = '/api/recipes'
export const recipesContract = {
  get: {
    method: 'get', path: '/:id', operationId: 'getRecipe', tags: ['Recipes'],
    security: [{ bearerAuth: [] }],
    description: 'Get a recipe owned by the signed-in user, including its ingredients and ordered steps.',
    request: { params: recipeParamsSchema },
    responses: {
      200: { description: 'Recipe details.', schema: recipeDetailsResponseSchema },
      400: { description: 'Invalid recipe ID (VALIDATION_ERROR).', schema: errorResponseSchema },
      401: { description: 'Missing, invalid, or expired access token (UNAUTHENTICATED).', schema: errorResponseSchema },
      404: { description: 'Recipe not found (RECIPE_NOT_FOUND).', schema: errorResponseSchema },
      500: { description: 'Unexpected failure (INTERNAL_ERROR).', schema: errorResponseSchema },
    },
  },
  list: {
    method: 'get', path: '/', operationId: 'listRecipes', tags: ['Recipes'],
    security: [{ bearerAuth: [] }],
    description: 'List only the signed-in user\'s recipes, ordered by title then ID. The optional q filter is a case-insensitive literal title substring (150 characters maximum). Pagination defaults to page 1 and 20 items, with at most 100 items per page and page 1000000. Unknown query fields are rejected.',
    request: { query: recipeListQuery },
    responses: {
      200: {
        description: 'Matching owned recipes, or an empty list. Total counts all matching recipes before pagination.',
        schema: recipeListResponseSchema,
        example: { data: [], pagination: { page: 1, pageSize: 20, total: 0 } },
      },
      400: { description: 'Invalid query (VALIDATION_ERROR).', schema: errorResponseSchema },
      401: { description: 'Missing, invalid, or expired access token (UNAUTHENTICATED).', schema: errorResponseSchema },
      500: { description: 'Unexpected failure (INTERNAL_ERROR); database details are not exposed.', schema: errorResponseSchema },
    },
  },
} as const
