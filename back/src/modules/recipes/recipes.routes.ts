import { Router, type RequestHandler } from 'express'
import { validateRequest } from '../../shared/http/validate-request.ts'
import { recipesContract } from './recipes.contract.ts'
import { createRecipesController } from './recipes.controller.ts'
import type { RecipesService } from './recipes.service.ts'

export function createRecipesRouter(service: RecipesService, authenticate: RequestHandler) {
  const router = Router()
  const { list } = recipesContract
  router[list.method](list.path, authenticate, validateRequest(list.request), createRecipesController(service).list)
  const { get } = recipesContract
  router[get.method](get.path, authenticate, validateRequest(get.request), createRecipesController(service).get)
  return router
}
