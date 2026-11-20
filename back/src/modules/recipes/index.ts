import type { RequestHandler } from 'express'
import type { ApiModule } from '../../shared/http/api-module.ts'
import { recipesBasePath } from './recipes.contract.ts'
import type { RecipeRepository } from './recipes.repository.ts'
import { createRecipesRouter } from './recipes.routes.ts'
import { createRecipesService } from './recipes.service.ts'

export { createRecipeRepository } from './recipes.repository.ts'
export type { RecipeRepository } from './recipes.repository.ts'
export { recipesBasePath, recipesContract } from './recipes.contract.ts'
export { recipeListQuery, recipeSummarySchema, recipeListResponseSchema, recipeParamsSchema, recipeDetailsSchema, recipeDetailsResponseSchema } from './recipes.schemas.ts'
export type { RecipeSummary, RecipeListQuery, RecipeListResponse, RecipeDetails } from './recipes.schemas.ts'

/** Authentication must verify the token and populate res.locals.auth.userId. */
export function createRecipesModule(recipes: RecipeRepository, authenticate: RequestHandler): ApiModule {
  return { basePath: recipesBasePath, router: createRecipesRouter(createRecipesService(recipes), authenticate) }
}
