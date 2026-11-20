import { ApiError } from '../../shared/http/errors.ts'
import type { RecipeRepository } from './recipes.repository.ts'
import type { RecipeListQuery, RecipeListResponse } from './recipes.schemas.ts'

export function createRecipesService(recipes: RecipeRepository) {
  return {
    async get(userId: string, id: string) {
      const recipe = await recipes.findForUser(id, userId)
      if (!recipe) throw new ApiError(404, 'RECIPE_NOT_FOUND', 'Recipe not found.')
      return { data: recipe }
    },
    async list(userId: string, query: RecipeListQuery): Promise<RecipeListResponse> {
      const { data, total } = await recipes.listForUser(userId, query)
      return { data, pagination: { page: query.page, pageSize: query.pageSize, total } }
    },
  }
}

export type RecipesService = ReturnType<typeof createRecipesService>
