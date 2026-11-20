import type { RequestHandler } from 'express'
import { validatedRequest } from '../../shared/http/validate-request.ts'
import { recipesContract } from './recipes.contract.ts'
import { recipeDetailsResponseSchema, recipeListResponseSchema } from './recipes.schemas.ts'
import type { RecipesService } from './recipes.service.ts'

export function createRecipesController(service: RecipesService) {
  const list: RequestHandler = async (_req, res) => {
    const userId: unknown = res.locals.auth?.userId
    if (typeof userId !== 'string') throw new Error('Authentication middleware is missing.')
    const { query } = validatedRequest(recipesContract.list.request, res)
    const result = await service.list(userId, query)
    res.set('Cache-Control', 'no-store').json(recipeListResponseSchema.parse(result))
  }
  const get: RequestHandler = async (_req, res) => {
    const userId: unknown = res.locals.auth?.userId
    if (typeof userId !== 'string') throw new Error('Authentication middleware is missing.')
    const { params } = validatedRequest(recipesContract.get.request, res)
    const result = await service.get(userId, params.id)
    res.set('Cache-Control', 'no-store').json(recipeDetailsResponseSchema.parse(result))
  }
  return { list, get }
}
