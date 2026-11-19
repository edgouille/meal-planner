import type { RecipeRepository } from './recipes.repository.ts'
import type { RecipeListQuery, RecipeListResponse } from './recipes.schemas.ts'

export function createRecipesService(recipes: RecipeRepository) {
  return {
    async list(userId: string, query: RecipeListQuery): Promise<RecipeListResponse> {
      const { data, total } = await recipes.listForUser(userId, query)
      return { data, pagination: { page: query.page, pageSize: query.pageSize, total } }
    },
  }
}

export type RecipesService = ReturnType<typeof createRecipesService>
