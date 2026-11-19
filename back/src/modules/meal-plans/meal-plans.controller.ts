import type { RequestHandler, Response } from 'express'
import { validatedRequest } from '../../shared/http/validate-request.ts'
import { mealPlansContract } from './meal-plans.contract.ts'
import { mealListResponseSchema, mealResponseSchema } from './meal-plans.schemas.ts'
import type { MealPlanService } from './meal-plans.service.ts'

function authenticatedUser(res: Response): string {
  const userId: unknown = res.locals.auth?.userId
  if (typeof userId !== 'string') throw new Error('Authentication middleware is missing.')
  return userId
}
export function createMealPlanController(service: MealPlanService) {
  const list: RequestHandler = async (_req, res) => {
    const { query } = validatedRequest(mealPlansContract.list.request, res)
    const data = await service.list(authenticatedUser(res), query)
    res.set('Cache-Control', 'no-store').json(mealListResponseSchema.parse({ data }))
  }
  const create: RequestHandler = async (_req, res) => {
    const { body } = validatedRequest(mealPlansContract.create.request, res)
    const data = await service.create(authenticatedUser(res), body)
    res.set('Cache-Control', 'no-store').status(201).json(mealResponseSchema.parse({ data }))
  }
  const remove: RequestHandler = async (_req, res) => {
    const { params } = validatedRequest(mealPlansContract.remove.request, res)
    await service.remove(authenticatedUser(res), params.id)
    res.set('Cache-Control', 'no-store').status(204).end()
  }
  return { list, create, remove }
}
